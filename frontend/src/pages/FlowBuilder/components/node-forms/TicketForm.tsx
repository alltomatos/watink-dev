import React from 'react';
import { Label } from '@/components/ui/label';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { NodeData, Queue, User } from '../../nodeEditorTypes';

interface TicketFormProps {
  formData: NodeData;
  queues: Queue[];
  users: User[];
  onChange: (field: string, value: unknown) => void;
}

const TicketForm: React.FC<TicketFormProps> = ({ formData, queues, users, onChange }) => (
  <div className="space-y-3">
    <div className="space-y-1">
      <Label className="text-xs">Ação do Ticket</Label>
      <Select value={formData.ticketAction || 'moveToQueue'} onValueChange={(v) => onChange('ticketAction', v)}>
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
        <Select value={formData.newStatus || 'open'} onValueChange={(v) => onChange('newStatus', v)}>
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
        <Select value={formData.queueId || ''} onValueChange={(v) => onChange('queueId', v)}>
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
        <Select value={formData.userId || ''} onValueChange={(v) => onChange('userId', v)}>
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

export default TicketForm;
