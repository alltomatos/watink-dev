import React from 'react';
import { X, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Sheet, SheetContent, SheetHeader, SheetTitle,
} from '@/components/ui/sheet';
import api from '../../services/api';

import {
  NodeEditorSidebarProps, NodeData, Pipeline, Queue, User, KnowledgeBase, NODE_TITLES,
} from './nodeEditorTypes';

import StartForm from './components/node-forms/StartForm';
import TriggerForm from './components/node-forms/TriggerForm';
import MessageForm from './components/node-forms/MessageForm';
import MenuForm from './components/node-forms/MenuForm';
import SwitchForm from './components/node-forms/SwitchForm';
import TicketForm from './components/node-forms/TicketForm';
import WebhookForm from './components/node-forms/WebhookForm';
import ApiForm from './components/node-forms/ApiForm';
import PipelineForm from './components/node-forms/PipelineForm';
import KnowledgeForm from './components/node-forms/KnowledgeForm';
import AgentForm from './components/node-forms/AgentForm';
import HelpdeskForm from './components/node-forms/HelpdeskForm';
import EndForm from './components/node-forms/EndForm';
import DatabaseForm from './components/node-forms/DatabaseForm';
import FilterForm from './components/node-forms/FilterForm';

const NodeEditorSidebar: React.FC<NodeEditorSidebarProps> = ({
  open, node, onClose, onSave, onDelete,
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
      api.get('/pipelines').then((res) => setPipelines(res.data)).catch(() => {});
    }
    if (node.type === 'ticket') {
      api.get('/queue').then((res) => setQueues(res.data)).catch(() => {});
      api.get('/users').then((res) => setUsers(res.data.users)).catch(() => {});
    }
    if (node.type === 'knowledge' || node.type === 'agent') {
      api.get('/knowledge-bases').then((res) => setKnowledgeBases(res.data)).catch(() => {});
    }
  }, [node]);

  if (!node) return null;

  const handleChange = (field: string, value: unknown) =>
    setFormData((prev) => ({ ...prev, [field]: value }));

  const renderForm = () => {
    const props = { formData, onChange: handleChange };
    switch (node.type) {
      case 'start':
      case 'input':
        return <StartForm {...props} />;
      case 'trigger':
        return <TriggerForm {...props} />;
      case 'message':
        return <MessageForm {...props} />;
      case 'menu':
        return <MenuForm {...props} />;
      case 'switch':
        return <SwitchForm {...props} />;
      case 'pipeline':
        return <PipelineForm {...props} pipelines={pipelines} />;
      case 'ticket':
        return <TicketForm {...props} queues={queues} users={users} />;
      case 'webhook':
        return <WebhookForm {...props} />;
      case 'knowledge':
        return <KnowledgeForm {...props} knowledgeBases={knowledgeBases} />;
      case 'agent':
        return <AgentForm {...props} knowledgeBases={knowledgeBases} />;
      case 'database':
        return <DatabaseForm {...props} />;
      case 'filter':
        return <FilterForm {...props} />;
      case 'api':
        return <ApiForm {...props} />;
      case 'helpdesk':
        return <HelpdeskForm {...props} />;
      case 'end':
      case 'output':
        return <EndForm {...props} />;
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

          {renderForm()}

          <div className="space-y-2 pt-2">
            <Button className="w-full" onClick={() => onSave(node.id, formData)}>
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
