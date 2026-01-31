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
  sessionInstanceId?: number;
  usePairingCode?: boolean;
  phoneNumber?: string;
  name?: string;
  papiUrl?: string;
  papiKey?: string;
  webhookUrl?: string;
}

export interface StopSessionPayload {
  sessionId: number;
}

export interface SendTextPayload {
  sessionId: number;
  to: string;
  body: string;
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
