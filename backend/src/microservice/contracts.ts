export interface Envelope<T = any> {
  id: string;
  timestamp: number;
  tenantId: string | number; // Support legacy number IDs if needed, but prefer UUID
  type: string;
  payload: T;
}

// --- COMMANDS (Backend -> Engine) ---

export type CommandType =
  | "session.start"
  | "session.stop"
  | "message.send.text"
  | "message.send.media";

export interface StartSessionPayload {
  sessionId: number;
  sessionToken?: string;
  usePairingCode?: boolean;  // true = usar código, false = usar QR
  phoneNumber?: string;       // Formato E.164 sem +: 5511999999999
}

export interface StopSessionPayload {
  sessionId: number;
}

export interface SendTextPayload {
  sessionId: number;
  to: string;
  body: string;
  options?: {
    quotedMsgId?: string;
  };
}

export interface SendMediaPayload {
  sessionId: number;
  to: string;
  caption?: string;
  media: {
    mimetype: string;
    filename: string;
    data: string; // Base64
  };
}

// --- EVENTS (Engine -> Backend) ---

export type EventType =
  | "session.qrcode"
  | "session.pairingcode"  // Código de pareamento
  | "session.status"
  | "message.received"
  | "message.ack";

export interface QrCodePayload {
  sessionId: number;
  qrcode: string;
  attempt: number;
}

export interface PairingCodePayload {
  sessionId: number;
  pairingCode: string;  // Formato: "XXXX-XXXX"
}

export interface SessionStatusPayload {
  sessionId: number;
  status: "CONNECTED" | "DISCONNECTED" | "QRCODE" | "OPENING";
}

export interface MessageReceivedPayload {
  sessionId: number;
  message: {
    id: string;
    from: string;
    to: string;
    body: string;
    fromMe: boolean;
    isGroup: boolean;
    type: string;
    timestamp: number;
    hasMedia: boolean;
    mediaUrl?: string; // If processed/uploaded by engine
    participant?: string;
  };
}

export interface MessageAckPayload {
  sessionId: number;
  messageId: string;
  ack: number; // 0: Clock, 1: Sent, 2: Received, 3: Read, 4: Played
}
