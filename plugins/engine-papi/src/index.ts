import express from "express";
import { v4 as uuidv4 } from "uuid";
import { config } from "./config";
import { logger } from "./logger";
import papiService from "./papi";
import { rabbitmq } from "./rabbitmq";
import { Envelope, StartSessionPayload, SendTextPayload, SendMediaPayload } from "./contracts";

const app = express();
app.use(express.json());

// Webhook endpoint
app.post("/webhook", async (req, res) => {
  try {
    const { event, instanceId, data } = req.body;
    logger.info({ event, instanceId }, "Webhook received");

    // Forward to backend via RabbitMQ
    // We need tenantId. PAPI doesn't send tenantId. 
    // Usually we can map instanceId (sessionId) to tenantId if we had a database,
    // but here we are stateless.
    // However, the routing key needs tenantId.
    // Maybe we can store tenantId in PAPI instance data? Or use a wildcard in routing key?
    // Or maybe the backend can handle wildcard tenantId?

    // For now, let's assume instanceId IS the sessionId.
    // The routing key: wbot.{tenantId}.{sessionId}.event
    // We don't have tenantId.

    // WORKAROUND: Use a special routing key or expect backend to find tenant.
    // Or maybe we just send to `wbot.any.{sessionId}.event`?

    // Better: We can store tenantId in the instance name or description in PAPI if possible?
    // Or we rely on the fact that PAPI instances are created with ID = sessionId.

    // If we can't get tenantId, we might need to query the database.
    // But this plugin shouldn't access the DB directly (microservice best practice).

    // Let's assume for now we use '0' or 'unknown' and the backend can resolve it?
    // No, RabbitMQ routing relies on it.

    // Solution: When creating instance, we might need to store mapping.
    // But for now, let's just log it.

    // Wait, the backend likely listens to `wbot.*.*.event`.
    // Let's check backend/src/services/WbotServices/wbotMessageListener.ts (or similar).

    // Actually, let's just use '0' as tenantId for now if we don't know it.
    // Or maybe the PAPI payload contains it if we put it there?

    const tenantId = 0; // Placeholder

    if (event === "messages.upsert") {
      // Handle message
    }

    res.sendStatus(200);
  } catch (error) {
    logger.error(error, "Error processing webhook");
    res.sendStatus(500);
  }
});

const handleCommand = async (envelope: Envelope) => {
  const { type, payload, tenantId } = envelope;
  const sessionId = (payload as any).sessionId;

  try {
    switch (type) {
      case "session.start":
        await handleStartSession(payload as StartSessionPayload, tenantId);
        break;
      case "message.send.text":
        await handleSendText(payload as SendTextPayload);
        break;
      // Add other cases
      default:
        logger.warn(`Unknown command type: ${type}`);
    }
  } catch (error: any) {
    logger.error(error, `Error handling command ${type}`);
  }
};

const handleStartSession = async (payload: StartSessionPayload, tenantId: string | number) => {
  const { sessionId, name } = payload;
  const instanceId = sessionId.toString();

  // Check for config override
  const { papiUrl, papiKey, webhookUrl } = payload;

  if (papiUrl && papiKey) {
    papiService.updateConfig(papiUrl, papiKey);
  }

  // Use provided webhookUrl or fallback to config (which might be empty now)
  const actualWebhookUrl = webhookUrl || config.webhookUrl;

  logger.info(`Starting session ${sessionId} for tenant ${tenantId}. PAPI URL: ${papiUrl?.substring(0, 20)}..., Webhook: ${actualWebhookUrl}`);

  // 1. Check if instance exists
  let status = await papiService.getInstanceStatus(instanceId);

  if (!status) {
    logger.info(`Creating instance ${instanceId}`);
    await papiService.createInstance(instanceId, name || `Session ${sessionId}`);
    await papiService.createInstance(instanceId, name || `Session ${sessionId}`);
    // Configure Webhook
    if (actualWebhookUrl) {
      await papiService.setWebhook(instanceId, actualWebhookUrl, true);
    } else {
      logger.warn(`No webhook URL provided for session ${sessionId}. Events will not be received.`);
    }
    status = { status: "CONNECTING" };
  }

  // 2. Publish update
  await publishEvent(tenantId, sessionId, "session.update", {
    status: status.status,
    qrcode: null
  });

  // 3. If connecting, get QR
  if (status.status !== "CONNECTED") {
    const qrData = await papiService.getQrCode(instanceId);
    if (qrData && qrData.qrImage) { // Check docs for exact field
      // Docs say: { "qrImage": "data:image/png;base64,..." }
      // Backend usually expects the raw code string, not the image data URL?
      // Let's check Whatsapp model. `qrcode` is TEXT.
      // And frontend generates QR from it.
      // If PAPI returns image base64, we might need to extract the code if possible,
      // OR send the base64 and frontend displays it as image.
      // The `qrcode-terminal` usage suggests it expects the code string.
      // PAPI docs: "qrImage": "data:image/png;base64,..."
      // Also /public-status returns "qr": "2@abc..."

      // Let's try to get the raw QR code from public-status if possible?
      // PAPI Docs: GET /api/instances/:id/public-status -> returns "qr" (raw string).
      // But public link must be enabled.

      // Alternatively, maybe we send the base64 as is, and update frontend to handle it?
      // Or we just send it.

      await publishEvent(tenantId, sessionId, "session.qrcode", {
        qrcode: qrData.qrImage
      });
    }
  }
};

const handleSendText = async (payload: SendTextPayload) => {
  const { sessionId, to, body } = payload;
  await papiService.sendText(sessionId.toString(), to, body);
};

const handleSendMedia = async (payload: SendMediaPayload) => {
  const { sessionId, to, media, caption } = payload;
  const instanceId = sessionId.toString();
  const { mimetype, data, filename } = media;

  // data in SendMediaPayload is usually base64 (without prefix) or full data URI?
  // Usually base64 string.

  if (mimetype.startsWith("image/")) {
    await papiService.sendImage(instanceId, to, data, caption);
  } else if (mimetype.startsWith("video/")) {
    await papiService.sendVideo(instanceId, to, data, caption);
  } else if (mimetype.startsWith("audio/")) {
    // PTT check is tricky without more info, default to false (audio file)
    await papiService.sendAudio(instanceId, to, data, false);
  } else {
    await papiService.sendDocument(instanceId, to, data, filename, mimetype);
  }
};

const publishEvent = async (tenantId: string | number, sessionId: number, type: string, payload: any) => {
  const envelope: Envelope = {
    id: uuidv4(),
    timestamp: Date.now(),
    tenantId,
    type,
    payload
  };
  await rabbitmq.publishEvent(`wbot.${tenantId}.${sessionId}.event`, envelope);
};

const start = async () => {
  await rabbitmq.connect();
  await rabbitmq.consumeCommands(handleCommand);

  app.listen(config.port, () => {
    logger.info(`Engine PAPI listening on port ${config.port}`);
  });
};

start();
