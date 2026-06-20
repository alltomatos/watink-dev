import React from "react";
import { Progress } from "@/components/ui/progress";

interface StatCardProps {
  title: string;
  value: React.ReactNode;
  progress?: number;
  progressColor?: "primary" | "destructive";
  caption?: string;
}

const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  progress,
  progressColor = "primary",
  caption,
}) => (
  <div className="flex h-full flex-col rounded-xl border border-border bg-card p-4 shadow-sm">
    <p className="mb-1 text-sm text-muted-foreground">{title}</p>
    <p className="text-xl font-bold">{value}</p>
    {progress !== undefined && (
      <div className="mt-2">
        <Progress
          value={progress}
          className={
            progressColor === "destructive"
              ? "[&>div]:bg-destructive"
              : undefined
          }
        />
      </div>
    )}
    {caption && (
      <p className="mt-auto pt-2 text-xs text-muted-foreground">{caption}</p>
    )}
  </div>
);

export default StatCard;
