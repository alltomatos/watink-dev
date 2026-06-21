export interface DataField {
  id: number;
  field: string;
  value: string;
  useVariable: boolean;
}

export interface DataBuilderProps {
  dataFields: DataField[];
  onChange: (fields: DataField[]) => void;
  tableName?: string;
  maxFields?: number;
}

export interface FieldConfig {
  value: string;
  label: string;
  type: 'string' | 'boolean' | 'select' | 'variable';
  options?: string[];
}

export const EDITABLE_FIELDS: Record<string, FieldConfig[]> = {
  Contacts: [
    { value: 'name', label: 'Nome', type: 'string' },
    { value: 'email', label: 'E-mail', type: 'string' },
    { value: 'profilePicUrl', label: 'URL da Foto', type: 'string' },
  ],
  Tickets: [
    { value: 'status', label: 'Status', type: 'select', options: ['open', 'pending', 'closed'] },
    { value: 'queueId', label: 'ID da Fila', type: 'variable' },
    { value: 'userId', label: 'ID do Usuário', type: 'variable' },
  ],
  Messages: [
    { value: 'body', label: 'Conteúdo', type: 'string' },
    { value: 'read', label: 'Lida', type: 'boolean' },
  ],
  Users: [
    { value: 'name', label: 'Nome', type: 'string' },
    { value: 'email', label: 'E-mail', type: 'string' },
  ],
  Queues: [
    { value: 'name', label: 'Nome', type: 'string' },
    { value: 'color', label: 'Cor', type: 'string' },
  ],
  Whatsapps: [
    { value: 'name', label: 'Nome', type: 'string' },
    { value: 'isDefault', label: 'É Padrão', type: 'boolean' },
  ],
  QuickAnswers: [
    { value: 'shortcut', label: 'Atalho', type: 'string' },
    { value: 'message', label: 'Mensagem', type: 'string' },
  ],
  Pipelines: [{ value: 'name', label: 'Nome', type: 'string' }],
};

export const CONTEXT_VARIABLES = [
  { value: '{{contactId}}', label: 'ID do Contato' },
  { value: '{{ticketId}}', label: 'ID do Ticket' },
  { value: '{{userId}}', label: 'ID do Usuário' },
  { value: '{{queueId}}', label: 'ID da Fila' },
  { value: '{{contactName}}', label: 'Nome do Contato' },
  { value: '{{lastInput}}', label: 'Última Mensagem' },
];
