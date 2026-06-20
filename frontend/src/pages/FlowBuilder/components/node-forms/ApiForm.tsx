import React from 'react';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { NodeData } from '../../nodeEditorTypes';

interface ApiFormProps {
  formData: NodeData;
  onChange: (field: string, value: unknown) => void;
}

const ApiForm: React.FC<ApiFormProps> = ({ formData, onChange }) => (
  <div className="space-y-3">
    <div className="space-y-1">
      <Label className="text-xs">Método</Label>
      <Select value={formData.method || 'GET'} onValueChange={(v) => onChange('method', v)}>
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
      <Input className="h-8 text-xs" placeholder="https://api.exemplo.com/dados" value={formData.url || ''} onChange={(e) => onChange('url', e.target.value)} />
    </div>

    <div className="space-y-1">
      <p className="text-xs font-medium">Headers (JSON)</p>
      <Textarea className="text-xs min-h-[60px]" placeholder='{ "Authorization": "Bearer 123" }' value={formData.headers || ''} onChange={(e) => onChange('headers', e.target.value)} />
    </div>

    <div className="space-y-1">
      <p className="text-xs font-medium">Body (JSON)</p>
      <Textarea className="text-xs min-h-[100px]" placeholder='{ "id": "{{contact.id}}" }' value={formData.body || ''} onChange={(e) => onChange('body', e.target.value)} />
    </div>

    <div className="space-y-1">
      <Label className="text-xs">Nome da Variável de Resultado</Label>
      <Input className="h-8 text-xs" placeholder="Ex: resultadoApi" value={formData.resultVariable || ''} onChange={(e) => onChange('resultVariable', e.target.value)} />
      <p className="text-[10px] text-muted-foreground">O resultado será salvo em {`{{${formData.resultVariable || 'variavel'}}}`}</p>
    </div>
  </div>
);

export default ApiForm;
