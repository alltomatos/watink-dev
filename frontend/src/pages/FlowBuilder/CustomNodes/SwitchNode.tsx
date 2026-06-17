import React from 'react';
import { Handle, Position } from 'reactflow';
import { GitBranch } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface SwitchNodeProps {
  data: Record<string, unknown>;
  isConnectable?: boolean;
}

const SwitchNode: React.FC<SwitchNodeProps> = ({ data, isConnectable }) => {
  const label = (data?.label as string) || 'Decisão';
  const conditionCount = (data?.conditionsA as unknown[])?.length ?? 0;

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="group flex flex-col items-center min-w-[80px] max-w-[100px] cursor-pointer">
            {/* Target handle — entrada */}
            <Handle
              type="target"
              position={Position.Left}
              isConnectable={isConnectable}
              className="w-[8px] h-[8px] border-2 border-[var(--bg-surface)] shadow-sm"
              style={{ background: 'var(--border-default)', left: -4 }}
            />

            {/* Node card */}
            <div className="relative w-[50px] h-[50px] rounded-[12px] flex items-center justify-center transition-all duration-200 shadow-[0_4px_12px_var(--shadow-strong)] bg-gradient-to-br from-[var(--brand-purple)] to-[var(--brand-purple-dark)] group-hover:scale-105">
              <GitBranch className="text-[var(--bg-surface)] w-6 h-6" />
            </div>

            {/* Label */}
            <p className="mt-[6px] text-[11px] font-medium text-[var(--text-primary)] text-center max-w-[90px] overflow-hidden text-ellipsis whitespace-nowrap">
              {label}
            </p>
            {conditionCount > 0 && (
              <p className="text-[9px] text-[var(--text-secondary)] text-center mt-[2px]">
                {conditionCount} condição(ões)
              </p>
            )}

            {/* Source handle A — True (verde) */}
            <Handle
              type="source"
              position={Position.Right}
              id="a"
              isConnectable={isConnectable}
              className="w-[8px] h-[8px] border-2 border-[var(--bg-surface)] shadow-sm"
              style={{ background: 'var(--status-success)', right: -4, top: '30%' }}
            />

            {/* Source handle B — False (vermelho) */}
            <Handle
              type="source"
              position={Position.Right}
              id="b"
              isConnectable={isConnectable}
              className="w-[8px] h-[8px] border-2 border-[var(--bg-surface)] shadow-sm"
              style={{ background: 'var(--status-error)', right: -4, top: '70%' }}
            />

            {/* Labels dos handles */}
            <div className="absolute right-[-20px] flex flex-col justify-between h-[40px] top-[5px] pointer-events-none">
              <span className="text-[8px] font-bold text-[var(--status-success)]">✓</span>
              <span className="text-[8px] font-bold text-[var(--status-error)]">✗</span>
            </div>
          </div>
        </TooltipTrigger>
        <TooltipContent side="top">{label}</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};

export default SwitchNode;
