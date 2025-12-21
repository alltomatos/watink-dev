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
  | "session.status"
  | "message.received"
  | "message.ack";

export interface QrCodePayload {
  sessionId: number;
  qrcode: string;
  attempt: number;
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
