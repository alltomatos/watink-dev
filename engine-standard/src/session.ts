import {
  Envelope, StartSessionPayload, SendTextPayload, SendMediaPayload,
  SendButtonsPayload, SendListPayload, SendPollPayload,
  SendTemplatePayload, SendInteractivePayload, SendCarouselPayload,
  CommandType, SyncContactPayload
} from "./contracts";
import { logger } from "./logger";
import { RabbitMQ } from "./rabbitmq";
import { v4 as uuidv4 } from "uuid";
import makeWASocket, {
  DisconnectReason,
  useMultiFileAuthState,
  prepareWAMessageMedia,
  generateWAMessageFromContent,
  downloadMediaMessage,
  fetchLatestBaileysVersion,
  USyncQuery,
  USyncUser
} from "whaileys";
import { Boom } from "@hapi/boom";
import path from "path";
import fs from "fs";

interface WhaileysSession {
  socket: ReturnType<typeof makeWASocket>;
  status: string;
}

class SessionManager {
  private sessions: Map<number, WhaileysSession> = new Map();
  private retries: Map<number, number> = new Map();
  private rabbitmq: RabbitMQ;
  private sessionsDir: string;

  constructor(rabbitmq: RabbitMQ) {
    this.rabbitmq = rabbitmq;
    this.sessionsDir = path.resolve(__dirname, "..", ".sessions_auth");
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
      case "message.send.media":
        await this.sendMedia(envelope.payload as SendMediaPayload, envelope.tenantId);
        break;
      case "message.send.buttons":
        await this.sendButtons(envelope.payload as SendButtonsPayload);
        break;
      case "message.send.list":
        await this.sendList(envelope.payload as SendListPayload);
        break;
      case "message.send.poll":
        await this.sendPoll(envelope.payload as SendPollPayload);
        break;
      case "message.send.template":
        await this.sendTemplate(envelope.payload as SendTemplatePayload);
        break;
      case "message.send.interactive":
        await this.sendInteractive(envelope.payload as SendInteractivePayload);
        break;
      case "message.send.carousel":
        await this.sendCarousel(envelope.payload as SendCarouselPayload);
        break;
      case "contact.sync":
        await this.syncContact(envelope.payload as SyncContactPayload, envelope.tenantId);
        break;
      default:
        logger.warn(`Unknown command type: ${envelope.type}`);
    }
  }

  private async syncContact(payload: SyncContactPayload, tenantId: string | number) {
    const session = this.sessions.get(payload.sessionId);
    if (!session) {
      logger.error(`Session ${payload.sessionId} not found for syncing contact`);
      return;
    }

    try {
      logger.info(`Syncing contact ${payload.number} for session ${payload.sessionId}`);
      
      let jid = payload.lid || (payload.number.includes("@") ? payload.number : `${payload.number}@c.us`);
      let foundLid = payload.lid;

      // 1. Tenta buscar a foto diretamente (Otimista)
      let profilePicUrl = await session.socket.profilePictureUrl(jid, "image").catch(() => null);

      // 2. Se não encontrar, ou se não temos LID, tenta resolver
      if (!profilePicUrl || (!foundLid && !payload.number.includes("@lid"))) {
        // A. Verifica onWhatsApp (para PNs)
        try {
          // Só roda onWhatsApp se não for LID (LIDs não funcionam no onWhatsApp geralmente)
          if (!jid.includes("@lid")) {
             const [result] = await session.socket.onWhatsApp(jid);
             if (result && result.exists) {
                // Se retornou LID (algumas versões retornam), usa
                if (result.lid) foundLid = result.lid;
                
                // Tenta buscar foto com JID confirmado
                if (!profilePicUrl) {
                   profilePicUrl = await session.socket.profilePictureUrl(result.jid, "image").catch(() => "");
                }
             }
          }
        } catch (err) {
          logger.warn(`Error checking onWhatsApp for ${payload.number}:`, err);
        }

        // B. Se ainda não temos LID e é um número de telefone, tenta USync
        if (!foundLid && !jid.includes("@lid")) {
           try {
              logger.info(`Attempting USync to resolve LID for ${payload.number}`);
              const query = new USyncQuery()
                .withMode("query")
                .withUser(new USyncUser().withPhone(payload.number))
                .withLIDProtocol();
              
              const result = await (session.socket as any).executeUSyncQuery(query);
              if (result && result.list && result.list.length > 0) {
                 const record = result.list[0];
                 // Verifica se o protocolo LID retornou algo. 
                 // Dependendo da versão do whaileys/baileys, o resultado pode estar em 'lid' ou dentro do protocolo.
                 // Vamos logar para debug se necessário, mas assumir 'lid' no record ou no objeto protocols.
                 // @ts-ignore
                 if (record.lid) {
                    foundLid = record.lid as string;
                    logger.info(`USync resolved LID for ${payload.number}: ${foundLid}`);
                 }
              }
           } catch (err) {
              logger.warn(`Error executing USync for ${payload.number}:`, err);
           }
        }
      }

      // Se descobrimos um LID e não tínhamos foto, tenta buscar foto pelo LID (muitas vezes é a única forma pública)
      if (foundLid && !profilePicUrl) {
         profilePicUrl = await session.socket.profilePictureUrl(foundLid, "image").catch(() => "");
      }

      const updateEvent: Envelope = {
        id: uuidv4(),
        timestamp: Date.now(),
        tenantId,
        type: "contact.update",
        payload: {
          sessionId: payload.sessionId,
          contactId: payload.contactId,
          number: payload.number,
          profilePicUrl: profilePicUrl || null,
          lid: foundLid || undefined
        }
      };

      await this.rabbitmq.publishEvent(`wbot.${tenantId}.${payload.sessionId}.contact.update`, updateEvent);
    } catch (error) {
      logger.error(`Error syncing contact ${payload.number}:`, error);
    }
  }

  private async stopSession(sessionId: number) {
    logger.info(`Stopping session ${sessionId}`);
    const session = this.sessions.get(sessionId);
    
    // Mesmo se não encontrar a sessão em memória (pode ter caído), forçamos a limpeza do diretório
    try {
      if (session) {
        await session.socket.end(undefined);
        this.sessions.delete(sessionId);
      }
      
      // Cleanup auth files is critical to ensure clean state
      await this.cleanupSession(sessionId);
    } catch (err) {
      logger.error(`Error stopping session ${sessionId}`, err);
    }

    const statusEvent: Envelope = {
      id: uuidv4(),
      timestamp: Date.now(),
      tenantId: 1, // Default, should be passed
      type: "session.status",
      payload: {
        sessionId,
        status: "DISCONNECTED"
      }
    };
    await this.rabbitmq.publishEvent(`wbot.1.${sessionId}.session.status`, statusEvent);
  }



  private async startSession(payload: StartSessionPayload, tenantId: string | number) {
    logger.info(`Starting session ${payload.sessionId}`);

    // Notify backend that session is opening
    const openingEvent: Envelope = {
      id: uuidv4(),
      timestamp: Date.now(),
      tenantId,
      type: "session.status",
      payload: {
        sessionId: payload.sessionId,
        status: "OPENING"
      }
    };
    await this.rabbitmq.publishEvent(`wbot.${tenantId}.${payload.sessionId}.session.status`, openingEvent);

    try {
      if (this.sessions.has(payload.sessionId)) {
        logger.info(`Session ${payload.sessionId} already exists`);
        
        const session = this.sessions.get(payload.sessionId);
        const currentStatus = session?.status === "CONNECTED" ? "CONNECTED" : "OPENING";

        const statusEvent: Envelope = {
          id: uuidv4(),
          timestamp: Date.now(),
          tenantId,
          type: "session.status",
          payload: {
            sessionId: payload.sessionId,
            status: currentStatus as any
          }
        };
        await this.rabbitmq.publishEvent(`wbot.${tenantId}.${payload.sessionId}.session.status`, statusEvent);
        return;
      }

      // Initialize retry counter if not present
      if (!this.retries.has(payload.sessionId)) {
        this.retries.set(payload.sessionId, 0);
      }

      const { state, saveCreds } = await useMultiFileAuthState(
        path.join(this.sessionsDir, `session-${payload.sessionId}`)
      );

      const { version, isLatest } = await fetchLatestBaileysVersion();
      logger.info(`Using WA v${version.join('.')}, isLatest: ${isLatest}`);

      const sock = makeWASocket({
        version,
        auth: state,
        printQRInTerminal: false,
        logger: logger.child({ level: "warn" }) as any,
        browser: [payload.name || "Watic Premium", "Chrome", "143.0.7499.148"],
        syncFullHistory: payload.syncHistory === true,
        connectTimeoutMs: 60000,
        keepAliveIntervalMs: 10000,
        retryRequestDelayMs: 2000
      });

      this.sessions.set(payload.sessionId, { socket: sock, status: "OPENING" });

      sock.ev.on("creds.update", saveCreds);

      // Se usePairingCode e phoneNumber foram fornecidos, solicitar código de pareamento
      if (payload.usePairingCode && payload.phoneNumber) {
        // Aguardar conexão estar pronta para solicitar código
        sock.ev.on("connection.update", async (update: any) => {
          if (update.connection === "open") return;

          // Só solicitar pairing code se ainda não conectou
          if (!sock.authState.creds.registered) {
            try {
              logger.info(`Requesting pairing code for session ${payload.sessionId} - Phone: ${payload.phoneNumber}`);
              const code = await sock.requestPairingCode(payload.phoneNumber!);

              const pairingEvent: Envelope = {
                id: uuidv4(),
                timestamp: Date.now(),
                tenantId,
                type: "session.pairingcode",
                payload: {
                  sessionId: payload.sessionId,
                  pairingCode: code
                }
              };
              await this.rabbitmq.publishEvent(`wbot.${tenantId}.${payload.sessionId}.session.pairingcode`, pairingEvent);
            } catch (error) {
              logger.error(`Error requesting pairing code for session ${payload.sessionId}`, error);
            }
          }
        });
      }

      sock.ev.on("connection.update", async (update: any) => {
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
          const currentRetries = this.retries.get(payload.sessionId) || 0;
          
          logger.warn(`Connection closed for session ${payload.sessionId}, reconnecting: ${shouldReconnect}, attempt: ${currentRetries}`);

          if (shouldReconnect && currentRetries < 5) {
             this.retries.set(payload.sessionId, currentRetries + 1);
             this.sessions.delete(payload.sessionId);
             setTimeout(() => this.startSession(payload, tenantId), 3000 * (currentRetries + 1)); // Exponential backoff
          } else {
             // Max retries reached or logged out
             logger.error(`Session ${payload.sessionId} failed to connect after ${currentRetries} attempts or logged out.`);
             this.retries.delete(payload.sessionId);
             this.sessions.delete(payload.sessionId);
             
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
          }
        } else if (connection === "open") {
          logger.info(`Session ${payload.sessionId} opened`);
          this.retries.delete(payload.sessionId);
          const session = this.sessions.get(payload.sessionId);
          if (session) session.status = "CONNECTED";

          let number = "";
          let profilePicUrl = "";

          try {
             const userJid = sock.user?.id;
             if (userJid) {
                 number = userJid.split(":")[0]; // Handle JID format
                 profilePicUrl = (await sock.profilePictureUrl(userJid, "image").catch(() => "")) || "";
             }
          } catch (error) {
             logger.warn(`Failed to fetch profile info for session ${payload.sessionId}`, error);
          }

          const statusEvent: Envelope = {
            id: uuidv4(),
            timestamp: Date.now(),
            tenantId,
            type: "session.status",
            payload: {
              sessionId: payload.sessionId,
              status: "CONNECTED",
              number,
              profilePicUrl
            }
          };
          await this.rabbitmq.publishEvent(`wbot.${tenantId}.${payload.sessionId}.session.status`, statusEvent);
        }
      });

      sock.ev.on("messages.upsert", async ({ messages, type }: any) => {
        if (type === "notify") {
          for (const msg of messages) {
            if (!msg.message) continue;

            // Check for media types
            const hasMedia = !!(
              msg.message.imageMessage ||
              msg.message.videoMessage ||
              msg.message.audioMessage ||
              msg.message.documentMessage ||
              msg.message.stickerMessage
            );

            let body = msg.message.conversation || msg.message.extendedTextMessage?.text || "";
            let selectedButtonId = undefined;
            let selectedRowId = undefined;
            let pollVotes = undefined;
            let msgType = hasMedia ? "media" : "chat";
            let mediaData = undefined;
            let mimetype = undefined;

            // --- Media Handling ---
            if (hasMedia) {
              try {
                const buffer = await downloadMediaMessage(msg, "buffer", {});
                mediaData = buffer.toString("base64");
                mimetype = msg.message.imageMessage?.mimetype ||
                  msg.message.videoMessage?.mimetype ||
                  msg.message.audioMessage?.mimetype ||
                  msg.message.documentMessage?.mimetype ||
                  msg.message.stickerMessage?.mimetype;
              } catch (err) {
                logger.warn(`Error downloading media for msg ${msg.key.id}: ${err}`);
              }
            }

            // --- Interactive Responses ---

            // 1. Buttons Response
            if (msg.message.buttonsResponseMessage) {
              selectedButtonId = msg.message.buttonsResponseMessage.selectedButtonId;
              body = msg.message.buttonsResponseMessage.selectedDisplayText || "";
              msgType = "button_response";
            }
            // 2. Template Button Response
            else if (msg.message.templateButtonReplyMessage) {
              selectedButtonId = msg.message.templateButtonReplyMessage.selectedId;
              body = msg.message.templateButtonReplyMessage.selectedDisplayText || "";
              msgType = "button_response";
            }
            // 3. List Response
            else if (msg.message.listResponseMessage) {
              selectedRowId = msg.message.listResponseMessage.singleSelectReply?.selectedRowId;
              body = msg.message.listResponseMessage.title || "";
              msgType = "list_response";
            }
            // 3.1 Interactive Response (Native Flow / Carousel)
            else if (msg.message.interactiveResponseMessage) {
              const interactiveResp = msg.message.interactiveResponseMessage;
              if (interactiveResp.nativeFlowResponseMessage) {
                const params = JSON.parse(interactiveResp.nativeFlowResponseMessage.paramsJson || "{}");
                selectedButtonId = params.id;
              }
              body = interactiveResp.body?.text || "";
              msgType = "interactive_response";
            }
            // 4. Poll Response
            else if (msg.message.pollUpdateMessage) {
              msgType = "poll_response";
            }

            // Fetch Profile Pic (Best effort)
            let profilePicUrl = "";
            try {
              // profilePicUrl = await sock.profilePictureUrl(msg.key.participant || msg.key.remoteJid || "", "image").catch(() => "");
            } catch (e) { }

            // Enhanced Contact Identification (LID/JID)
            let senderLid = undefined;
            const senderJid = msg.key.participant || msg.key.remoteJid || "";

            if (senderJid && !senderJid.includes("@lid")) {
              try {
                // If it's a standard JID (PN based), try to fetch the LID which is permanent
                // This answers the requirement: "todo contato tem LID mas podem haver casos de contatos antigos... sistema deve buscar o LID"
                const [result] = await sock.onWhatsApp(senderJid);
                if (result && result.lid) {
                  senderLid = result.lid;
                }
              } catch (err) {
                // Ignore errors during LID fetch to not block message processing
              }
            } else if (senderJid && senderJid.includes("@lid")) {
              senderLid = senderJid;
            }

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
                  to: msg.key.remoteJid || "",
                  body: body,
                  fromMe: msg.key.fromMe || false,
                  isGroup: msg.key.remoteJid?.endsWith("@g.us") || false,
                  type: msgType,
                  timestamp: typeof msg.messageTimestamp === 'number' ? msg.messageTimestamp : 0,
                  hasMedia: hasMedia,
                  mediaData,
                  mimetype,
                  selectedButtonId,
                  selectedRowId,
                  pollVotes,
                  pushName: msg.pushName || "",
                  participant: msg.key.participant || "",
                  profilePicUrl,
                  senderLid
                }
              }
            };
            await this.rabbitmq.publishEvent(`wbot.${tenantId}.${payload.sessionId}.message.received`, msgEvent);
          }
        }
      });

      // Listen for message ACK (read receipts)
      sock.ev.on("messages.update", async (updates: any[]) => {
        for (const update of updates) {
          if (update.update?.status) {
            const ackEvent: Envelope = {
              id: uuidv4(),
              timestamp: Date.now(),
              tenantId,
              type: "message.ack",
              payload: {
                sessionId: payload.sessionId,
                messageId: update.key?.id || "",
                ack: update.update.status // 0=pending, 1=sent, 2=received, 3=read, 4=played
              }
            };
            await this.rabbitmq.publishEvent(`wbot.${tenantId}.${payload.sessionId}.message.ack`, ackEvent);
          }
        }
      });

    } catch (err) {
      logger.error(`Error starting session ${payload.sessionId}`, err);
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
      this.sessions.delete(payload.sessionId);
    }
  }

  private async cleanupSession(sessionId: number) {
    const sessionPath = path.join(this.sessionsDir, `session-${sessionId}`);
    if (fs.existsSync(sessionPath)) {
      try {
        fs.rmSync(sessionPath, { recursive: true, force: true });
        logger.info(`Cleaned up session files for ${sessionId}`);
      } catch (err) {
        logger.error(`Error cleaning up session ${sessionId}:`, err);
      }
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

  private async sendMedia(payload: SendMediaPayload, tenantId: string | number) {
    const session = this.sessions.get(payload.sessionId);
    if (!session) {
      logger.error(`Session ${payload.sessionId} not found for sending media`);
      return;
    }

    logger.info(`Sending media to ${payload.to}: ${payload.media.filename}`);

    // Convert base64 to buffer
    const mediaBuffer = Buffer.from(payload.media.data, 'base64');
    const mimetype = payload.media.mimetype;
    const filename = payload.media.filename;

    let content: any = {};

    // Determine media type based on mimetype
    if (mimetype.startsWith('image/')) {
      content = {
        image: mediaBuffer,
        caption: payload.caption || '',
        mimetype: mimetype
      };
    } else if (mimetype.startsWith('video/')) {
      content = {
        video: mediaBuffer,
        caption: payload.caption || '',
        mimetype: mimetype
      };
    } else if (mimetype.startsWith('audio/')) {
      content = {
        audio: mediaBuffer,
        mimetype: mimetype,
        ptt: mimetype === 'audio/ogg' // Voice note if ogg
      };
    } else {
      // Document (PDF, etc)
      content = {
        document: mediaBuffer,
        caption: payload.caption || '',
        fileName: filename,
        mimetype: mimetype
      };
    }

    await session.socket.sendMessage(payload.to, content);
  }

  private async sendButtons(payload: SendButtonsPayload) {
    const session = this.sessions.get(payload.sessionId);
    if (!session) {
      logger.error(`Session ${payload.sessionId} not found for sending buttons`);
      return;
    }

    const buttons = payload.buttons.map(btn => ({
      buttonId: btn.buttonId,
      buttonText: { displayText: btn.buttonText },
      type: 1
    }));

    const buttonMessage: any = {
      text: payload.text,
      footer: payload.footer,
      buttons: buttons,
      headerType: 1
    };

    if (payload.imageUrl) {
      buttonMessage.image = { url: payload.imageUrl };
      buttonMessage.headerType = 4;
    }

    await session.socket.sendMessage(payload.to, buttonMessage as any);
  }

  private async sendList(payload: SendListPayload) {
    const session = this.sessions.get(payload.sessionId);
    if (!session) {
      logger.error(`Session ${payload.sessionId} not found for sending list`);
      return;
    }

    const listMessage = {
      text: payload.text,
      footer: payload.footer,
      title: payload.text.split('\n')[0], // Use first line as title if not provided
      buttonText: payload.buttonText,
      sections: payload.sections
    };

    await session.socket.sendMessage(payload.to, listMessage as any);
  }

  private async sendPoll(payload: SendPollPayload) {
    const session = this.sessions.get(payload.sessionId);
    if (!session) {
      logger.error(`Session ${payload.sessionId} not found for sending poll`);
      return;
    }

    await session.socket.sendMessage(payload.to, {
      poll: {
        name: payload.name,
        values: payload.options,
        selectableCount: payload.selectableCount || 1
      }
    } as any);
  }

  private async sendTemplate(payload: SendTemplatePayload) {
    const session = this.sessions.get(payload.sessionId);
    if (!session) {
      logger.error(`Session ${payload.sessionId} not found for sending template`);
      return;
    }

    const templateButtons = payload.buttons.map((btn: any, index: number) => {
      const base = { index: index + 1 };
      if (btn.type === 'url') {
        return { ...base, urlButton: { displayText: btn.text, url: btn.url } };
      } else if (btn.type === 'call') {
        return { ...base, callButton: { displayText: btn.text, phoneNumber: btn.phoneNumber } };
      } else {
        return { ...base, quickReplyButton: { displayText: btn.text, id: btn.buttonId } };
      }
    });

    const message: any = {
      text: payload.text,
      footer: payload.footer,
      templateButtons: templateButtons
    };

    if (payload.mediaUrl) {
      // Logic for image/video in template header
      message.image = { url: payload.mediaUrl }; // Simplification, could check extension
    }

    await session.socket.sendMessage(payload.to, message as any);
  }

  private async sendInteractive(payload: SendInteractivePayload) {
    const session = this.sessions.get(payload.sessionId);
    if (!session) {
      logger.error(`Session ${payload.sessionId} not found for sending interactive message`);
      return;
    }

    const buttons = payload.buttons.map((btn: any) => {
      if (btn.type === 'url') {
        return {
          name: "cta_url",
          buttonParamsJson: JSON.stringify({
            display_text: btn.text,
            url: btn.url,
            merchant_url: btn.url
          })
        };
      } else {
        return {
          name: "quick_reply",
          buttonParamsJson: JSON.stringify({
            display_text: btn.text,
            id: btn.buttonId
          })
        };
      }
    });

    const interactiveMessage = {
      interactiveMessage: {
        body: { text: payload.text },
        footer: { text: payload.footer },
        header: payload.mediaUrl ? {
          title: "",
          subtitle: "",
          hasMediaAttachment: true,
          imageMessage: { url: payload.mediaUrl } // Simplified
        } : { hasMediaAttachment: false },
        nativeFlowMessage: {
          buttons: buttons
        }
      }
    };

    // Relay message is often safer for complex interactive messages
    await session.socket.sendMessage(payload.to, interactiveMessage as any);
  }

  private async sendCarousel(payload: SendCarouselPayload) {
    const session = this.sessions.get(payload.sessionId);
    if (!session) {
      logger.error(`Session ${payload.sessionId} not found for sending carousel`);
      return;
    }

    const cards = await Promise.all(payload.cards.map(async (card) => {
      const buttons = card.buttons.map(btn => {
        if (btn.type === 'url') {
          return {
            name: "cta_url",
            buttonParamsJson: JSON.stringify({
              display_text: btn.text,
              url: btn.url,
              merchant_url: btn.url
            })
          };
        } else {
          return {
            name: "quick_reply",
            buttonParamsJson: JSON.stringify({
              display_text: btn.text,
              id: btn.buttonId
            })
          };
        }
      });

      const cardObj: any = {
        body: { text: card.body },
        footer: { text: card.footer || "" },
        nativeFlowMessage: {
          buttons: buttons
        }
      };

      if (card.headerUrl) {
        // Prepare media for card header
        const media = await prepareWAMessageMedia(
          { image: { url: card.headerUrl } },
          { upload: session.socket.waUploadToServer }
        );
        cardObj.header = {
          hasMediaAttachment: true,
          ...media
        };
      } else {
        cardObj.header = { hasMediaAttachment: false };
      }

      return cardObj;
    }));

    const messageContent = {
      viewOnceMessage: {
        message: {
          interactiveMessage: {
            body: { text: payload.text },
            footer: { text: payload.footer || "" },
            header: { hasMediaAttachment: false },
            carouselMessage: {
              cards: cards,
              messageVersion: 1
            }
          }
        }
      }
    };

    const msg = generateWAMessageFromContent(payload.to, messageContent as any, {
      userJid: session.socket.user?.id || "",
    });

    await session.socket.relayMessage(payload.to, msg.message!, {
      messageId: msg.key.id!
    });
  }
}

export { SessionManager };
