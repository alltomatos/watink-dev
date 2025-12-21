import { Envelope, StartSessionPayload, SendTextPayload, SendMediaPayload, CommandType } from "./contracts";
import { logger } from "./logger";
import { RabbitMQ } from "./rabbitmq";
import { v4 as uuidv4 } from "uuid";
import makeWASocket, { DisconnectReason, useMultiFileAuthState, AnyMessageContent } from "whaileys";
import { Boom } from "@hapi/boom";
import path from "path";
import fs from "fs";

interface WhaileysSession {
  socket: ReturnType<typeof makeWASocket>;
  status: string;
}

class SessionManager {
  private sessions: Map<number, WhaileysSession> = new Map();
  private rabbitmq: RabbitMQ;
  private sessionsDir: string;

  constructor(rabbitmq: RabbitMQ) {
    this.rabbitmq = rabbitmq;
    this.sessionsDir = path.resolve(__dirname, "..", ".wwebjs_auth");
    if (!fs.existsSync(this.sessionsDir)) {
      fs.mkdirSync(this.sessionsDir, { recursive: true });
    }
  }

  async handleCommand(envelope: Envelope) {
    logger.info(`Received command: ${envelope.type}`);
    
    switch (envelope.type as CommandType) {
      case "session.start":
        await this.startSession(envelope.payload as StartSessionPayload, envelope.tenantId);
        break;
      case "session.stop":
        await this.stopSession(envelope.payload.sessionId);
        break;
      case "message.send.text":
        await this.sendText(envelope.payload as SendTextPayload);
        break;
      default:
        logger.warn(`Unknown command type: ${envelope.type}`);
    }
  }

  private async startSession(payload: StartSessionPayload, tenantId: string | number) {
    logger.info(`Starting session ${payload.sessionId}`);

    if (this.sessions.has(payload.sessionId)) {
        logger.info(`Session ${payload.sessionId} already exists`);
        return;
    }

    const { state, saveCreds } = await useMultiFileAuthState(
      path.join(this.sessionsDir, `session-${payload.sessionId}`)
    );

    const sock = makeWASocket({
      auth: state,
      printQRInTerminal: false, // We will publish QR via RabbitMQ
      logger: logger as any // Compatible logger interface
    });

    this.sessions.set(payload.sessionId, { socket: sock, status: "OPENING" });

    sock.ev.on("creds.update", saveCreds);

    sock.ev.on("connection.update", async (update) => {
      const { connection, lastDisconnect, qr } = update;

      if (qr) {
        logger.info(`QR Code generated for session ${payload.sessionId}`);
        const qrEvent: Envelope = {
            id: uuidv4(),
            timestamp: Date.now(),
            tenantId,
            type: "session.qrcode",
            payload: {
                sessionId: payload.sessionId,
                qrcode: qr,
                attempt: 1 // Logic to track attempts could be added
            }
        };
        await this.rabbitmq.publishEvent(`wbot.${tenantId}.${payload.sessionId}.session.qrcode`, qrEvent);
      }

      if (connection === "close") {
        const shouldReconnect = (lastDisconnect?.error as Boom)?.output?.statusCode !== DisconnectReason.loggedOut;
        logger.warn(`Connection closed for session ${payload.sessionId}, reconnecting: ${shouldReconnect}`);
        
        const statusEvent: Envelope = {
            id: uuidv4(),
            timestamp: Date.now(),
            tenantId,
            type: "session.status",
            payload: {
                sessionId: payload.sessionId,
                status: "DISCONNECTED"
            }
        };
        await this.rabbitmq.publishEvent(`wbot.${tenantId}.${payload.sessionId}.session.status`, statusEvent);

        if (shouldReconnect) {
            this.sessions.delete(payload.sessionId);
            this.startSession(payload, tenantId);
        } else {
            this.sessions.delete(payload.sessionId);
            // Cleanup auth files if logged out?
        }
      } else if (connection === "open") {
        logger.info(`Session ${payload.sessionId} opened`);
        const session = this.sessions.get(payload.sessionId);
        if (session) session.status = "CONNECTED";

        const statusEvent: Envelope = {
            id: uuidv4(),
            timestamp: Date.now(),
            tenantId,
            type: "session.status",
            payload: {
                sessionId: payload.sessionId,
                status: "CONNECTED"
            }
        };
        await this.rabbitmq.publishEvent(`wbot.${tenantId}.${payload.sessionId}.session.status`, statusEvent);
      }
    });

    sock.ev.on("messages.upsert", async ({ messages, type }) => {
        if (type === "notify") {
            for (const msg of messages) {
                if (!msg.message) continue;
                // Simple logging for now, ideally convert to our internal Message format
                // logger.info(`Received message in session ${payload.sessionId}: ${JSON.stringify(msg)}`);

                const msgEvent: Envelope = {
                    id: uuidv4(),
                    timestamp: Date.now(),
                    tenantId,
                    type: "message.received",
                    payload: {
                        sessionId: payload.sessionId,
                        message: {
                            id: msg.key.id || "",
                            from: msg.key.remoteJid || "",
                            to: msg.key.remoteJid || "", // In groups this differs
                            body: msg.message.conversation || msg.message.extendedTextMessage?.text || "",
                            fromMe: msg.key.fromMe || false,
                            isGroup: msg.key.remoteJid?.endsWith("@g.us") || false,
                            type: "chat",
                            timestamp: typeof msg.messageTimestamp === 'number' ? msg.messageTimestamp : 0,
                            hasMedia: false // Needs checking logic
                        }
                    }
                };
                await this.rabbitmq.publishEvent(`wbot.${tenantId}.${payload.sessionId}.message.received`, msgEvent);
            }
        }
    });
  }

  private async stopSession(sessionId: number) {
      const session = this.sessions.get(sessionId);
      if (session) {
          session.socket.end(undefined);
          this.sessions.delete(sessionId);
          logger.info(`Session ${sessionId} stopped`);
      }
  }

  private async sendText(payload: SendTextPayload) {
    const session = this.sessions.get(payload.sessionId);
    if (!session) {
        logger.error(`Session ${payload.sessionId} not found for sending message`);
        return;
    }

    logger.info(`Sending text to ${payload.to}: ${payload.body}`);
    
    await session.socket.sendMessage(payload.to, {
        text: payload.body
    });
  }
}

export { SessionManager };
