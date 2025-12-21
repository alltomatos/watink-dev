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
  | "message.send.media"
  | "message.send.buttons"   // NOVO: Botões simples
  | "message.send.list"      // NOVO: Lista de opções
  | "message.send.poll"      // NOVO: Enquete
  | "message.send.template"  // NOVO: Template (URL/Call)
  | "message.send.interactive"; // NOVO: Native Flow (Interativo)

export interface StartSessionPayload {
  sessionId: number;
  sessionToken?: string;
  usePairingCode?: boolean;
  phoneNumber?: string;
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
    data: string;
  };
}

// Botões simples (até 3 botões)
export interface SendButtonsPayload {
  sessionId: number;
  to: string;
  text: string;
  footer?: string;
  buttons: Array<{
    buttonId: string;
    buttonText: string;
  }>;
  imageUrl?: string;  // Opcional: adiciona imagem ao header
}

// Lista de opções com seções
export interface SendListPayload {
  sessionId: number;
  to: string;
  text: string;
  footer?: string;
  buttonText: string;  // Texto do botão "Ver opções"
  sections: Array<{
    title: string;
    rows: Array<{
      rowId: string;
      title: string;
      description?: string;
    }>;
  }>;
}

// Enquete/Poll
export interface SendPollPayload {
  sessionId: number;
  to: string;
  name: string;           // Pergunta
  options: string[];      // Opções (2-12)
  selectableCount?: number; // Quantas podem ser selecionadas (padrão: 1)
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

export type EventType =
  | "session.qrcode"
  | "session.pairingcode"
  | "session.status"
  | "message.received"
  | "message.ack"
  | "message.response.button"   // NOVO: Resposta de botão
  | "message.response.list"     // NOVO: Resposta de lista
  | "message.response.poll";    // NOVO: Resposta de enquete

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
    // Novos campos para respostas interativas
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

