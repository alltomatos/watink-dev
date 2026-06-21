import React from "react";
import { Edit2, RefreshCw, PersonStanding, UserPlus } from "lucide-react";

import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

import { i18n } from "../../../translate/i18n";
import { getBackendUrl } from "../../../helpers/urlUtils";
import { Contact } from "../contactDrawerTypes";

interface ContactHeaderProps {
  contact: Contact;
  onEdit: () => void;
  onSync: () => void;
  onCreateClient: () => void;
}

const ContactHeader = ({
  contact,
  onEdit,
  onSync,
  onCreateClient,
}: ContactHeaderProps) => {
  const hasClient = contact.clients && contact.clients.length > 0;

  return (
    <div className="border border-[var(--border-divider)] rounded flex flex-col items-center p-3 gap-2 bg-[var(--bg-surface)]">
      <Avatar
        className="w-[160px] h-[160px] mt-2"
        src={getBackendUrl(contact.profilePicUrl ?? "")}
        name={contact.name || "?"}
      />
      <p className="font-medium text-sm">{contact.name}</p>
      {contact.number ? (
        <a
          href={`tel:${contact.number}`}
          className="text-sm text-primary hover:underline"
        >
          {contact.number}
        </a>
      ) : (
        <p className="text-xs text-[var(--text-muted)]">{contact.lid}</p>
      )}

      <div className="flex items-center justify-center gap-1 mt-1">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="icon" onClick={onEdit}>
              <Edit2 className="w-4 h-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>{i18n.t("contactDrawer.buttons.edit")}</TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="icon" onClick={onSync}>
              <RefreshCw className="w-4 h-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Atualizar</TooltipContent>
        </Tooltip>

        {!hasClient ? (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" onClick={onCreateClient}>
                <UserPlus className="w-4 h-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Criar Cliente</TooltipContent>
          </Tooltip>
        ) : (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" disabled>
                <PersonStanding className="w-4 h-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Cliente Vinculado</TooltipContent>
          </Tooltip>
        )}
      </div>
    </div>
  );
};

export default ContactHeader;
