import React from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { NodeData } from '../../nodeEditorTypes';

interface StartFormProps {
  formData: NodeData;
  onChange: (field: string, value: unknown) => void;
}

const StartForm: React.FC<StartFormProps> = ({ formData, onChange }) => (
  <div className="space-y-3">
    <div className="space-y-1">
      <Label className="text-xs">Tipo de Gatilho</Label>
      <Select value={formData.triggerType || 'time'} onValueChange={(v) => onChange('triggerType', v)}>
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
        <Select value={formData.actionType || 'ticketCreated'} onValueChange={(v) => onChange('actionType', v)}>
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
        <Select value={formData.whatsappId || 'all'} onValueChange={(v) => onChange('whatsappId', v)}>
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
            onChange={(e) => onChange('webhookToken', e.target.value)}
          />
          <p className="text-[10px] text-muted-foreground">Token único para identificar este fluxo</p>
        </div>
      </div>
    )}
  </div>
);

export default StartForm;
