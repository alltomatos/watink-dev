import React from "react";
import Avatar from "@/components/ui/avatar";
import PaperCard from "../../components/PaperCard";
import { getBackendUrl } from "../../helpers/urlUtils";
import { cn } from "@/lib/utils";
import { getContactDisplayName } from "@/utils/clientDisplayName";

interface Contact {
  name?: string;
  profilePicUrl?: string;
  client?: { socialName?: string | null } | null;
}

interface Protocol {
  id: number;
  protocolNumber: string;
  subject: string;
  priority: "low" | "medium" | "high" | "urgent";
  contact?: Contact;
}

interface ProtocolCardProps {
  protocol: Protocol;
  isNew?: boolean;
  onClick?: (protocol: Protocol) => void;
}

const priorityBorderMap: Record<string, string> = {
  low: "border-l-4 border-l-[var(--status-success)]",
  medium: "border-l-4 border-l-[var(--status-info)]",
  high: "border-l-4 border-l-[var(--status-warning)]",
  urgent: "border-l-4 border-l-[var(--status-error)] animate-pulse-border",
};

const ProtocolCard: React.FC<ProtocolCardProps> = ({
  protocol,
  isNew = false,
  onClick,
}) => {
  const getAvatarUrl = (): string | null => {
    if (protocol.contact?.profilePicUrl) {
      return getBackendUrl(protocol.contact.profilePicUrl) ?? null;
    }
    return null;
  };

  const priorityClass =
    priorityBorderMap[protocol.priority] ?? priorityBorderMap.medium;

  return (
    <PaperCard
      variant="outlined"
      padding="none"
      hoverEffect
      className={cn(
        "mb-2 cursor-pointer rounded-lg bg-[var(--bg-surface)] shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md",
        priorityClass,
        isNew && "animate-highlight"
      )}
      onClick={() => onClick && onClick(protocol)}
    >
      <div className="flex items-center gap-3 p-3">
        <Avatar
          src={getAvatarUrl()}
          name={getContactDisplayName(protocol.contact) || "?"}
          size="md"
          className="shrink-0"
        />
        <div className="min-w-0 flex-1">
          <p className="text-[0.85rem] font-bold text-primary">
            #{protocol.protocolNumber}
          </p>
          <p
            className="max-w-[200px] overflow-hidden text-ellipsis whitespace-nowrap text-[0.9rem] font-medium"
            title={protocol.subject}
          >
            {protocol.subject}
          </p>
          <p className="text-[0.75rem] text-muted-foreground">
            {getContactDisplayName(protocol.contact) || "Sem contato"}
          </p>
        </div>
      </div>
    </PaperCard>
  );
};

export default ProtocolCard;
