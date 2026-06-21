import React from "react";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import { cn } from "@/lib/utils";
import { Insight } from "../contactAIInsightsTypes";

interface SentimentInfo {
  label: string;
  icon: React.ReactNode;
  classes: string;
}

function getSentimentInfo(sentiment: number): SentimentInfo {
  if (sentiment > 0.3)
    return {
      label: "Positivo",
      icon: <TrendingUp className="w-3.5 h-3.5" />,
      classes: "bg-[var(--status-success-bg)] text-[var(--status-success)]",
    };
  if (sentiment < -0.3)
    return {
      label: "Negativo",
      icon: <TrendingDown className="w-3.5 h-3.5" />,
      classes: "bg-[var(--status-error-bg)] text-[var(--status-error)]",
    };
  return {
    label: "Neutro",
    icon: <Minus className="w-3.5 h-3.5" />,
    classes: "bg-[var(--status-info-bg)] text-[var(--status-info)]",
  };
}

interface SentimentCardProps {
  insights: Insight;
}

const SentimentCard = ({ insights }: SentimentCardProps) => {
  const sentimentInfo =
    insights.averageSentiment !== undefined
      ? getSentimentInfo(insights.averageSentiment)
      : null;

  return (
    <div className="border border-[var(--border-divider)] rounded-lg p-4">
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)]">
          Sentimento Geral
        </span>
        {sentimentInfo && (
          <span
            className={cn(
              "inline-flex items-center gap-1 px-3 py-0.5 rounded-full text-xs font-semibold",
              sentimentInfo.classes
            )}
          >
            {sentimentInfo.icon}
            {sentimentInfo.label}
          </span>
        )}
      </div>
      <div className="grid grid-cols-2 gap-2 mt-2">
        <div className="text-center p-2 bg-[var(--bg-surface-alt)] rounded-lg">
          <p className="text-xl font-bold">{insights.conversationCount ?? 0}</p>
          <p className="text-xs text-[var(--text-muted)]">Conversas</p>
        </div>
        <div className="text-center p-2 bg-[var(--bg-surface-alt)] rounded-lg">
          <p className="text-xl font-bold">{insights.totalMessages ?? 0}</p>
          <p className="text-xs text-[var(--text-muted)]">Mensagens</p>
        </div>
      </div>
    </div>
  );
};

export default SentimentCard;
