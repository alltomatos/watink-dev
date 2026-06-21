export interface ChatFields {
  name: boolean;
  email: boolean;
  phone: boolean;
}

export interface ChatConfig {
  buttonColor: string;
  icon: string;
  position: string;
  title: string;
  subtitle: string;
  fields: ChatFields;
}

export interface WhatsAppData {
  id?: number;
  name: string;
  isDefault: boolean;
  type: string;
  chatConfig: ChatConfig;
  queues?: { id: number }[];
}

export interface WebchatModalProps {
  open: boolean;
  onClose: () => void;
  whatsAppId?: number;
  onSaved?: () => Promise<void>;
}
