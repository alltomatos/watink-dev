import React from "react";
import { Badge } from "@/components/ui/badge";

interface TopicsCardProps {
  topics: string[];
}

const TopicsCard = ({ topics }: TopicsCardProps) => (
  <div className="border border-[var(--border-divider)] rounded-lg p-4">
    <p className="text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)] mb-2">
      Tópicos Frequentes
    </p>
    <div className="flex flex-wrap gap-1">
      {topics.map((topic, i) => (
        <Badge key={i} variant="outline" className="text-xs">
          {topic}
        </Badge>
      ))}
    </div>
  </div>
);

export default TopicsCard;
