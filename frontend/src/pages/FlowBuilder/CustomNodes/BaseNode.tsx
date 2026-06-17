import React from 'react';
import { Handle, Position } from 'reactflow';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

// Color gradient map — mirrors the original makeStyles token set
const COLOR_MAP: Record<string, string> = {
  colorTrigger: 'bg-gradient-to-b from-[var(--status-success)] to-[var(--emerald-700)]',
  colorMessage: 'bg-gradient-to-b from-[var(--action-primary)] to-[var(--action-primary-active)]',
  colorMenu: 'bg-gradient-to-b from-[var(--status-warning)] to-[var(--amber-700)]',
  colorSwitch: 'bg-gradient-to-b from-[var(--violet-400)] to-[var(--violet-800)]',
  colorDatabase: 'bg-gradient-to-b from-[var(--slate-500)] to-[var(--slate-800)]',
  colorFilter: 'bg-gradient-to-b from-[var(--status-info)] to-[var(--google-blue)]',
  colorPipeline: 'bg-gradient-to-b from-[var(--google-blue)] to-[var(--blue-400)]',
  colorWebhook: 'bg-gradient-to-b from-[var(--status-error)] to-[var(--red-700)]',
  colorApi: 'bg-gradient-to-b from-[var(--status-info)] to-[var(--google-blue)]',
  colorKnowledge: 'bg-gradient-to-b from-[var(--google-pink)] to-[var(--red-700)]',
  colorEnd: 'bg-gradient-to-b from-[var(--status-error)] to-[var(--red-700)]',
  colorDefault: 'bg-gradient-to-b from-[var(--slate-500)] to-[var(--slate-700)]',
  colorTicket: 'bg-gradient-to-b from-[var(--google-pink)] to-[var(--red-700)]',
  colorHelpdesk: 'bg-gradient-to-b from-[var(--emerald-600)] to-[var(--emerald-800)]',
};

export interface HandleConfig {
  id?: string | null;
  position: Position;
  style?: React.CSSProperties;
}

interface BaseNodeProps {
  data: Record<string, unknown>;
  icon?: React.ElementType;
  colorClass?: string;
  defaultLabel?: string;
  sublabel?: string;
  isConnectable?: boolean;
  sourceHandles?: HandleConfig[];
  targetHandles?: HandleConfig[];
  badge?: string | number | null;
}

const handlePositionClass: Partial<Record<Position, string>> = {
  [Position.Left]: '-left-[5px]',
  [Position.Right]: '-right-[5px]',
  [Position.Top]: '-top-[5px]',
  [Position.Bottom]: '-bottom-[5px]',
};

const BaseNode: React.FC<BaseNodeProps> = ({
  data,
  icon: Icon,
  colorClass = 'colorDefault',
  defaultLabel = 'Nó',
  sublabel = '',
  isConnectable = true,
  sourceHandles = [{ id: null, position: Position.Right }],
  targetHandles = [{ id: null, position: Position.Left }],
  badge = null,
}) => {
  const label = (data?.label as string) || defaultLabel;
  const displaySublabel = sublabel || (data?.sublabel as string) || '';
  const gradientClass = COLOR_MAP[colorClass] ?? COLOR_MAP.colorDefault;

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="group flex flex-col items-center min-w-[80px] max-w-[100px] cursor-pointer">
            {/* Target handles */}
            {targetHandles.map((handle, idx) => (
              <Handle
                key={`target-${idx}`}
                type="target"
                position={handle.position}
                id={handle.id ?? undefined}
                isConnectable={isConnectable}
                className={cn(
                  'w-[10px] h-[10px] bg-[var(--bg-surface)] border-2 border-[var(--action-primary)]',
                  'shadow-sm transition-all duration-200',
                  'hover:scale-125 hover:bg-[var(--action-primary)]',
                  handlePositionClass[handle.position],
                )}
                style={handle.style}
              />
            ))}

            {/* Node card */}
            <div
              className={cn(
                'relative w-[60px] h-[60px] rounded-[18px] flex items-center justify-center',
                'transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)]',
                'shadow-[0_8px_16px_var(--border-divider)] border border-[var(--overlay-dark)]',
                'group-hover:scale-105 group-hover:shadow-[0_6px_20px_var(--overlay-dark)]',
                gradientClass,
              )}
            >
              {Icon && <Icon className="text-[28px] text-[var(--bg-surface)]" />}
              {badge != null && (
                <div className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-[var(--bg-surface)] flex items-center justify-center text-[10px] font-bold shadow-sm">
                  {badge}
                </div>
              )}
            </div>

            {/* Label */}
            <p className="mt-2 text-[12px] font-semibold text-[var(--text-primary)] text-center max-w-[100px] overflow-hidden text-ellipsis whitespace-nowrap leading-[1.2]">
              {label}
            </p>

            {displaySublabel && (
              <p className="text-[10px] text-[var(--text-secondary)] text-center mt-[2px]">
                {displaySublabel}
              </p>
            )}

            {/* Source handles */}
            {sourceHandles.map((handle, idx) => (
              <Handle
                key={`source-${idx}`}
                type="source"
                position={handle.position}
                id={handle.id ?? undefined}
                isConnectable={isConnectable}
                className={cn(
                  'w-[10px] h-[10px] bg-[var(--bg-surface)] border-2 border-[var(--action-primary)]',
                  'shadow-sm transition-all duration-200',
                  'hover:scale-125 hover:bg-[var(--action-primary)]',
                  handlePositionClass[handle.position],
                )}
                style={handle.style}
              />
            ))}
          </div>
        </TooltipTrigger>
        <TooltipContent side="top">{label}</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};

export default BaseNode;
