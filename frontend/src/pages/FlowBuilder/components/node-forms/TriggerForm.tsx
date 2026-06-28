import React from 'react';
import { Label } from '@/components/ui/label';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import ConditionBuilder from '../ConditionBuilder';
import { NodeData } from '../../nodeEditorTypes';

interface TriggerFormProps {
  formData: NodeData;
  onChange: (field: string, value: unknown) => void;
  connections?: { id: number | string; name: string }[];
}

const TriggerForm: React.FC<TriggerFormProps> = ({ formData, onChange, connections = [] }) => (
  <div className="space-y-3">
    <div className="space-y-1">
      <Label className="text-xs">Tipo de Gatilho</Label>
      <Select value={formData.triggerType || 'keyword'} onValueChange={(v) => onChange('triggerType', v)}>
        <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
        <SelectContent>
          <SelectItem value="keyword">Palavra-chave</SelectItem>
          <SelectItem value="any">Qualquer Mensagem</SelectItem>
          <SelectItem value="firstContact">Primeiro Contato</SelectItem>
        </SelectContent>
      </Select>
    </div>

    <div className="space-y-1">
      <Label className="text-xs">Conexão</Label>
      <Select
        value={formData.whatsappId || 'all'}
        onValueChange={(v) => onChange('whatsappId', v === 'all' ? undefined : v)}
      >
        <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Todas as conexões</SelectItem>
          {connections.map((c) => (
            <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>
          ))}
        </SelectContent>
      </Select>
      <p className="text-[11px] text-muted-foreground">
        Amarre o gatilho a uma conexão: só dispara para mensagens dela (ex.: um agente que atende uma conexão específica).
      </p>
    </div>

    {formData.triggerType === 'keyword' && (
      <div className="space-y-1 pt-2">
        <p className="text-xs font-medium text-muted-foreground">Condição de Ativação</p>
        <ConditionBuilder
          conditions={formData.conditions || []}
          onChange={(c) => onChange('conditions', c)}
          title=""
          maxConditions={3}
        />
      </div>
    )}
  </div>
);

export default TriggerForm;
