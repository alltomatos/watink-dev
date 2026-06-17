import { Contact } from "./Ticket";

/**
 * A single WhatsApp reaction entry as returned by the backend.
 * The backend may send either `text` or `emoji` depending on the WA version.
 */
export interface Reaction {
  /** Emoji character (newer WA format). */
  emoji?: string;
  /** Emoji character (legacy WA format). */
  text?: string;
  /** Sender JID, present when reactions include per-sender detail. */
  senderKeyHash?: string;
}

export interface Message {
  id: string;
  body: string;
  fromMe: boolean;
  read: boolean;
  createdAt: string;
  updatedAt: string;
  ticketId: number;
  contactId: number;
  contact?: Contact;
  mediaType?: string;
  mediaUrl?: string;
  ack?: number;
  isDeleted?: boolean;
  quotedMsg?: Message;
  /**
   * Reaction list. The backend may persist reactions as a JSON string or as a
   * pre-parsed array. Consumers must normalise via JSON.parse when the value is
   * a string before iterating.
   */
  reactions?: Reaction[] | string;
  /**
   * Raw WhatsApp protobuf data serialised as JSON. Stored as a string in the
   * database and optionally pre-parsed by the backend before delivery.
   */
  dataJson?: string | Record<string, unknown>;
  participant?: string;
}
