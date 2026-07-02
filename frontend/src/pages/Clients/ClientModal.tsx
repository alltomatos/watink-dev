/* @jsxImportSource react */
import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
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
    loading, formData,
    handleChange, handleAddExistingContact, handleAddNewContact,
    handleContactChange, handleRemoveContact,
    handleAddAddress, handleAddressChange, handleRemoveAddress,
    handleCepBlur, handleSubmit, fetchContacts,
  } = useClientModal(open, client, initialContact, onClose);

  const contactCount = formData.contacts.length;
  const addressCount = formData.addresses.length;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{client ? "Editar Cliente" : "Novo Cliente"}</DialogTitle>
        </DialogHeader>

        <Tabs value={tab} onValueChange={setTab}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="basic">Dados Básicos</TabsTrigger>
            <TabsTrigger value="contacts">Contatos ({contactCount})</TabsTrigger>
            <TabsTrigger value="addresses">Endereços ({addressCount})</TabsTrigger>
          </TabsList>

          <BasicDataTab formData={formData} onChange={handleChange} />
          <ContactsTab
            contacts={formData.contacts}
            onAddExisting={handleAddExistingContact}
            onAddNew={handleAddNewContact}
            onContactChange={handleContactChange}
            onRemove={handleRemoveContact}
            onFetchContacts={fetchContacts}
          />
          <AddressesTab
            addresses={formData.addresses}
            onAdd={handleAddAddress}
            onAddressChange={handleAddressChange}
            onRemove={handleRemoveAddress}
            onCepBlur={handleCepBlur}
          />
        </Tabs>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={handleSubmit} disabled={loading}>
            {loading ? (
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-background border-t-transparent" />
            ) : (
              "Salvar"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ClientModal;
