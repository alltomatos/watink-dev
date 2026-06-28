import React, { useState, useEffect } from 'react';
import {
  Bell,
  MessageSquare,
  List,
  Play,
  GitBranch,
  Square,
  GitCommit,
  Database,
  Filter,
  Ticket,
  Webhook,
  Globe,
  Lightbulb,
  LifeBuoy,
} from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import api from '../../services/api';
import { cn } from '@/lib/utils';

// ─── Color map ────────────────────────────────────────────────────────────────

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
  colorTicket: 'bg-gradient-to-b from-[var(--google-pink)] to-[var(--red-700)]',
  colorHelpdesk: 'bg-gradient-to-b from-[var(--emerald-600)] to-[var(--emerald-800)]',
};

// ─── DraggableNode ────────────────────────────────────────────────────────────

const onDragStart = (event: React.DragEvent, nodeType: string, label: string) => {
  event.dataTransfer.setData('application/reactflow', nodeType);
  event.dataTransfer.setData('application/reactflow/label', label);
  event.dataTransfer.effectAllowed = 'move';
};

interface DraggableNodeProps {
  type: string;
  label: string;
  icon: React.ElementType;
  colorClass: string;
}

const DraggableNode: React.FC<DraggableNodeProps> = ({ type, label, icon: Icon, colorClass }) => (
  <TooltipProvider>
    <Tooltip>
      <TooltipTrigger asChild>
        <div
          className="flex flex-col items-center cursor-grab transition-all duration-200 ease-[cubic-bezier(0.4,0,0.2,1)] hover:-translate-y-0.5 active:cursor-grabbing"
          onDragStart={(e) => onDragStart(e, type, label)}
          draggable
        >
          <div className={cn('w-12 h-12 rounded-[14px] flex items-center justify-center shadow-[0_4px_12px_var(--shadow-medium)] mb-2 transition-all duration-200', COLOR_MAP[colorClass] ?? COLOR_MAP.colorTrigger)}>
            <Icon className="w-6 h-6 text-[var(--bg-surface)]" />
          </div>
          <p className="text-[0.7rem] font-semibold text-[var(--text-secondary)] text-center leading-[1.2] max-w-full">
            {label}
          </p>
        </div>
      </TooltipTrigger>
      <TooltipContent side="right">{label}</TooltipContent>
    </Tooltip>
  </TooltipProvider>
);

// ─── NodesSidebar ─────────────────────────────────────────────────────────────

const NodesSidebar: React.FC = () => {
  const [helpdeskEnabled, setHelpdeskEnabled] = useState(false);

  useEffect(() => {
    const checkHelpdeskPlugin = async () => {
      try {
        const { data } = await api.get('/v1/plugins/installed');
        const activePlugins: string[] = data.active || [];
        if (activePlugins.includes('helpdesk')) setHelpdeskEnabled(true);
      } catch {
        // silently ignore
      }
    };
    checkHelpdeskPlugin();
  }, []);

  return (
    <aside className="w-full px-6 py-5 bg-[var(--bg-surface)] flex flex-col gap-3 overflow-y-auto">
      <p className="text-base font-bold text-[var(--text-primary)] pl-1">Blocos Disponíveis</p>

      {/* WhatsApp */}
      <p className="mt-5 text-[0.75rem] font-bold text-[var(--text-primary)] uppercase tracking-[0.05em] opacity-60">WhatsApp</p>
      <div className="grid grid-cols-3 gap-4">
        <DraggableNode type="trigger" label="Gatilho" icon={Bell} colorClass="colorTrigger" />
        <DraggableNode type="message" label="Mensagem" icon={MessageSquare} colorClass="colorMessage" />
        <DraggableNode type="menu" label="Menu" icon={List} colorClass="colorMenu" />
      </div>

      {/* Lógica */}
      <p className="mt-5 text-[0.75rem] font-bold text-[var(--text-primary)] uppercase tracking-[0.05em] opacity-60">Lógica</p>
      <div className="grid grid-cols-3 gap-4">
        <DraggableNode type="input" label="Início" icon={Play} colorClass="colorTrigger" />
        <DraggableNode type="switch" label="Decisão" icon={GitBranch} colorClass="colorSwitch" />
        <DraggableNode type="output" label="Fim" icon={Square} colorClass="colorEnd" />
      </div>

      {/* Utilitários */}
      <p className="mt-5 text-[0.75rem] font-bold text-[var(--text-primary)] uppercase tracking-[0.05em] opacity-60">Utilitários</p>
      <div className="grid grid-cols-3 gap-4">
        <DraggableNode type="pipeline" label="Pipeline" icon={GitCommit} colorClass="colorPipeline" />
        <DraggableNode type="knowledge" label="Conhecimento" icon={Lightbulb} colorClass="colorKnowledge" />
        <DraggableNode type="database" label="Database" icon={Database} colorClass="colorDatabase" />
        <DraggableNode type="filter" label="Filtro" icon={Filter} colorClass="colorFilter" />
        <DraggableNode type="ticket" label="Ticket" icon={Ticket} colorClass="colorTicket" />
        <DraggableNode type="webhook" label="Webhook" icon={Webhook} colorClass="colorWebhook" />
        <DraggableNode type="api" label="API" icon={Globe} colorClass="colorApi" />
      </div>

      {/* Helpdesk (condicional) */}
      {helpdeskEnabled && (
        <>
          <p className="mt-5 text-[0.75rem] font-bold text-[var(--text-primary)] uppercase tracking-[0.05em] opacity-60">Helpdesk</p>
          <div className="grid grid-cols-3 gap-4">
            <DraggableNode type="helpdesk" label="Protocolo" icon={LifeBuoy} colorClass="colorHelpdesk" />
          </div>
        </>
      )}

      <p className="mt-auto text-[11px] text-[var(--text-secondary)] text-center py-2">Arraste os ícones para o painel</p>
    </aside>
  );
};

export default NodesSidebar;
