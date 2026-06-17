import React, { useContext, useState } from "react";
import { useNavigate } from "react-router-dom";
import { MoreVertical, RotateCcw } from "lucide-react";

import { Button } from "@/components/ui/button";
import { i18n } from "../../translate/i18n";
import api from "../../services/api";
import TicketOptionsMenu from "../TicketOptionsMenu";
import ButtonWithSpinner from "../ButtonWithSpinner";
import toastError from "../../errors/toastError";
import { AuthContext } from "../../context/Auth/AuthContext";

interface TicketUser {
  id: number;
  name: string;
}

interface Ticket {
  id: number;
  status: "open" | "closed" | "pending";
  whatsappId?: number;
  contact: {
    name: string;
  };
  user?: TicketUser | null;
}

interface TicketActionButtonsProps {
  ticket: Ticket;
}

const TicketActionButtons: React.FC<TicketActionButtonsProps> = ({ ticket }) => {
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const { user } = useContext(AuthContext);

  const handleOpenMenu = () => {
    setMenuOpen(true);
  };

  const handleCloseMenu = () => {
    setMenuOpen(false);
  };

  const handleUpdateTicketStatus = async (
    e: React.MouseEvent,
    status: string,
    userId: number | null
  ) => {
    setLoading(true);
    try {
      await api.put(`/tickets/${ticket.id}`, {
        status,
        userId: userId ?? null,
      });
      setLoading(false);
      if (status === "open") {
        navigate(`/tickets/${ticket.id}`);
      } else {
        navigate("/tickets");
      }
    } catch (err) {
      setLoading(false);
      toastError(err);
    }
  };

  return (
    <div className="ml-auto mr-1.5 flex flex-none items-center gap-1 self-center">
      {ticket.status === "closed" && (
        <ButtonWithSpinner
          loading={loading}
          startIcon={<RotateCcw className="h-4 w-4" />}
          size="sm"
          onClick={(e: React.MouseEvent) =>
            handleUpdateTicketStatus(e, "open", user?.id ?? null)
          }
        >
          {i18n.t("messagesList.header.buttons.reopen") as string}
        </ButtonWithSpinner>
      )}

      {ticket.status === "open" && (
        <>
          <ButtonWithSpinner
            loading={loading}
            startIcon={<RotateCcw className="h-4 w-4" />}
            size="sm"
            onClick={(e: React.MouseEvent) =>
              handleUpdateTicketStatus(e, "pending", null)
            }
          >
            {i18n.t("messagesList.header.buttons.return") as string}
          </ButtonWithSpinner>

          <ButtonWithSpinner
            loading={loading}
            size="sm"
            variant="default"
            color="primary"
            onClick={(e: React.MouseEvent) =>
              handleUpdateTicketStatus(e, "closed", user?.id ?? null)
            }
          >
            {i18n.t("messagesList.header.buttons.resolve") as string}
          </ButtonWithSpinner>

          <Button
            variant="ghost"
            size="icon"
            onClick={handleOpenMenu}
            aria-label="Mais opções"
          >
            <MoreVertical className="h-4 w-4" />
          </Button>

          <TicketOptionsMenu
            ticket={ticket}
            menuOpen={menuOpen}
            handleClose={handleCloseMenu}
          />
        </>
      )}

      {ticket.status === "pending" && (
        <ButtonWithSpinner
          loading={loading}
          size="sm"
          variant="default"
          color="primary"
          onClick={(e: React.MouseEvent) =>
            handleUpdateTicketStatus(e, "open", user?.id ?? null)
          }
        >
          {i18n.t("messagesList.header.buttons.accept") as string}
        </ButtonWithSpinner>
      )}
    </div>
  );
};

export default TicketActionButtons;
