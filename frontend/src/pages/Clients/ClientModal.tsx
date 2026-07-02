/* @jsxImportSource react */
import React, { useState } from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetFooter,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

import { ClientContact, ClientRecord } from "./clientTypes";
import { useClientModal } from "./hooks/useClientModal";
import BasicDataTab from "./components/BasicDataTab";
import ContactsTab from "./components/ContactsTab";
import AddressesTab from "./components/AddressesTab";

interface ClientModalProps {
  open: boolean;
  onClose: () => void;
  client?: ClientRecord | null;
  initialContact?: ClientContact;
}

const ClientModal: React.FC<ClientModalProps> = ({ open, onClose, client, initialContact }) => {
  const [tab, setTab] = useState("basic");

  const {
    loading, formData, clientId,
    handleChange,
    handleAddAddress, handleAddressChange, handleRemoveAddress,
    handleCepBlur, handleSubmit, fetchContacts, contactResults,
    linkedContacts, pendingReassign, handleLinkContact, handleUnlinkContact,
    handleConfirmReassign, handleCancelReassign,
  } = useClientModal(open, client, initialContact, onClose);

  const contactCount = linkedContacts.length;
  const addressCount = formData.addresses.length;

  return (
    <Sheet open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <SheetContent side="right" className="w-full sm:max-w-xl overflow-y-auto p-6">
        <SheetHeader>
          <SheetTitle>{client ? "Editar Cliente" : "Novo Cliente"}</SheetTitle>
        </SheetHeader>

        <Separator className="my-4" />

        <Tabs value={tab} onValueChange={setTab}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="basic">Dados Básicos</TabsTrigger>
            <TabsTrigger value="contacts">Contatos ({contactCount})</TabsTrigger>
            <TabsTrigger value="addresses">Endereços ({addressCount})</TabsTrigger>
          </TabsList>

          <BasicDataTab formData={formData} onChange={handleChange} />
          <ContactsTab
            clientId={clientId}
            linkedContacts={linkedContacts}
            contactResults={contactResults}
            pendingReassign={pendingReassign}
            onSearch={fetchContacts}
            onLink={handleLinkContact}
            onUnlink={handleUnlinkContact}
            onConfirmReassign={handleConfirmReassign}
            onCancelReassign={handleCancelReassign}
          />
          <AddressesTab
            addresses={formData.addresses}
            onAdd={handleAddAddress}
            onAddressChange={handleAddressChange}
            onRemove={handleRemoveAddress}
            onCepBlur={handleCepBlur}
          />
        </Tabs>

        <SheetFooter className="mt-6 gap-2">
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={handleSubmit} disabled={loading}>
            {loading ? (
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-background border-t-transparent" />
            ) : (
              "Salvar"
            )}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
};

export default ClientModal;
