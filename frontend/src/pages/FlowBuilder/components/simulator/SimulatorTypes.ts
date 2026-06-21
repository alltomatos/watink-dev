// ─── Simulator shared types ───────────────────────────────────────────────────

export interface SimMessage {
  type: 'user' | 'bot';
  content: string;
  options?: string[];
  timestamp?: string;
}

export interface LogEntry {
  status: 'success' | 'error' | 'warning' | 'pending';
  nodeLabel: string;
  action?: string;
  message?: string;
}

export interface SimResult {
  success: boolean;
  error?: string;
  log?: LogEntry[];
  responses?: SimMessage[];
  finalContext?: Record<string, unknown>;
  flowType?: 'chat' | 'automation';
}

export interface FlowSimulatorModalProps {
  open: boolean;
  onClose: () => void;
  flowId?: string;
  flowName?: string;
  onSimulate: (flowId: string, message: string) => Promise<SimResult>;
}
