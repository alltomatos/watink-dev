export interface Envelope<T = any> {
  id: string;
  timestamp: number;
  tenantId: string | number;
  type: string;
  payload: T;
}

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

export type EventType =
  | "session.qrcode"
  | "session.pairingcode"  // NOVO: código de pareamento
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
    mediaUrl?: string;
    participant?: string;
  };
}

export interface MessageAckPayload {
  sessionId: number;
  messageId: string;
  ack: number;
}
