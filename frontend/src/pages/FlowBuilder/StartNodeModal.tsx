import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import api from '../../services/api';
import { toast } from 'react-toastify';

// ─── Types ────────────────────────────────────────────────────────────────────

interface Connection {
  id: string;
  name: string;
}

interface Pipeline {
  id: string;
  name: string;
  type?: string;
}

interface StartNodeData {
  triggerType: string;
  actionType: string | null;
  connectionId: string | null;
  connectionName: string | null;
  pipelineId: string | null;
  pipelineName: string | null;
}

interface StartNodeModalProps {
  open: boolean;
  onClose: () => void;
  onSave: (data: StartNodeData) => void;
  initialData?: Partial<StartNodeData>;
}

// ─── Component ────────────────────────────────────────────────────────────────

const StartNodeModal: React.FC<StartNodeModalProps> = ({ open, onClose, onSave, initialData }) => {
  const [triggerType, setTriggerType] = useState(initialData?.triggerType || 'time');
  const [actionType, setActionType] = useState(initialData?.actionType || 'message');
  const [connections, setConnections] = useState<Connection[]>([]);
  const [pipelines, setPipelines] = useState<Pipeline[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedConnection, setSelectedConnection] = useState(initialData?.connectionId || '');
  const [selectedPipeline, setSelectedPipeline] = useState(initialData?.pipelineId || '');

  useEffect(() => {
    if (!open) return;
    setTriggerType(initialData?.triggerType || 'time');
    setActionType(initialData?.actionType || 'message');
    setSelectedConnection(initialData?.connectionId || '');
    setSelectedPipeline(initialData?.pipelineId || '');

    const fetchData = async () => {
      setLoading(true);
      try {
        const [connectionsRes, pipelinesRes] = await Promise.all([
          api.get('/whatsapp'),
          api.get('/pipelines'),
        ]);
        setConnections(connectionsRes.data);
        setPipelines(pipelinesRes.data);
      } catch {
        toast.error('Erro ao carregar dados');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [open, initialData]);

  const handleSave = () => {
    const connectionName = connections.find((c) => c.id === selectedConnection)?.name ?? null;
    const pipelineName = pipelines.find((p) => p.id === selectedPipeline)?.name ?? null;

    onSave({
      triggerType,
      actionType: triggerType === 'action' ? actionType : null,
      connectionId: triggerType === 'action' && actionType === 'message' ? selectedConnection : null,
      connectionName: triggerType === 'action' && actionType === 'message' ? connectionName : null,
      pipelineId: triggerType === 'action' && (actionType === 'kanban' || actionType === 'funnel') ? selectedPipeline : null,
      pipelineName: triggerType === 'action' && (actionType === 'kanban' || actionType === 'funnel') ? pipelineName : null,
    });
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Configurar Gatilho Inicial</DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="flex justify-center items-center py-8">
            <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <div className="space-y-4 py-2">
            {/* Tipo de Gatilho */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">Tipo de Gatilho</Label>
              <RadioGroup value={triggerType} onValueChange={setTriggerType} className="space-y-1">
                <div className="flex items-center gap-2">
                  <RadioGroupItem value="time" id="time" />
                  <Label htmlFor="time" className="cursor-pointer text-sm">Tempo (Cronograma)</Label>
                </div>
                <div className="flex items-center gap-2">
                  <RadioGroupItem value="action" id="action" />
                  <Label htmlFor="action" className="cursor-pointer text-sm">Ação (Evento)</Label>
                </div>
              </RadioGroup>
            </div>

            {/* Sub-configuração para "Ação" */}
            {triggerType === 'action' && (
              <div className="ml-6 p-3 bg-muted/50 rounded-md space-y-3">
                <div className="space-y-1">
                  <Label className="text-xs">Tipo de Ação</Label>
                  <Select value={actionType} onValueChange={setActionType}>
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="message">Mensagem vinda de uma conexão</SelectItem>
                      <SelectItem value="kanban">Alteração num quadro Kanban</SelectItem>
                      <SelectItem value="funnel">Alteração num quadro Funil</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {actionType === 'message' && (
                  <div className="space-y-1">
                    <Label className="text-xs">Conexão (WhatsApp)</Label>
                    <Select value={selectedConnection} onValueChange={setSelectedConnection}>
                      <SelectTrigger className="h-8 text-xs">
                        <SelectValue placeholder="Todas as conexões" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value=""><em>Todas as conexões</em></SelectItem>
                        {connections.map((conn) => (
                          <SelectItem key={conn.id} value={conn.id}>{conn.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {(actionType === 'kanban' || actionType === 'funnel') && (
                  <div className="space-y-1">
                    <Label className="text-xs">Quadro / Funil</Label>
                    <Select value={selectedPipeline} onValueChange={setSelectedPipeline}>
                      <SelectTrigger className="h-8 text-xs">
                        <SelectValue placeholder="Selecione" />
                      </SelectTrigger>
                      <SelectContent>
                        {pipelines
                          .filter((p) =>
                            actionType === 'kanban'
                              ? p.type === 'kanban'
                              : p.type === 'funnel' || p.type === 'funil',
                          )
                          .map((p) => (
                            <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        <DialogFooter>
          <Button variant="destructive" onClick={onClose}>Cancelar</Button>
          <Button onClick={handleSave}>Salvar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default StartNodeModal;
