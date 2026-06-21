export interface Filter {
  id: number;
  field: string;
  operator: string;
  value: string;
  logic?: 'AND' | 'OR';
}

export interface FilterBuilderProps {
  filters: Filter[];
  onChange: (filters: Filter[]) => void;
  tableName?: string;
  maxFilters?: number;
}

export interface FieldConfig {
  value: string;
  label: string;
  type: 'number' | 'string' | 'boolean' | 'select';
  options?: string[];
}

export const TABLE_FIELDS: Record<string, FieldConfig[]> = {
  Contacts: [
    { value: 'id', label: 'ID', type: 'number' },
    { value: 'name', label: 'Nome', type: 'string' },
    { value: 'number', label: 'Número', type: 'string' },
    { value: 'email', label: 'E-mail', type: 'string' },
    { value: 'isGroup', label: 'É Grupo', type: 'boolean' },
  ],
  Tickets: [
    { value: 'id', label: 'ID', type: 'number' },
    { value: 'status', label: 'Status', type: 'select', options: ['open', 'pending', 'closed'] },
    { value: 'queueId', label: 'ID da Fila', type: 'number' },
    { value: 'userId', label: 'ID do Usuário', type: 'number' },
    { value: 'contactId', label: 'ID do Contato', type: 'number' },
    { value: 'isGroup', label: 'É Grupo', type: 'boolean' },
  ],
  Messages: [
    { value: 'id', label: 'ID', type: 'number' },
    { value: 'body', label: 'Conteúdo', type: 'string' },
    { value: 'fromMe', label: 'Enviada por mim', type: 'boolean' },
    { value: 'mediaType', label: 'Tipo de Mídia', type: 'string' },
    { value: 'ticketId', label: 'ID do Ticket', type: 'number' },
  ],
  Users: [
    { value: 'id', label: 'ID', type: 'number' },
    { value: 'name', label: 'Nome', type: 'string' },
    { value: 'email', label: 'E-mail', type: 'string' },
    { value: 'profile', label: 'Perfil', type: 'select', options: ['admin', 'user', 'super'] },
  ],
  Queues: [
    { value: 'id', label: 'ID', type: 'number' },
    { value: 'name', label: 'Nome', type: 'string' },
    { value: 'color', label: 'Cor', type: 'string' },
  ],
  Whatsapps: [
    { value: 'id', label: 'ID', type: 'number' },
    { value: 'name', label: 'Nome', type: 'string' },
    { value: 'status', label: 'Status', type: 'select', options: ['CONNECTED', 'DISCONNECTED', 'OPENING'] },
    { value: 'isDefault', label: 'É Padrão', type: 'boolean' },
  ],
  QuickAnswers: [
    { value: 'id', label: 'ID', type: 'number' },
    { value: 'shortcut', label: 'Atalho', type: 'string' },
    { value: 'message', label: 'Mensagem', type: 'string' },
  ],
  Pipelines: [
    { value: 'id', label: 'ID', type: 'number' },
    { value: 'name', label: 'Nome', type: 'string' },
  ],
};

export const FILTER_OPERATORS = [
  { value: '=', label: 'Igual a' },
  { value: '!=', label: 'Diferente de' },
  { value: '>', label: 'Maior que' },
  { value: '<', label: 'Menor que' },
  { value: '>=', label: 'Maior ou igual' },
  { value: '<=', label: 'Menor ou igual' },
  { value: 'like', label: 'Contém' },
];

export const CONTEXT_VARIABLES = [
  { value: '{{contactId}}', label: 'ID do Contato' },
  { value: '{{ticketId}}', label: 'ID do Ticket' },
  { value: '{{userId}}', label: 'ID do Usuário' },
  { value: '{{queueId}}', label: 'ID da Fila' },
  { value: '{{lastInput}}', label: 'Última Mensagem' },
];
