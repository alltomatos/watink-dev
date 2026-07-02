import React, { useState } from "react";
import { Plus, Search as SearchIcon, UserMinus } from "lucide-react";
import { TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import ConfirmationModal from "../../../components/ConfirmationModal";
import ContactModal from "../../../components/ContactModal";
import { ClientContact, PendingReassign } from "../clientTypes";

interface ContactsTabProps {
  clientId: number | null;
  linkedContacts: ClientContact[];
  contactResults: ClientContact[];
  pendingReassign: PendingReassign | null;
  onSearch: (value: string) => void;
  onLink: (contactId: number) => void;
  onUnlink: (contactId: number) => void;
  onConfirmReassign: () => void;
  onCancelReassign: () => void;
}

const ContactsTab: React.FC<ContactsTabProps> = ({
  clientId, linkedContacts, contactResults, pendingReassign,
  onSearch, onLink, onUnlink, onConfirmReassign, onCancelReassign,
}) => {
  const [searchValue, setSearchValue] = useState("");
  const [newContactOpen, setNewContactOpen] = useState(false);

  const linkedIds = new Set(linkedContacts.map((c) => Number(c.id)));
  const suggestions = contactResults.filter((c) => !linkedIds.has(Number(c.id)));

  const handleSelect = (contact: ClientContact) => {
    if (contact.id == null) return;
    onLink(Number(contact.id));
    setSearchValue("");
  };

  return (
    <TabsContent value="contacts" className="mt-4">
      {!clientId ? (
        <p className="text-sm text-muted-foreground text-center py-8">
          Salve o cliente antes de vincular contatos.
        </p>
      ) : (
        <>
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-medium text-muted-foreground">Vincular Existente</p>
            <Button variant="outline" size="sm" onClick={() => setNewContactOpen(true)}>
              <Plus className="mr-1.5 h-4 w-4" />
              Adicionar Novo
            </Button>
          </div>
          <div className="relative mb-4">
            <div className="relative">
              <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                className="pl-9"
                placeholder="Buscar contato pelo nome ou número..."
                value={searchValue}
                onChange={(e) => {
                  setSearchValue(e.target.value);
                  onSearch(e.target.value);
                }}
              />
            </div>
            {searchValue.length > 0 && suggestions.length > 0 && (
              <div className="absolute z-50 w-full mt-1 max-h-48 overflow-auto rounded-md border bg-popover text-popover-foreground shadow-md">
                {suggestions.map((contact) => (
                  <div
                    key={contact.id}
                    className="px-3 py-2 text-sm cursor-pointer hover:bg-accent flex justify-between"
                    onClick={() => handleSelect(contact)}
                  >
                    <span>{contact.name}</span>
                    <span className="text-muted-foreground text-xs">{contact.number}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <p className="text-sm font-medium text-muted-foreground mb-3">Contatos Vinculados</p>
          {linkedContacts.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              Nenhum contato vinculado
            </p>
          ) : (
            <div className="space-y-2">
              {linkedContacts.map((contact) => (
                <div
                  key={contact.id}
                  className="flex items-center justify-between rounded-lg border border-border bg-muted/20 p-3"
                >
                  <div>
                    <p className="text-sm font-medium">{contact.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {contact.number}
                      {contact.email ? ` · ${contact.email}` : ""}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-destructive"
                    onClick={() => contact.id != null && onUnlink(Number(contact.id))}
                  >
                    <UserMinus className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      <ConfirmationModal
        title="Contato já vinculado"
        open={!!pendingReassign}
        onClose={(confirmed) => { if (!confirmed) onCancelReassign(); }}
        onConfirm={onConfirmReassign}
      >
        {pendingReassign
          ? `O contato "${pendingReassign.contactName}" já pertence ao cliente "${pendingReassign.currentClientName}". Deseja mover para este cliente?`
          : ""}
      </ConfirmationModal>

      {/* "Adicionar Novo" cria o Contact via POST /contacts (ContactModal
          reusado) e, ao salvar com sucesso, vincula o id retornado ao
          Client atual — evita duplicar o formulário de Contact aqui. */}
      <ContactModal
        open={newContactOpen}
        onClose={() => setNewContactOpen(false)}
        onSave={(saved) => {
          const savedId = (saved as { id?: number }).id;
          if (savedId != null) onLink(savedId);
        }}
      />
    </TabsContent>
  );
};

export default ContactsTab;
