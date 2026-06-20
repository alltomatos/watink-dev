import React, { useContext } from "react";
import { MessageSquare, Edit, Plus, Trash2, MoreVertical } from "lucide-react";

import { Button } from "../../../components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "../../../components/ui/tooltip";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "../../../components/ui/dropdown-menu";
import { Can } from "../../../components/Can";
import { AuthContext } from "../../../context/Auth/AuthContext";
import { Contact } from "../contactsTypes";

interface ContactActionsMenuProps {
  contact: Contact;
  onStartChat: (contactId: number) => void;
  onEdit: (contactId: number) => void;
  onMakeClient: (contact: Contact) => void;
  onDelete: (contactId: number) => void;
}

const ContactActionsMenu: React.FC<ContactActionsMenuProps> = ({
  contact,
  onStartChat,
  onEdit,
  onMakeClient,
  onDelete,
}) => {
  const { user } = useContext(AuthContext);

  return (
    <div className="flex items-center justify-end gap-1">
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-green-600 hover:text-green-700 hover:bg-green-50"
            onClick={() => onStartChat(contact.id)}
          >
            <MessageSquare className="h-4 w-4" />
          </Button>
        </TooltipTrigger>
        <TooltipContent>Iniciar Conversa</TooltipContent>
      </Tooltip>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="h-8 w-8">
            <MoreVertical className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={() => onEdit(contact.id)}>
            <Edit className="mr-2 h-4 w-4" />
            <span>Editar</span>
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => onMakeClient(contact)}>
            <Plus className="mr-2 h-4 w-4" />
            <span>Tornar Cliente</span>
          </DropdownMenuItem>
          <Can
            user={user}
            perform="contacts-page:deleteContact"
            yes={() => (
              <DropdownMenuItem
                className="text-destructive focus:text-destructive"
                onClick={() => onDelete(contact.id)}
              >
                <Trash2 className="mr-2 h-4 w-4" />
                <span>Excluir</span>
              </DropdownMenuItem>
            )}
          />
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
};

export default ContactActionsMenu;
