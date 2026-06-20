import { useState, useRef, useEffect } from 'react';
import type { SimResult } from '../components/simulator/SimulatorTypes';

// ─── useFlowSimulator ─────────────────────────────────────────────────────────

interface UseFlowSimulatorOptions {
  flowId?: string;
  onSimulate: (flowId: string, message: string) => Promise<SimResult>;
  onClose: () => void;
}

export function useFlowSimulator({ flowId, onSimulate, onClose }: UseFlowSimulatorOptions) {
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

  return {
    testMessage,
    setTestMessage,
    loading,
    result,
    messagesEndRef,
    handleSimulate,
    handleKeyDown,
    handleClose,
  };
}
