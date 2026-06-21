import React from 'react';
import { Label } from '@/components/ui/label';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { NodeData, KnowledgeBase } from '../../nodeEditorTypes';

interface KnowledgeFormProps {
  formData: NodeData;
  knowledgeBases: KnowledgeBase[];
  onChange: (field: string, value: unknown) => void;
}

const KnowledgeForm: React.FC<KnowledgeFormProps> = ({ formData, knowledgeBases, onChange }) => (
  <div className="space-y-3">
    <div className="space-y-1">
      <Label className="text-xs">Modo de Resposta</Label>
      <Select value={formData.responseMode || 'auto'} onValueChange={(v) => onChange('responseMode', v)}>
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
      <Select value={formData.knowledgeBaseId || ''} onValueChange={(v) => onChange('knowledgeBaseId', v)}>
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

export default KnowledgeForm;
