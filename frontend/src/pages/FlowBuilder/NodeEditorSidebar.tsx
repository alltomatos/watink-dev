import React from 'react';
import { X, Trash2, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';

import ConditionBuilder, { Condition } from './components/ConditionBuilder';
import FilterBuilder, { Filter } from './components/FilterBuilder';
import DataBuilder, { DataField } from './components/DataBuilder';
import api from '../../services/api';

// ─── Types ────────────────────────────────────────────────────────────────────

interface NodeData {
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

interface FilterCondition {
  id: number;
  field: string;
  operator: string;
  value: string;
  logic?: 'AND' | 'OR';
}

interface FlowNode {
  id: string;
  type: string;
  data: NodeData;
}

interface Pipeline {
  id: string;
  name: string;
  stages?: { id: string; name: string }[];
}

interface Queue {
  id: string;
  name: string;
  color?: string;
}

interface User {
  id: string;
  name: string;
}

interface KnowledgeBase {
  id: string;
  name: string;
}

interface NodeEditorSidebarProps {
  open: boolean;
  node: FlowNode | null;
  onClose: () => void;
  onSave: (nodeId: string, data: NodeData) => void;
  onDelete: (nodeId: string) => void;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const NODE_TITLES: Record<string, string> = {
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
  database: 'Configurar Database',
  filter: 'Configurar Filtro de Dados',
  api: 'Configurar Requisição API',
  helpdesk: 'Configurar Helpdesk',
  end: 'Configurar Fim',
  output: 'Configurar Fim',
};

const TABLE_ALL_FIELDS: Record<string, string[]> = {
  Contacts: ['id', 'name', 'number', 'email', 'isGroup', 'profilePicUrl', 'createdAt'],
  Tickets: ['id', 'status', 'queueId', 'userId', 'contactId', 'isGroup', 'createdAt', 'updatedAt'],
  Messages: ['id', 'body', 'fromMe', 'mediaType', 'ticketId', 'createdAt'],
  Users: ['id', 'name', 'email', 'profile', 'createdAt'],
  Queues: ['id', 'name', 'color', 'createdAt'],
  Whatsapps: ['id', 'name', 'status', 'isDefault', 'createdAt'],
  QuickAnswers: ['id', 'shortcut', 'message', 'createdAt'],
  Pipelines: ['id', 'name', 'createdAt'],
};

const FILTERABLE_FIELDS = [
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

const FILTER_OPERATORS_NODE = [
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

// ─── Component ────────────────────────────────────────────────────────────────

const NodeEditorSidebar: React.FC<NodeEditorSidebarProps> = ({
  open,
  node,
  onClose,
  onSave,
  onDelete,
}) => {
  const [formData, setFormData] = React.useState<NodeData>({});
  const [pipelines, setPipelines] = React.useState<Pipeline[]>([]);
  const [queues, setQueues] = React.useState<Queue[]>([]);
  const [users, setUsers] = React.useState<User[]>([]);
  const [knowledgeBases, setKnowledgeBases] = React.useState<KnowledgeBase[]>([]);

  React.useEffect(() => {
    if (node?.data) setFormData({ ...node.data });
  }, [node]);

  React.useEffect(() => {
    if (!node) return;
    if (node.type === 'pipeline') {
      api.get('/pipelines')
        .then((res) => setPipelines(res.data))
        .catch(() => {});
    }
    if (node.type === 'ticket') {
      api.get('/queue').then((res) => setQueues(res.data)).catch(() => {});
      api.get('/users').then((res) => setUsers(res.data.users)).catch(() => {});
    }
    if (node.type === 'knowledge') {
      api.get('/knowledge-bases').then((res) => setKnowledgeBases(res.data)).catch(() => {});
    }
  }, [node]);

  if (!node) return null;

  const handleChange = (field: string, value: unknown) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSave = () => onSave(node.id, formData);

  // ─── Form renderers ────────────────────────────────────────────────────────

  const renderStartForm = () => (
    <div className="space-y-3">
      <div className="space-y-1">
        <Label className="text-xs">Tipo de Gatilho</Label>
        <Select value={formData.triggerType || 'time'} onValueChange={(v) => handleChange('triggerType', v)}>
          <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="time">Tempo/Agendamento</SelectItem>
            <SelectItem value="action">Ação do Sistema</SelectItem>
            <SelectItem value="message">Mensagem Recebida</SelectItem>
            <SelectItem value="webhook">Webhook Externo</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {formData.triggerType === 'action' && (
        <div className="space-y-1">
          <Label className="text-xs">Tipo de Ação</Label>
          <Select value={formData.actionType || 'ticketCreated'} onValueChange={(v) => handleChange('actionType', v)}>
            <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="ticketCreated">Ticket Criado</SelectItem>
              <SelectItem value="ticketClosed">Ticket Fechado</SelectItem>
              <SelectItem value="contactCreated">Contato Criado</SelectItem>
              <SelectItem value="queueChanged">Mudança de Fila</SelectItem>
            </SelectContent>
          </Select>
        </div>
      )}

      {formData.triggerType === 'message' && (
        <div className="space-y-1">
          <Label className="text-xs">Conexão</Label>
          <Select value={formData.whatsappId || 'all'} onValueChange={(v) => handleChange('whatsappId', v)}>
            <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas as Conexões</SelectItem>
            </SelectContent>
          </Select>
        </div>
      )}

      {formData.triggerType === 'webhook' && (
        <div className="space-y-2">
          <p className="text-[10px] text-muted-foreground">URL do Webhook (use este endpoint para disparar o fluxo):</p>
          <Input
            readOnly
            className="h-8 text-xs"
            value={`${window.location.origin}/api/v1/flows/webhook/${formData.webhookToken || 'SEU_TOKEN_AQUI'}`}
          />
          <div className="space-y-1">
            <Label className="text-xs">Token do Webhook</Label>
            <Input
              className="h-8 text-xs"
              placeholder="meu-token-unico"
              value={formData.webhookToken || ''}
              onChange={(e) => handleChange('webhookToken', e.target.value)}
            />
            <p className="text-[10px] text-muted-foreground">Token único para identificar este fluxo</p>
          </div>
        </div>
      )}
    </div>
  );

  const renderTriggerForm = () => (
    <div className="space-y-3">
      <div className="space-y-1">
        <Label className="text-xs">Tipo de Gatilho</Label>
        <Select value={formData.triggerType || 'keyword'} onValueChange={(v) => handleChange('triggerType', v)}>
          <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="keyword">Palavra-chave</SelectItem>
            <SelectItem value="any">Qualquer Mensagem</SelectItem>
            <SelectItem value="firstContact">Primeiro Contato</SelectItem>
          </SelectContent>
        </Select>
      </div>
      {formData.triggerType === 'keyword' && (
        <div className="space-y-1 pt-2">
          <p className="text-xs font-medium text-muted-foreground">Condição de Ativação</p>
          <ConditionBuilder
            conditions={formData.conditions || []}
            onChange={(c) => handleChange('conditions', c)}
            title=""
            maxConditions={3}
          />
        </div>
      )}
    </div>
  );

  const renderMessageForm = () => (
    <div className="space-y-3">
      <div className="space-y-1">
        <Label className="text-xs">Tipo de Conteúdo</Label>
        <Select value={formData.contentType || 'text'} onValueChange={(v) => handleChange('contentType', v)}>
          <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="text">Texto</SelectItem>
            <SelectItem value="image">Imagem</SelectItem>
            <SelectItem value="video">Vídeo</SelectItem>
            <SelectItem value="audio">Áudio</SelectItem>
            <SelectItem value="file">Arquivo</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {formData.contentType === 'text' ? (
        <Textarea
          className="text-xs min-h-[100px]"
          placeholder="Digite a mensagem..."
          value={formData.content || ''}
          onChange={(e) => handleChange('content', e.target.value)}
        />
      ) : (
        <Input
          className="h-8 text-xs"
          placeholder="https://..."
          value={formData.mediaUrl || ''}
          onChange={(e) => handleChange('mediaUrl', e.target.value)}
        />
      )}

      <div className="space-y-1">
        <p className="text-[10px] text-muted-foreground">Inserir variável:</p>
        <div className="flex flex-wrap gap-1">
          {['{{firstName}}', '{{name}}', '{{protocol}}', '{{date}}'].map((v) => (
            <Button
              key={v}
              size="sm"
              variant="outline"
              className="h-6 text-[10px] px-2"
              onClick={() => handleChange('content', `${formData.content || ''} ${v}`)}
            >
              {v.replace(/\{\{|\}\}/g, '')}
            </Button>
          ))}
        </div>
      </div>
    </div>
  );

  const renderMenuForm = () => {
    const options = formData.options || [{ id: 'opt1', label: 'Opção 1' }];

    const addOption = () => {
      const newOptions = [...options, { id: `opt${Date.now()}`, label: `Opção ${options.length + 1}` }];
      handleChange('options', newOptions);
    };

    const removeOption = (optId: string) => handleChange('options', options.filter((o) => o.id !== optId));

    const updateOption = (optId: string, newLabel: string) =>
      handleChange('options', options.map((o) => (o.id === optId ? { ...o, label: newLabel } : o)));

    return (
      <div className="space-y-3">
        <Input
          className="h-8 text-xs"
          placeholder="Escolha uma opção:"
          value={formData.menuTitle || ''}
          onChange={(e) => handleChange('menuTitle', e.target.value)}
        />
        <div className="space-y-1">
          <p className="text-xs font-medium text-muted-foreground">Opções do Menu</p>
          {options.map((opt) => (
            <div key={opt.id} className="flex gap-1 items-center bg-muted/50 rounded p-1">
              <Input
                className="h-7 text-xs border-0 bg-transparent focus-visible:ring-0"
                value={opt.label}
                onChange={(e) => updateOption(opt.id, e.target.value)}
              />
              <Button
                size="icon"
                variant="ghost"
                className="h-7 w-7 text-destructive hover:text-destructive"
                onClick={() => removeOption(opt.id)}
              >
                <Trash2 className="h-3 w-3" />
              </Button>
            </div>
          ))}
          <Button size="sm" variant="ghost" className="h-7 text-xs gap-1" onClick={addOption}>
            <Plus className="h-3 w-3" /> Adicionar Opção
          </Button>
        </div>
      </div>
    );
  };

  const renderSwitchForm = () => (
    <div className="space-y-3">
      <p className="text-xs text-muted-foreground">
        Configure quando seguir para a <strong>Opção A</strong> (verde). Caso contrário, seguirá para <strong>Opção B</strong> (vermelho).
      </p>
      <div className="space-y-1">
        <p className="text-xs font-medium">Condição para Opção A</p>
        <ConditionBuilder
          conditions={formData.conditionsA || []}
          onChange={(c) => handleChange('conditionsA', c)}
          title=""
          maxConditions={3}
        />
      </div>
    </div>
  );

  const renderTicketForm = () => (
    <div className="space-y-3">
      <div className="space-y-1">
        <Label className="text-xs">Ação do Ticket</Label>
        <Select value={formData.ticketAction || 'moveToQueue'} onValueChange={(v) => handleChange('ticketAction', v)}>
          <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="moveToQueue">Mover para Fila</SelectItem>
            <SelectItem value="assignUser">Atribuir Atendente</SelectItem>
            <SelectItem value="changeStatus">Alterar Status</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {formData.ticketAction === 'changeStatus' && (
        <div className="space-y-1">
          <Label className="text-xs">Novo Status</Label>
          <Select value={formData.newStatus || 'open'} onValueChange={(v) => handleChange('newStatus', v)}>
            <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="open">Aberto</SelectItem>
              <SelectItem value="pending">Pendente</SelectItem>
              <SelectItem value="closed">Fechado</SelectItem>
            </SelectContent>
          </Select>
        </div>
      )}

      {formData.ticketAction === 'moveToQueue' && (
        <div className="space-y-1">
          <Label className="text-xs">Fila</Label>
          <Select value={formData.queueId || ''} onValueChange={(v) => handleChange('queueId', v)}>
            <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              {queues.map((q) => (
                <SelectItem key={q.id} value={q.id} style={{ color: q.color }}>{q.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {formData.ticketAction === 'assignUser' && (
        <div className="space-y-1">
          <Label className="text-xs">Usuário (Atendente)</Label>
          <Select value={formData.userId || ''} onValueChange={(v) => handleChange('userId', v)}>
            <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              {users.map((u) => (
                <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}
    </div>
  );

  const renderWebhookForm = () => (
    <div className="space-y-3">
      <div className="space-y-1">
        <Label className="text-xs">Método</Label>
        <Select value={formData.method || 'POST'} onValueChange={(v) => handleChange('method', v)}>
          <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
          <SelectContent>
            {['GET', 'POST', 'PUT', 'DELETE', 'PATCH'].map((m) => (
              <SelectItem key={m} value={m}>{m}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-1">
        <Label className="text-xs">URL</Label>
        <Input className="h-8 text-xs" placeholder="https://api.exemplo.com/webhook" value={formData.url || ''} onChange={(e) => handleChange('url', e.target.value)} />
      </div>

      <div className="space-y-1">
        <p className="text-xs font-medium">Headers (JSON)</p>
        <Textarea className="text-xs min-h-[60px]" placeholder='{ "Authorization": "Bearer 123" }' value={formData.headers || ''} onChange={(e) => handleChange('headers', e.target.value)} />
      </div>

      <div className="space-y-1">
        <p className="text-xs font-medium">Body (JSON)</p>
        <Textarea className="text-xs min-h-[100px]" placeholder='{ "nome": "{{contact.name}}" }' value={formData.body || ''} onChange={(e) => handleChange('body', e.target.value)} />
      </div>

      {/* Multi-select fields: contact, ticket, pipeline */}
      {[
        { key: 'contactFields', label: 'Dados do Contato', fields: ['name', 'number', 'email', 'profilePicUrl', 'id'] },
        { key: 'ticketFields', label: 'Dados do Ticket', fields: ['id', 'status', 'queueId', 'userId', 'lastMessage', 'chatbot'] },
        { key: 'pipelineFields', label: 'Dados do Pipeline (CRM)', fields: ['dealTitle', 'dealValue', 'pipelineName', 'stageName', 'dealId', 'priority'] },
      ].map(({ key, label, fields }) => (
        <div key={key} className="space-y-1">
          <p className="text-xs font-medium">{label}</p>
          <div className="flex flex-wrap gap-x-3 gap-y-1">
            {fields.map((name) => {
              const selected = ((formData[key] as string[]) || []).includes(name);
              return (
                <div key={name} className="flex items-center gap-1">
                  <Checkbox
                    id={`${key}-${name}`}
                    checked={selected}
                    onCheckedChange={(checked) => {
                      const current = (formData[key] as string[]) || [];
                      handleChange(key, checked ? [...current, name] : current.filter((f) => f !== name));
                    }}
                  />
                  <Label htmlFor={`${key}-${name}`} className="text-xs cursor-pointer">{name}</Label>
                </div>
              );
            })}
          </div>
        </div>
      ))}

      <div className="space-y-1">
        <div className="flex items-center gap-2">
          <Checkbox
            id="includeContext"
            checked={!!formData.includeContext}
            onCheckedChange={(v) => handleChange('includeContext', v)}
          />
          <Label htmlFor="includeContext" className="text-xs cursor-pointer">Incluir Contexto do Fluxo</Label>
        </div>
        <div className="flex items-center gap-2">
          <Checkbox
            id="fullData"
            checked={!!formData.fullData}
            onCheckedChange={(v) => handleChange('fullData', v)}
          />
          <Label htmlFor="fullData" className="text-xs cursor-pointer">Enviar todos os dados (Contato, Ticket, Pipeline)</Label>
        </div>
      </div>
    </div>
  );

  const renderAPIForm = () => (
    <div className="space-y-3">
      <div className="space-y-1">
        <Label className="text-xs">Método</Label>
        <Select value={formData.method || 'GET'} onValueChange={(v) => handleChange('method', v)}>
          <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
          <SelectContent>
            {['GET', 'POST', 'PUT', 'DELETE', 'PATCH'].map((m) => (
              <SelectItem key={m} value={m}>{m}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-1">
        <Label className="text-xs">URL</Label>
        <Input className="h-8 text-xs" placeholder="https://api.exemplo.com/dados" value={formData.url || ''} onChange={(e) => handleChange('url', e.target.value)} />
      </div>

      <div className="space-y-1">
        <p className="text-xs font-medium">Headers (JSON)</p>
        <Textarea className="text-xs min-h-[60px]" placeholder='{ "Authorization": "Bearer 123" }' value={formData.headers || ''} onChange={(e) => handleChange('headers', e.target.value)} />
      </div>

      <div className="space-y-1">
        <p className="text-xs font-medium">Body (JSON)</p>
        <Textarea className="text-xs min-h-[100px]" placeholder='{ "id": "{{contact.id}}" }' value={formData.body || ''} onChange={(e) => handleChange('body', e.target.value)} />
      </div>

      <div className="space-y-1">
        <Label className="text-xs">Nome da Variável de Resultado</Label>
        <Input className="h-8 text-xs" placeholder="Ex: resultadoApi" value={formData.resultVariable || ''} onChange={(e) => handleChange('resultVariable', e.target.value)} />
        <p className="text-[10px] text-muted-foreground">O resultado será salvo em {`{{${formData.resultVariable || 'variavel'}}}`}</p>
      </div>
    </div>
  );

  const renderPipelineForm = () => (
    <div className="space-y-3">
      <p className="text-xs text-muted-foreground">Integração com Kanban/Pipelines (CRM).</p>

      <div className="space-y-1">
        <Label className="text-xs">Ação Kanban</Label>
        <Select value={formData.kanbanAction || 'createDeal'} onValueChange={(v) => handleChange('kanbanAction', v)}>
          <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="createDeal">Criar Oportunidade</SelectItem>
            <SelectItem value="moveDeal">Mover Oportunidade</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {formData.kanbanAction === 'createDeal' && (
        <>
          <div className="space-y-1">
            <Label className="text-xs">Título da Oportunidade</Label>
            <Input className="h-8 text-xs" placeholder="Use variáveis como {{contactName}}" value={formData.dealTitle || ''} onChange={(e) => handleChange('dealTitle', e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Valor (R$)</Label>
            <Input className="h-8 text-xs" placeholder="150.00" value={formData.dealValue || ''} onChange={(e) => handleChange('dealValue', e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Prioridade</Label>
            <Select value={formData.dealPriority || '1'} onValueChange={(v) => handleChange('dealPriority', v)}>
              <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="1">Baixa</SelectItem>
                <SelectItem value="2">Média</SelectItem>
                <SelectItem value="3">Alta</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </>
      )}

      <div className="space-y-1">
        <Label className="text-xs">Pipeline</Label>
        <Select value={formData.pipelineId || ''} onValueChange={(v) => handleChange('pipelineId', v)}>
          <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
          <SelectContent>
            {pipelines.map((p) => (
              <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-1">
        <Label className="text-xs">Etapa (Coluna)</Label>
        <Select
          value={formData.stageId || ''}
          onValueChange={(v) => handleChange('stageId', v)}
          disabled={!formData.pipelineId}
        >
          <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
          <SelectContent>
            {pipelines.find((p) => p.id === formData.pipelineId)?.stages?.map((s) => (
              <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );

  const renderKnowledgeForm = () => (
    <div className="space-y-3">
      <div className="space-y-1">
        <Label className="text-xs">Modo de Resposta</Label>
        <Select value={formData.responseMode || 'auto'} onValueChange={(v) => handleChange('responseMode', v)}>
          <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="auto">Resposta Automática (IA)</SelectItem>
            <SelectItem value="suggest">Sugestão para Atendente</SelectItem>
            <SelectItem value="search">Apenas Busca</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-1">
        <Label className="text-xs">Base de Conhecimento</Label>
        <Select value={formData.knowledgeBaseId || ''} onValueChange={(v) => handleChange('knowledgeBaseId', v)}>
          <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value=""><em>Selecione</em></SelectItem>
            {knowledgeBases.map((kb) => (
              <SelectItem key={kb.id} value={kb.id}>{kb.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );

  const renderHelpdeskForm = () => (
    <div className="space-y-3">
      <div className="space-y-1">
        <Label className="text-xs">Ação do Helpdesk</Label>
        <Select value={formData.helpdeskAction || 'createProtocol'} onValueChange={(v) => handleChange('helpdeskAction', v)}>
          <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="createProtocol">Criar Protocolo</SelectItem>
            <SelectItem value="checkStatus">Verificar Status</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {formData.helpdeskAction === 'createProtocol' && (
        <>
          <div className="space-y-1">
            <Label className="text-xs">Assunto</Label>
            <Input className="h-8 text-xs" placeholder="Protocolo via Fluxo" value={formData.subject || ''} onChange={(e) => handleChange('subject', e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Descrição</Label>
            <Textarea className="text-xs min-h-[60px]" placeholder="Detalhes do protocolo..." value={formData.description || ''} onChange={(e) => handleChange('description', e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Prioridade</Label>
            <Select value={formData.priority || 'medium'} onValueChange={(v) => handleChange('priority', v)}>
              <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="low">Baixa</SelectItem>
                <SelectItem value="medium">Média</SelectItem>
                <SelectItem value="high">Alta</SelectItem>
                <SelectItem value="urgent">Urgente</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Categoria</Label>
            <Input className="h-8 text-xs" placeholder="Fluxo Automatizado" value={formData.category || ''} onChange={(e) => handleChange('category', e.target.value)} />
          </div>
        </>
      )}
    </div>
  );

  const renderEndForm = () => (
    <div className="space-y-3">
      <div className="space-y-1">
        <Label className="text-xs">Ação de Finalização</Label>
        <Select value={formData.endAction || 'none'} onValueChange={(v) => handleChange('endAction', v)}>
          <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="none">Apenas Finalizar</SelectItem>
            <SelectItem value="closeTicket">Fechar Ticket</SelectItem>
            <SelectItem value="transferQueue">Transferir para Fila</SelectItem>
            <SelectItem value="sendMessage">Enviar Mensagem Final</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {formData.endAction === 'sendMessage' && (
        <Textarea
          className="text-xs min-h-[60px]"
          placeholder="Obrigado pelo contato!"
          value={formData.endMessage || ''}
          onChange={(e) => handleChange('endMessage', e.target.value)}
        />
      )}
    </div>
  );

  const renderDatabaseForm = () => {
    const availableTables = ['Contacts', 'Tickets', 'Messages', 'Users', 'Queues', 'Whatsapps', 'QuickAnswers', 'Pipelines'];
    const tableFields = TABLE_ALL_FIELDS[formData.tableName || ''] || [];

    return (
      <div className="space-y-3">
        <div className="space-y-1">
          <Label className="text-xs">Operação</Label>
          <Select value={formData.operation || 'read'} onValueChange={(v) => handleChange('operation', v)}>
            <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="read">READ - Buscar dados</SelectItem>
              <SelectItem value="update">UPDATE - Atualizar registro</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1">
          <Label className="text-xs">Tabela</Label>
          <Select
            value={formData.tableName || ''}
            onValueChange={(v) => {
              handleChange('tableName', v);
              handleChange('filters', []);
              handleChange('dataFields', []);
              handleChange('selectedFields', []);
            }}
          >
            <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              {availableTables.map((t) => (
                <SelectItem key={t} value={t}>{t}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {formData.tableName && (
          <FilterBuilder
            filters={formData.filters || []}
            onChange={(f) => handleChange('filters', f)}
            tableName={formData.tableName}
          />
        )}

        {formData.operation === 'update' && formData.tableName && (
          <DataBuilder
            dataFields={formData.dataFields || []}
            onChange={(f) => handleChange('dataFields', f)}
            tableName={formData.tableName}
          />
        )}

        {formData.operation === 'read' && formData.tableName && (
          <div className="space-y-1">
            <p className="text-xs font-medium text-muted-foreground">Campos a retornar</p>
            <div className="flex flex-wrap gap-x-3 gap-y-1">
              {tableFields.map((field) => (
                <div key={field} className="flex items-center gap-1">
                  <Checkbox
                    id={`field-${field}`}
                    checked={(formData.selectedFields || []).includes(field)}
                    onCheckedChange={(checked) => {
                      const current = formData.selectedFields || [];
                      handleChange('selectedFields', checked ? [...current, field] : current.filter((f) => f !== field));
                    }}
                  />
                  <Label htmlFor={`field-${field}`} className="text-xs cursor-pointer">{field}</Label>
                </div>
              ))}
            </div>
          </div>
        )}

        {formData.operation === 'read' && formData.tableName && (
          <div className="flex gap-2">
            <div className="space-y-1 w-[90px]">
              <Label className="text-xs">Limite</Label>
              <Select value={String(formData.limit || 10)} onValueChange={(v) => handleChange('limit', Number(v))}>
                <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {[1, 5, 10, 25, 50].map((n) => (
                    <SelectItem key={n} value={String(n)}>{n}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1 flex-1">
              <Label className="text-xs">Ordenar por</Label>
              <Select value={formData.orderByField || 'createdAt'} onValueChange={(v) => handleChange('orderByField', v)}>
                <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {tableFields.map((f) => (
                    <SelectItem key={f} value={f}>{f}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1 w-[80px]">
              <Label className="text-xs">Direção</Label>
              <Select value={formData.orderByDir || 'DESC'} onValueChange={(v) => handleChange('orderByDir', v)}>
                <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="ASC">ASC ↑</SelectItem>
                  <SelectItem value="DESC">DESC ↓</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        )}

        <div className="space-y-1">
          <Label className="text-xs">Variável de saída</Label>
          <Input
            className="h-8 text-xs"
            placeholder="resultado"
            value={formData.outputVariable || ''}
            onChange={(e) => handleChange('outputVariable', e.target.value.replace(/[^a-zA-Z0-9_]/g, ''))}
          />
          <p className="text-[10px] text-muted-foreground">Nome da variável (apenas letras, números e _)</p>
        </div>
      </div>
    );
  };

  const renderFilterForm = () => {
    const filterConditions = formData.filterConditions || [];

    const addFilterCondition = () => {
      handleChange('filterConditions', [
        ...filterConditions,
        { id: Date.now(), field: 'name', operator: 'contains', value: '' },
      ]);
    };

    const removeFilterCondition = (id: number) => {
      handleChange('filterConditions', filterConditions.filter((c) => c.id !== id));
    };

    const updateFilterCondition = (id: number, key: string, value: string) => {
      handleChange(
        'filterConditions',
        filterConditions.map((c) => (c.id === id ? { ...c, [key]: value } : c)),
      );
    };

    const needsValue = (operator: string) => !['isEmpty', 'isNotEmpty'].includes(operator);

    return (
      <div className="space-y-3">
        <p className="text-xs text-muted-foreground">
          Este nó recebe dados de uma variável, aplica filtros e entrega o resultado filtrado para o próximo nó.
        </p>

        <div className="space-y-1">
          <Label className="text-xs">Variável de entrada</Label>
          <Input
            className="h-8 text-xs"
            placeholder="dados"
            value={formData.inputVariable || ''}
            onChange={(e) => handleChange('inputVariable', e.target.value.replace(/[^a-zA-Z0-9_]/g, ''))}
          />
          <p className="text-[10px] text-muted-foreground">Nome da variável que contém os dados</p>
        </div>

        <div className="space-y-2">
          <p className="text-xs font-medium">Condições de Filtro</p>
          {filterConditions.map((condition, index) => (
            <div key={condition.id} className="flex flex-wrap gap-1 items-center">
              {index > 0 && (
                <Select value={condition.logic ?? 'AND'} onValueChange={(v) => updateFilterCondition(condition.id, 'logic', v)}>
                  <SelectTrigger className="w-[70px] h-8 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="AND">E</SelectItem>
                    <SelectItem value="OR">OU</SelectItem>
                  </SelectContent>
                </Select>
              )}

              <Select value={condition.field || 'name'} onValueChange={(v) => updateFilterCondition(condition.id, 'field', v)}>
                <SelectTrigger className="w-[110px] h-8 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {FILTERABLE_FIELDS.map((f) => (
                    <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={condition.operator || 'contains'} onValueChange={(v) => updateFilterCondition(condition.id, 'operator', v)}>
                <SelectTrigger className="w-[120px] h-8 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {FILTER_OPERATORS_NODE.map((op) => (
                    <SelectItem key={op.value} value={op.value}>{op.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {needsValue(condition.operator) && (
                <Input
                  className="flex-1 min-w-[100px] h-8 text-xs"
                  placeholder="Valor"
                  value={condition.value || ''}
                  onChange={(e) => updateFilterCondition(condition.id, 'value', e.target.value)}
                />
              )}

              <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => removeFilterCondition(condition.id)}>
                <Trash2 className="h-3 w-3" />
              </Button>
            </div>
          ))}

          <Button size="sm" variant="ghost" className="h-7 text-xs gap-1" onClick={addFilterCondition}>
            <Plus className="h-3 w-3" /> Adicionar Condição
          </Button>
        </div>

        <div className="space-y-1">
          <Label className="text-xs">Variável de saída</Label>
          <Input
            className="h-8 text-xs"
            placeholder="filtrado"
            value={formData.outputVariable || ''}
            onChange={(e) => handleChange('outputVariable', e.target.value.replace(/[^a-zA-Z0-9_]/g, ''))}
          />
        </div>
      </div>
    );
  };

  const renderForm = () => {
    switch (node.type) {
      case 'start':
      case 'input':
        return renderStartForm();
      case 'trigger':
        return renderTriggerForm();
      case 'message':
        return renderMessageForm();
      case 'menu':
        return renderMenuForm();
      case 'switch':
        return renderSwitchForm();
      case 'pipeline':
        return renderPipelineForm();
      case 'ticket':
        return renderTicketForm();
      case 'webhook':
        return renderWebhookForm();
      case 'knowledge':
        return renderKnowledgeForm();
      case 'database':
        return renderDatabaseForm();
      case 'filter':
        return renderFilterForm();
      case 'api':
        return renderAPIForm();
      case 'helpdesk':
        return renderHelpdeskForm();
      case 'end':
      case 'output':
        return renderEndForm();
      default:
        return <p className="text-xs text-muted-foreground">Tipo de nó desconhecido</p>;
    }
  };

  return (
    <Sheet open={open} onOpenChange={(v) => !v && onClose()}>
      <SheetContent side="right" className="w-[380px] p-0 overflow-hidden flex flex-col">
        <SheetHeader className="px-4 py-3 border-b flex-row items-center justify-between space-y-0">
          <SheetTitle className="text-sm">
            {NODE_TITLES[node.type] || 'Configurar Nó'}
          </SheetTitle>
          <Button size="icon" variant="ghost" className="h-7 w-7" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* Título comum a todos os nós */}
          <div className="space-y-1">
            <Label className="text-xs">Título do Nó</Label>
            <Input
              className="h-8 text-xs"
              placeholder={NODE_TITLES[node.type]?.replace('Configurar ', '') || 'Título'}
              value={formData.label || ''}
              onChange={(e) => handleChange('label', e.target.value)}
            />
            <p className="text-[10px] text-muted-foreground">Nome exibido abaixo do ícone do nó</p>
          </div>

          {/* Form específico por tipo */}
          {renderForm()}

          {/* Actions */}
          <div className="space-y-2 pt-2">
            <Button className="w-full" onClick={handleSave}>
              Salvar Configurações
            </Button>
            <Button
              variant="outline"
              className="w-full text-destructive border-destructive hover:bg-destructive/10 gap-2"
              onClick={() => {
                if (window.confirm('Tem certeza que deseja excluir este nó?')) {
                  onDelete(node.id);
                }
              }}
            >
              <Trash2 className="h-4 w-4" />
              Excluir Nó
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default NodeEditorSidebar;
