import React from "react";
import { Separator } from "@/components/ui/separator";

interface SummaryItem {
  summary: string;
  ticketId: number;
}

interface SummariesCardProps {
  summaries: SummaryItem[];
}

const SummariesCard = ({ summaries }: SummariesCardProps) => (
  <div className="border border-[var(--border-divider)] rounded-lg p-4">
    <p className="text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)] mb-2">
      Resumos Recentes
    </p>
    <ul className="space-y-2">
      {summaries.map((item, i) => (
        <li key={i}>
          <p className="text-sm">{item.summary}</p>
          <p className="text-xs text-[var(--text-muted)]">
            Ticket #{item.ticketId}
          </p>
          {i < summaries.length - 1 && <Separator className="mt-2" />}
        </li>
      ))}
    </ul>
  </div>
);

export default SummariesCard;
