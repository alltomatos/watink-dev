import React from "react";
import type { ActionCardProps } from "../connectionConfigTypes";

const ActionCard: React.FC<ActionCardProps> = ({ icon, label, tone, disabled, onClick }) => (
  <button
    type="button"
    disabled={disabled}
    onClick={onClick}
    className={[
      "flex flex-col items-center justify-center gap-2 rounded-xl border p-5 text-sm font-medium transition-colors",
      "disabled:cursor-not-allowed disabled:opacity-40",
      tone === "destructive"
        ? "text-destructive hover:bg-destructive/5 border-border"
        : "text-foreground hover:bg-muted/50 border-border",
    ].join(" ")}
  >
    <span className={tone === "destructive" ? "text-destructive" : "text-muted-foreground"}>{icon}</span>
    {label}
  </button>
);

export default ActionCard;
