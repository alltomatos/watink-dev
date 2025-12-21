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
  | "message.send.media"
  | "message.send.buttons"
  | "message.send.list"
  | "message.send.poll";

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

export interface SendButtonsPayload {
  sessionId: number;
  to: string;
  text: string;
  footer?: string;
  buttons: Array<{
    buttonId: string;
    buttonText: string;
  }>;
  imageUrl?: string;
}

export interface SendListPayload {
  sessionId: number;
  to: string;
  text: string;
  footer?: string;
  buttonText: string;
  sections: Array<{
    title: string;
    rows: Array<{
      rowId: string;
      title: string;
      description?: string;
    }>;
  }>;
}

export interface SendPollPayload {
  sessionId: number;
  to: string;
  name: string;
  options: string[];
  selectableCount?: number;
}

// Mensagem Template (URL, Call, Reply)
export interface SendTemplatePayload {
  sessionId: number;
  to: string;
  text: string;
  footer?: string;
  buttons: Array<{
    type: 'url' | 'call' | 'reply';
    text: string;
    url?: string;
    phoneNumber?: string;
    buttonId?: string;
  }>;
  mediaUrl?: string; // Imagem ou vídeo opcional no header
}

// Mensagem Interativa (Native Flow)
export interface SendInteractivePayload {
  sessionId: number;
  to: string;
  text: string;
  footer?: string;
  buttons: Array<{
    type: 'url' | 'reply';
    text: string;
    url?: string;
    buttonId?: string;
  }>;
  mediaUrl?: string;
}

// --- EVENTS (Engine -> Backend) ---

export type EventType =
  | "session.qrcode"
  | "session.pairingcode"
  | "session.status"
  | "message.received"
  | "message.ack"
  | "message.response.button"
  | "message.response.list"
  | "message.response.poll"
  | "message.response.interactive";


export interface QrCodePayload {
  sessionId: number;
  qrcode: string;
  attempt: number;
}

export interface PairingCodePayload {
  sessionId: number;
  pairingCode: string;
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
    // Interactive fields
    selectedButtonId?: string;
    selectedRowId?: string;
    pollVotes?: string[];
  };
}

export interface MessageAckPayload {
  sessionId: number;
  messageId: string;
  ack: number;
}

