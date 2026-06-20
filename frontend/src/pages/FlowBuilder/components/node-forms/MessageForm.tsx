import React from 'react';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { NodeData } from '../../nodeEditorTypes';

interface MessageFormProps {
  formData: NodeData;
  onChange: (field: string, value: unknown) => void;
}

const MessageForm: React.FC<MessageFormProps> = ({ formData, onChange }) => (
  <div className="space-y-3">
    <div className="space-y-1">
      <Label className="text-xs">Tipo de Conteúdo</Label>
      <Select value={formData.contentType || 'text'} onValueChange={(v) => onChange('contentType', v)}>
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
        onChange={(e) => onChange('content', e.target.value)}
      />
    ) : (
      <Input
        className="h-8 text-xs"
        placeholder="https://..."
        value={formData.mediaUrl || ''}
        onChange={(e) => onChange('mediaUrl', e.target.value)}
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
            onClick={() => onChange('content', `${formData.content || ''} ${v}`)}
          >
            {v.replace(/\{\{|\}\}/g, '')}
          </Button>
        ))}
      </div>
    </div>
  </div>
);

export default MessageForm;
