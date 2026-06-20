import React from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Play, X } from 'lucide-react';
import { useFlowSimulator } from './hooks/useFlowSimulator';
import SimulatorChatArea from './components/simulator/SimulatorChatArea';
import SimulatorLogsSidebar from './components/simulator/SimulatorLogsSidebar';
import type { FlowSimulatorModalProps } from './components/simulator/SimulatorTypes';

// ─── FlowSimulatorModal (orchestrator) ───────────────────────────────────────

const FlowSimulatorModal: React.FC<FlowSimulatorModalProps> = ({
  open,
  onClose,
  flowId,
  flowName,
  onSimulate,
}) => {
  const {
    testMessage,
    setTestMessage,
    loading,
    result,
    messagesEndRef,
    handleSimulate,
    handleKeyDown,
    handleClose,
  } = useFlowSimulator({ flowId, onSimulate, onClose });

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
          <SimulatorChatArea
            result={result}
            loading={loading}
            testMessage={testMessage}
            messagesEndRef={messagesEndRef}
            onMessageChange={setTestMessage}
            onSend={handleSimulate}
            onKeyDown={handleKeyDown}
          />
          <SimulatorLogsSidebar result={result} />
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default FlowSimulatorModal;
