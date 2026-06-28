import type { Condition } from './components/ConditionBuilder';
import type { Filter } from './components/FilterBuilder';
import type { DataField } from './components/DataBuilder';

export interface NodeData {
  label?: string;
  triggerType?: string;
  actionType?: string;
  whatsappId?: string;
  webhookToken?: string;
  conditions?: Condition[];
  conditionsA?: Condition[];
  contentType?: string;
  content?: string;
  mediaUrl?: string;
  menuTitle?: string;
  options?: { id: string; label: string }[];
  kanbanAction?: string;
  dealTitle?: string;
  dealValue?: string;
  dealPriority?: string;
  pipelineId?: string;
  stageId?: string;
  ticketAction?: string;
  newStatus?: string;
  queueId?: string;
  userId?: string;
  method?: string;
  url?: string;
  headers?: string;
  body?: string;
  contactFields?: string[];
  ticketFields?: string[];
  pipelineFields?: string[];
  includeContext?: boolean;
  fullData?: boolean;
  resultVariable?: string;
  responseMode?: string;
  knowledgeBaseId?: string;
  persona?: string;
  maxTurns?: number;
  helpdeskAction?: string;
  subject?: string;
  description?: string;
  priority?: string;
  category?: string;
  endAction?: string;
  endMessage?: string;
  operation?: string;
  tableName?: string;
  filters?: Filter[];
  dataFields?: DataField[];
  selectedFields?: string[];
  limit?: number;
  orderByField?: string;
  orderByDir?: string;
  outputVariable?: string;
  inputVariable?: string;
  filterConditions?: FilterCondition[];
  [key: string]: unknown;
}

export interface FilterCondition {
  id: number;
  field: string;
  operator: string;
  value: string;
  logic?: 'AND' | 'OR';
}

export interface FlowNode {
  id: string;
  type: string;
  data: NodeData;
}

export interface Pipeline {
  id: string;
  name: string;
  stages?: { id: string; name: string }[];
}

export interface Queue {
  id: string;
  name: string;
  color?: string;
}

export interface User {
  id: string;
  name: string;
}

export interface KnowledgeBase {
  id: string;
  name: string;
}

export interface NodeEditorSidebarProps {
  open: boolean;
  node: FlowNode | null;
  onClose: () => void;
  onSave: (nodeId: string, data: NodeData) => void;
  onDelete: (nodeId: string) => void;
}

export const NODE_TITLES: Record<string, string> = {
  start: 'Configurar Início',
  input: 'Configurar Início',
  trigger: 'Configurar Gatilho',
  message: 'Configurar Mensagem',
  menu: 'Configurar Menu',
  switch: 'Configurar Decisão',
  pipeline: 'Configurar Pipeline (Kanban)',
  ticket: 'Configurar Ticket',
  webhook: 'Configurar Webhook',
  knowledge: 'Configurar Conhecimento',
  agent: 'Configurar Agente IA',
  database: 'Configurar Database',
  filter: 'Configurar Filtro de Dados',
  api: 'Configurar Requisição API',
  helpdesk: 'Configurar Helpdesk',
  end: 'Configurar Fim',
  output: 'Configurar Fim',
};

export const TABLE_ALL_FIELDS: Record<string, string[]> = {
  Contacts: ['id', 'name', 'number', 'email', 'isGroup', 'profilePicUrl', 'createdAt'],
  Tickets: ['id', 'status', 'queueId', 'userId', 'contactId', 'isGroup', 'createdAt', 'updatedAt'],
  Messages: ['id', 'body', 'fromMe', 'mediaType', 'ticketId', 'createdAt'],
  Users: ['id', 'name', 'email', 'profile', 'createdAt'],
  Queues: ['id', 'name', 'color', 'createdAt'],
  Whatsapps: ['id', 'name', 'status', 'isDefault', 'createdAt'],
  QuickAnswers: ['id', 'shortcut', 'message', 'createdAt'],
  Pipelines: ['id', 'name', 'createdAt'],
};

export const FILTERABLE_FIELDS = [
  { value: 'id', label: 'ID' },
  { value: 'name', label: 'Nome' },
  { value: 'status', label: 'Status' },
  { value: 'email', label: 'E-mail' },
  { value: 'number', label: 'Número' },
  { value: 'body', label: 'Conteúdo' },
  { value: 'queueId', label: 'ID da Fila' },
  { value: 'userId', label: 'ID do Usuário' },
  { value: 'createdAt', label: 'Data de Criação' },
];

export const FILTER_OPERATORS_NODE = [
  { value: 'equals', label: 'Igual a' },
  { value: 'notEquals', label: 'Diferente de' },
  { value: 'contains', label: 'Contém' },
  { value: 'notContains', label: 'Não contém' },
  { value: 'startsWith', label: 'Começa com' },
  { value: 'endsWith', label: 'Termina com' },
  { value: 'greaterThan', label: 'Maior que' },
  { value: 'lessThan', label: 'Menor que' },
  { value: 'isEmpty', label: 'Está vazio' },
  { value: 'isNotEmpty', label: 'Não está vazio' },
];
