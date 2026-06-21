import React from 'react';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { NodeData } from '../../nodeEditorTypes';

interface HelpdeskFormProps {
  formData: NodeData;
  onChange: (field: string, value: unknown) => void;
}

const HelpdeskForm: React.FC<HelpdeskFormProps> = ({ formData, onChange }) => (
  <div className="space-y-3">
    <div className="space-y-1">
      <Label className="text-xs">Ação do Helpdesk</Label>
      <Select value={formData.helpdeskAction || 'createProtocol'} onValueChange={(v) => onChange('helpdeskAction', v)}>
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
          <Input className="h-8 text-xs" placeholder="Protocolo via Fluxo" value={formData.subject || ''} onChange={(e) => onChange('subject', e.target.value)} />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Descrição</Label>
          <Textarea className="text-xs min-h-[60px]" placeholder="Detalhes do protocolo..." value={formData.description || ''} onChange={(e) => onChange('description', e.target.value)} />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Prioridade</Label>
          <Select value={formData.priority || 'medium'} onValueChange={(v) => onChange('priority', v)}>
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
          <Input className="h-8 text-xs" placeholder="Fluxo Automatizado" value={formData.category || ''} onChange={(e) => onChange('category', e.target.value)} />
        </div>
      </>
    )}
  </div>
);

export default HelpdeskForm;
