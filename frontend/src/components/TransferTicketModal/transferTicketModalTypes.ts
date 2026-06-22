export interface UserOption {
  id: number;
  name: string;
  queues?: { id: number; name: string }[];
}

export interface QueueOption {
  id: number;
  name: string;
}

export interface TransferTicketModalProps {
  modalOpen: boolean;
  onClose: () => void;
  ticketid: number | string;
  ticketWhatsappId?: number | string;
}
