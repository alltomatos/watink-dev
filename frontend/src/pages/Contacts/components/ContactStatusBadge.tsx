import React from "react";
import { Badge } from "../../../components/ui/badge";
import { Contact } from "../contactsTypes";

interface ContactStatusBadgeProps {
  contact: Contact;
}

const ContactStatusBadge: React.FC<ContactStatusBadgeProps> = ({ contact }) => {
  if (contact.isGroup || contact.number?.includes("@g.us")) {
    return <Badge variant="secondary">Grupo</Badge>;
  }
  if (contact.lid) {
    return (
      <Badge variant="outline" className="text-green-600 border-green-300">
        Verificado
      </Badge>
    );
  }
  return (
    <Badge variant="outline" className="text-muted-foreground">
      Pendente
    </Badge>
  );
};

export default ContactStatusBadge;
