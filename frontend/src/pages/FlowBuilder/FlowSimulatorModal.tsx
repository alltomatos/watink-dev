import React, { useState, useRef, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  Play,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Send,
  X,
  Circle,
} from 'lucide-react';
import { cn } from '@/lib/utils';

// ─── Types ────────────────────────────────────────────────────────────────────

interface SimMessage {
  type: 'user' | 'bot';
  content: string;
  options?: string[];
  timestamp?: string;
}

interface LogEntry {
  status: 'success' | 'error' | 'warning' | 'pending';
  nodeLabel: string;
  action?: string;
  message?: string;
}

interface SimResult {
  success: boolean;
  error?: string;
  log?: LogEntry[];
  responses?: SimMessage[];
  finalContext?: Record<string, unknown>;
  flowType?: 'chat' | 'automation';
}

interface FlowSimulatorModalProps {
  open: boolean;
  onClose: () => void;
  flowId?: string;
  flowName?: string;
  onSimulate: (flowId: string, message: string) => Promise<SimResult>;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const formatTime = (ts?: string) => {
  if (!ts) return '';
  return new Date(ts).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
};

const LogIcon: React.FC<{ status: LogEntry['status'] }> = ({ status }) => {
  const cls = 'w-4 h-4 mt-0.5 shrink-0';
  switch (status) {
    case 'success': return <CheckCircle2 className={cn(cls, 'text-[#4caf50]')} />;
    case 'error': return <XCircle className={cn(cls, 'text-[#f44336]')} />;
    case 'warning': return <AlertTriangle className={cn(cls, 'text-[#ff9800]')} />;
    default: return <Circle className={cn(cls, 'text-[#2196f3]')} />;
  }
};

const logItemBg: Record<LogEntry['status'], string> = {
  success: 'bg-white border-border',
  error: 'bg-white border-red-200',
  warning: 'bg-white border-yellow-200',
  pending: 'bg-white border-border',
};

// ─── Component ────────────────────────────────────────────────────────────────

const FlowSimulatorModal: React.FC<FlowSimulatorModalProps> = ({
  open,
  onClose,
  flowId,
  flowName,
  onSimulate,
}) => {
  const [testMessage, setTestMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<SimResult | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [result?.responses]);

  const handleSimulate = async () => {
    if (!testMessage.trim() || !flowId) return;
    setLoading(true);
    try {
      const response = await onSimulate(flowId, testMessage);
      setResult(response);
      setTestMessage('');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erro ao simular fluxo';
      setResult({ success: false, error: msg, log: [], responses: [] });
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSimulate();
    }
  };

  const handleClose = () => {
    setResult(null);
    setTestMessage('');
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && handleClose()}>
      <DialogContent className="max-w-[900px] w-full h-[80vh] p-0 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-2 border-b shrink-0">
          <div className="flex items-center gap-2">
            <Play className="w-5 h-5 text-primary" />
            <h2 className="text-base font-semibold">Simular: {flowName}</h2>
            {result?.flowType && (
              <Badge variant="secondary" className="text-[11px]">
                {result.flowType === 'chat' ? 'Chat' : 'Automação'}
              </Badge>
            )}
          </div>
          <Button size="icon" variant="ghost" className="h-7 w-7" onClick={handleClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Body */}
        <div className="flex flex-1 overflow-hidden">
          {/* Chat area */}
          <div className="flex flex-col flex-1 border-r overflow-hidden">
            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 bg-[#f5f7fb] space-y-2">
              {!result && !loading && (
                <div className="flex flex-col items-center justify-center h-full text-muted-foreground gap-2">
                  <Play className="w-12 h-12 opacity-30" />
                  <p className="text-sm">Digite uma mensagem para iniciar a simulação</p>
                </div>
              )}

              {loading && (
                <div className="flex flex-col items-center justify-center h-full text-muted-foreground gap-2">
                  <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                  <p className="text-sm">Simulando fluxo...</p>
                </div>
              )}

              {result?.responses?.map((msg, idx) => (
                <div
                  key={idx}
                  className={cn(
                    'max-w-[80%] px-3 py-2 rounded-xl shadow-sm',
                    msg.type === 'user'
                      ? 'ml-auto bg-[#dcf8c6] rounded-br-sm'
                      : 'mr-auto bg-white rounded-bl-sm shadow-sm',
                  )}
                >
                  <p className="text-sm break-words">{msg.content}</p>
                  {msg.options && msg.options.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {msg.options.map((opt, i) => (
                        <Badge
                          key={i}
                          variant="outline"
                          className="cursor-pointer hover:bg-primary hover:text-primary-foreground text-xs"
                          onClick={() => setTestMessage(opt)}
                        >
                          {opt}
                        </Badge>
                      ))}
                    </div>
                  )}
                  <p className="text-[10px] text-muted-foreground mt-1 text-right">
                    {formatTime(msg.timestamp)}
                  </p>
                </div>
              ))}

              {result && !result.success && (
                <div className="max-w-[80%] mr-auto px-3 py-2 rounded-xl bg-red-50 border border-red-200">
                  <p className="text-sm text-destructive">❌ {result.error}</p>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div className="flex items-center gap-2 p-3 border-t bg-white shrink-0">
              <Input
                className="h-9 text-sm"
                placeholder="Digite uma mensagem para simular..."
                value={testMessage}
                onChange={(e) => setTestMessage(e.target.value)}
                onKeyDown={handleKeyDown}
                disabled={loading}
              />
              <Button
                size="icon"
                className="h-9 w-9 shrink-0"
                onClick={handleSimulate}
                disabled={loading || !testMessage.trim()}
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Logs sidebar */}
          <div className="w-[320px] flex flex-col bg-[#fafafa] overflow-hidden shrink-0">
            <div className="px-4 py-3 border-b font-semibold text-sm shrink-0">
              Logs de Execução
            </div>

            <div className="flex-1 overflow-y-auto p-2 space-y-1">
              {(!result?.log || result.log.length === 0) && (
                <p className="text-xs text-muted-foreground text-center pt-4">Nenhum log ainda</p>
              )}
              {result?.log?.map((log, idx) => (
                <div
                  key={idx}
                  className={cn(
                    'flex items-start gap-2 p-2 rounded border text-xs',
                    logItemBg[log.status],
                  )}
                >
                  <LogIcon status={log.status} />
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-[var(--text-primary)] truncate">{log.nodeLabel}</p>
                    <p className="text-muted-foreground">{log.action || log.message}</p>
                  </div>
                </div>
              ))}
            </div>

            {result?.finalContext && (
              <>
                <Separator />
                <div className="p-3 max-h-[150px] overflow-y-auto bg-[#f0f0f0] text-[11px] font-mono shrink-0">
                  <p className="font-semibold mb-1">Contexto Final</p>
                  <pre className="whitespace-pre-wrap">{JSON.stringify(result.finalContext, null, 2)}</pre>
                </div>
              </>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default FlowSimulatorModal;
