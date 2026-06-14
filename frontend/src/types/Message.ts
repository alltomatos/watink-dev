import { Contact } from "./Ticket";

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
  reactions?: any[];
  dataJson?: string | any;
  participant?: string;
}
