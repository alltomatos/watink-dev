import React from "react";
import { Plus, Search as SearchIcon, Trash2 } from "lucide-react";
import { TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ContactInput } from "../clientTypes";

interface ContactsTabProps {
  contacts: ContactInput[];
  onAddExisting: () => void;
  onAddNew: () => void;
  onContactChange: (index: number, field: keyof ContactInput, value: string | boolean | null) => void;
  onRemove: (index: number) => void;
  onFetchContacts: (value: string) => void;
}

const ContactsTab: React.FC<ContactsTabProps> = ({
  contacts, onAddExisting, onAddNew, onContactChange, onRemove, onFetchContacts,
}) => (
  <TabsContent value="contacts" className="mt-4">
    <div className="flex items-center justify-between mb-3">
      <p className="text-sm font-medium text-muted-foreground">Contatos Vinculados</p>
      <div className="flex gap-2">
        <Button variant="outline" size="sm" onClick={onAddExisting}>
          <SearchIcon className="mr-1.5 h-4 w-4" />
          Vincular Existente
        </Button>
        <Button variant="outline" size="sm" onClick={onAddNew}>
          <Plus className="mr-1.5 h-4 w-4" />
          Adicionar Novo
        </Button>
      </div>
    </div>

    {contacts.length === 0 ? (
      <p className="text-sm text-muted-foreground text-center py-8">
        Nenhum contato adicionado
      </p>
    ) : (
      <div className="space-y-4">
        {contacts.map((contact, index) => (
          <div key={index} className="relative rounded-lg border border-border bg-muted/20 p-4">
            <Button
              variant="ghost"
              size="icon"
              className="absolute top-2 right-2 h-7 w-7 text-destructive"
              onClick={() => onRemove(index)}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
            <div className="grid grid-cols-2 gap-3 pr-10">
              <div className="space-y-1.5">
                <label className="text-xs font-medium">Nome</label>
                <Input
                  value={contact.name}
                  onChange={(e) => onContactChange(index, "name", e.target.value)}
                  onInput={(e) => {
                    if (!contact.isNew) return;
                    const target = e.target as HTMLInputElement;
                    onContactChange(index, "name", target.value);
                    if (target.value.length > 2) onFetchContacts(target.value);
                  }}
                  placeholder="Nome do contato"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium">Cargo/Função</label>
                <Input
                  value={contact.role}
                  onChange={(e) => onContactChange(index, "role", e.target.value)}
                  placeholder="Ex: Gerente Comercial"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium">Telefone</label>
                <Input
                  value={contact.phone}
                  onChange={(e) => onContactChange(index, "phone", e.target.value)}
                  placeholder="(00) 00000-0000"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium">Email</label>
                <Input
                  type="email"
                  value={contact.email}
                  onChange={(e) => onContactChange(index, "email", e.target.value)}
                  placeholder="email@exemplo.com"
                />
              </div>
            </div>
          </div>
        ))}
      </div>
    )}
  </TabsContent>
);

export default ContactsTab;
