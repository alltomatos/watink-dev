import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import ProtocolCard from "../ProtocolCard";
import { KanbanColumn, KanbanProtocol } from "../hooks/useHelpdeskKanban";

interface KanbanColumnCardProps {
  column: KanbanColumn;
  recentlyAdded: Set<number>;
  onCardClick: (protocol: KanbanProtocol) => void;
}

const KanbanColumnCard: React.FC<KanbanColumnCardProps> = ({
  column,
  recentlyAdded,
  onCardClick,
}) => {
  return (
    <div
      className="flex w-[280px] min-w-[280px] flex-col overflow-hidden rounded-xl shadow-md"
      style={{ backgroundColor: column.bgColor }}
    >
      <div
        className="flex items-center justify-between p-3 font-semibold text-[hsl(var(--bg-surface))]"
        style={{ backgroundColor: column.color }}
      >
        <span>{column.label}</span>
        <span className="rounded-full bg-[var(--overlay-light)] px-2.5 py-0.5 text-xs font-bold text-[hsl(var(--bg-surface))]">
          {column.protocols.length}
        </span>
      </div>
      <div className="flex-1 overflow-y-auto p-2 max-h-[calc(100vh-200px)] custom-scrollbar">
        <AnimatePresence>
          {column.protocols.length === 0 ? (
            <div className="p-6 text-center text-muted-foreground">
              Nenhum protocolo
            </div>
          ) : (
            column.protocols.map((protocol) => (
              <motion.div
                key={protocol.id}
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, x: 100 }}
                transition={{ duration: 0.3 }}
                layout
              >
                <ProtocolCard
                  protocol={protocol}
                  isNew={recentlyAdded.has(protocol.id)}
                  onClick={(p) => onCardClick(p as KanbanProtocol)}
                />
              </motion.div>
            ))
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default KanbanColumnCard;
