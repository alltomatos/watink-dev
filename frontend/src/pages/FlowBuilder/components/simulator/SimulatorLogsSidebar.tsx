import React from 'react';
import { CheckCircle2, XCircle, AlertTriangle, Circle } from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import type { LogEntry, SimResult } from './SimulatorTypes';

// ─── Helpers ─────────────────────────────────────────────────────────────────

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

// ─── SimulatorLogsSidebar ────────────────────────────────────────────────────

interface SimulatorLogsSidebarProps {
  result: SimResult | null;
}

const SimulatorLogsSidebar: React.FC<SimulatorLogsSidebarProps> = ({ result }) => (
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
);

export default SimulatorLogsSidebar;
