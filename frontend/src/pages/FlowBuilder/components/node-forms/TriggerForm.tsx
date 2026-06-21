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
}

const TriggerForm: React.FC<TriggerFormProps> = ({ formData, onChange }) => (
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
