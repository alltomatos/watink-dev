/* @jsxImportSource react */
import React, { useState, useEffect, useRef } from "react";
import { toast } from "react-toastify";
import { Search as SearchIcon, Plus, Trash2 } from "lucide-react";
import api from "../../services/api";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";

// ─── Types ───────────────────────────────────────────────────────────────────

interface ContactInput {
  name: string;
  role: string;
  phone: string;
  email: string;
  isPrimary: boolean;
  contactId: string | null;
  isNew: boolean;
}

interface AddressInput {
  label: string;
  zipCode: string;
  street: string;
  number: string;
  complement: string;
  neighborhood: string;
  city: string;
  state: string;
  isPrimary: boolean;
}

interface ClientContact {
  id?: string;
  name?: string;
  number?: string;
  email?: string;
}

interface ClientFormData {
  type: "pf" | "pj";
  name: string;
  document: string;
  email: string;
  phone: string;
  notes: string;
  contacts: ContactInput[];
  addresses: AddressInput[];
}

const EMPTY_CONTACT = (): ContactInput => ({
  name: "",
  role: "",
  phone: "",
  email: "",
  isPrimary: false,
  contactId: null,
  isNew: true,
});

const EMPTY_ADDRESS = (): AddressInput => ({
  label: "",
  zipCode: "",
  street: "",
  number: "",
  complement: "",
  neighborhood: "",
  city: "",
  state: "",
  isPrimary: false,
});

// ─── Component ────────────────────────────────────────────────────────────────

interface ClientModalProps {
  open: boolean;
  onClose: () => void;
  client?: {
    id: string;
    type?: string;
    name?: string;
    document?: string;
    email?: string;
    phone?: string;
    notes?: string;
    contacts?: ContactInput[];
    addresses?: AddressInput[];
  } | null;
  initialContact?: ClientContact;
}

const ClientModal: React.FC<ClientModalProps> = ({
  open,
  onClose,
  client,
  initialContact,
}) => {
  const [loading, setLoading] = useState(false);
  const [tab, setTab] = useState("basic");
  const [formData, setFormData] = useState<ClientFormData>({
    type: "pf",
    name: "",
    document: "",
    email: "",
    phone: "",
    notes: "",
    contacts: [],
    addresses: [],
  });

  const [_contactOptions, setContactOptions] = useState<ClientContact[]>([]);
  const [_loadingContacts, setLoadingContacts] = useState(false);
  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!open) return;
    if (client) {
      setFormData({
        type: (client.type as "pf" | "pj") || "pf",
        name: client.name ?? "",
        document: client.document ?? "",
        email: client.email ?? "",
        phone: client.phone ?? "",
        notes: client.notes ?? "",
        contacts: (client.contacts ?? []) as ContactInput[],
        addresses: (client.addresses ?? []) as AddressInput[],
      });
    } else {
      const initContacts: ContactInput[] = initialContact
        ? [
            {
              name: initialContact.name ?? "",
              role: "",
              phone: initialContact.number ?? "",
              email: initialContact.email ?? "",
              isPrimary: true,
              contactId: initialContact.id ?? null,
              isNew: true,
            },
          ]
        : [];
      setFormData({
        type: "pf",
        name: initialContact ? initialContact.name ?? "" : "",
        document: "",
        email: initialContact?.email ?? "",
        phone: initialContact?.number ?? "",
        notes: "",
        contacts: initContacts,
        addresses: [],
      });
    }
    setTab("basic");
  }, [client, open, initialContact]);

  const fetchContacts = (inputValue: string) => {
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    if (!inputValue) {
      setContactOptions([]);
      return;
    }
    searchTimeoutRef.current = setTimeout(async () => {
      setLoadingContacts(true);
      try {
        const { data } = await api.get<{ contacts: ClientContact[] }>("/contacts", {
          params: { searchParam: inputValue },
        });
        setContactOptions(data.contacts ?? []);
      } catch {
        // silent
      } finally {
        setLoadingContacts(false);
      }
    }, 500);
  };

  const handleChange = (field: keyof ClientFormData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleAddExistingContact = () => {
    setFormData((prev) => ({
      ...prev,
      contacts: [...prev.contacts, { ...EMPTY_CONTACT(), isNew: false }],
    }));
  };

  const handleAddNewContact = () => {
    setFormData((prev) => ({
      ...prev,
      contacts: [...prev.contacts, EMPTY_CONTACT()],
    }));
  };

  const handleContactChange = (index: number, field: keyof ContactInput, value: string | boolean | null) => {
    setFormData((prev) => {
      const contacts = [...prev.contacts];
      contacts[index] = { ...contacts[index], [field]: value };
      return { ...prev, contacts };
    });
  };

  const _handleContactSelect = (index: number, contact: ClientContact | null) => {
    setFormData((prev) => {
      const contacts = [...prev.contacts];
      if (contact && contact.id) {
        contacts[index] = {
          ...contacts[index],
          contactId: contact.id,
          name: contact.name ?? "",
          phone: contact.number ?? "",
          email: contact.email ?? "",
          isNew: false,
        };
      } else {
        contacts[index] = {
          ...contacts[index],
          contactId: null,
          name: typeof contact === "string" ? contact : "",
          isNew: true,
        };
      }
      return { ...prev, contacts };
    });
  };

  const handleRemoveContact = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      contacts: prev.contacts.filter((_, i) => i !== index),
    }));
  };

  const handleAddAddress = () => {
    setFormData((prev) => ({
      ...prev,
      addresses: [...prev.addresses, EMPTY_ADDRESS()],
    }));
  };

  const handleAddressChange = (index: number, field: keyof AddressInput, value: string) => {
    setFormData((prev) => {
      const addresses = [...prev.addresses];
      addresses[index] = { ...addresses[index], [field]: value };
      return { ...prev, addresses };
    });
  };

  const handleRemoveAddress = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      addresses: prev.addresses.filter((_, i) => i !== index),
    }));
  };

  const handleCepBlur = async (index: number) => {
    const cep = formData.addresses[index]?.zipCode?.replace(/\D/g, "");
    if (!cep || cep.length !== 8) return;
    try {
      const resp = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
      const data = await resp.json() as { erro?: boolean; logradouro?: string; bairro?: string; localidade?: string; uf?: string };
      if (data.erro) {
        toast.error("CEP não encontrado");
        return;
      }
      setFormData((prev) => {
        const addresses = [...prev.addresses];
        addresses[index] = {
          ...addresses[index],
          street: data.logradouro ?? "",
          neighborhood: data.bairro ?? "",
          city: data.localidade ?? "",
          state: data.uf ?? "",
        };
        return { ...prev, addresses };
      });
    } catch {
      toast.error("Erro ao consultar CEP");
    }
  };

  const handleSubmit = async () => {
    if (!formData.name.trim()) {
      toast.error("Nome é obrigatório");
      return;
    }
    try {
      setLoading(true);
      if (client) {
        await api.put(`/clients/${client.id}`, formData);
        toast.success("Cliente atualizado com sucesso");
      } else {
        await api.post("/clients", formData);
        toast.success("Cliente criado com sucesso");
      }
      onClose();
    } catch {
      toast.error("Erro ao salvar cliente");
    } finally {
      setLoading(false);
    }
  };

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
            <TabsTrigger value="contacts">
              Contatos ({contactCount})
            </TabsTrigger>
            <TabsTrigger value="addresses">
              Endereços ({addressCount})
            </TabsTrigger>
          </TabsList>

          {/* ── Basic Data ── */}
          <TabsContent value="basic" className="space-y-4 mt-4">
            <div className="grid grid-cols-4 gap-4">
              <div className="col-span-1 space-y-1.5">
                <label className="text-sm font-medium">Tipo</label>
                <Select
                  value={formData.type}
                  onValueChange={(v) => handleChange("type", v)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pf">Pessoa Física</SelectItem>
                    <SelectItem value="pj">Pessoa Jurídica</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="col-span-3 space-y-1.5">
                <label className="text-sm font-medium">
                  Nome / Razão Social <span className="text-destructive">*</span>
                </label>
                <Input
                  value={formData.name}
                  onChange={(e) => handleChange("name", e.target.value)}
                  placeholder="Nome completo ou razão social"
                />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <label className="text-sm font-medium">
                  {formData.type === "pf" ? "CPF" : "CNPJ"}
                </label>
                <Input
                  value={formData.document}
                  onChange={(e) => handleChange("document", e.target.value)}
                  placeholder={formData.type === "pf" ? "000.000.000-00" : "00.000.000/0000-00"}
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Email</label>
                <Input
                  type="email"
                  value={formData.email}
                  onChange={(e) => handleChange("email", e.target.value)}
                  placeholder="email@exemplo.com"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Telefone</label>
                <Input
                  value={formData.phone}
                  onChange={(e) => handleChange("phone", e.target.value)}
                  placeholder="(00) 00000-0000"
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Observações</label>
              <Textarea
                value={formData.notes}
                onChange={(e) => handleChange("notes", e.target.value)}
                rows={3}
                placeholder="Anotações sobre o cliente..."
              />
            </div>
          </TabsContent>

          {/* ── Contacts ── */}
          <TabsContent value="contacts" className="mt-4">
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm font-medium text-muted-foreground">
                Contatos Vinculados
              </p>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={handleAddExistingContact}>
                  <SearchIcon className="mr-1.5 h-4 w-4" />
                  Vincular Existente
                </Button>
                <Button variant="outline" size="sm" onClick={handleAddNewContact}>
                  <Plus className="mr-1.5 h-4 w-4" />
                  Adicionar Novo
                </Button>
              </div>
            </div>

            {formData.contacts.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">
                Nenhum contato adicionado
              </p>
            ) : (
              <div className="space-y-4">
                {formData.contacts.map((contact, index) => (
                  <div
                    key={index}
                    className="relative rounded-lg border border-border bg-muted/20 p-4"
                  >
                    <Button
                      variant="ghost"
                      size="icon"
                      className="absolute top-2 right-2 h-7 w-7 text-destructive"
                      onClick={() => handleRemoveContact(index)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                    <div className="grid grid-cols-2 gap-3 pr-10">
                      <div className="space-y-1.5">
                        <label className="text-xs font-medium">Nome</label>
                        <Input
                          size="sm"
                          value={contact.name}
                          onChange={(e) =>
                            handleContactChange(index, "name", e.target.value)
                          }
                          onInput={(e) => {
                            if (!contact.isNew) return;
                            const target = e.target as HTMLInputElement;
                            handleContactChange(index, "name", target.value);
                            if (target.value.length > 2) fetchContacts(target.value);
                          }}
                          placeholder="Nome do contato"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-xs font-medium">Cargo/Função</label>
                        <Input
                          size="sm"
                          value={contact.role}
                          onChange={(e) =>
                            handleContactChange(index, "role", e.target.value)
                          }
                          placeholder="Ex: Gerente Comercial"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-xs font-medium">Telefone</label>
                        <Input
                          size="sm"
                          value={contact.phone}
                          onChange={(e) =>
                            handleContactChange(index, "phone", e.target.value)
                          }
                          placeholder="(00) 00000-0000"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-xs font-medium">Email</label>
                        <Input
                          size="sm"
                          type="email"
                          value={contact.email}
                          onChange={(e) =>
                            handleContactChange(index, "email", e.target.value)
                          }
                          placeholder="email@exemplo.com"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>

          {/* ── Addresses ── */}
          <TabsContent value="addresses" className="mt-4">
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm font-medium text-muted-foreground">Endereços</p>
              <Button variant="outline" size="sm" onClick={handleAddAddress}>
                <Plus className="mr-1.5 h-4 w-4" />
                Adicionar
              </Button>
            </div>

            {formData.addresses.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">
                Nenhum endereço adicionado
              </p>
            ) : (
              <div className="space-y-4">
                {formData.addresses.map((address, index) => (
                  <div
                    key={index}
                    className="relative rounded-lg border border-border bg-muted/20 p-4"
                  >
                    <Button
                      variant="ghost"
                      size="icon"
                      className="absolute top-2 right-2 h-7 w-7 text-destructive"
                      onClick={() => handleRemoveAddress(index)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                    <div className="grid grid-cols-4 gap-3 pr-10">
                      <div className="col-span-1 space-y-1.5">
                        <label className="text-xs font-medium">Rótulo (ex: Sede)</label>
                        <Input
                          size="sm"
                          value={address.label}
                          onChange={(e) => handleAddressChange(index, "label", e.target.value)}
                          placeholder="Sede"
                        />
                      </div>
                      <div className="col-span-1 space-y-1.5">
                        <label className="text-xs font-medium">CEP</label>
                        <Input
                          size="sm"
                          value={address.zipCode}
                          onChange={(e) => handleAddressChange(index, "zipCode", e.target.value)}
                          onBlur={() => handleCepBlur(index)}
                          placeholder="00000-000"
                        />
                      </div>
                      <div className="col-span-1 space-y-1.5">
                        <label className="text-xs font-medium">Número</label>
                        <Input
                          size="sm"
                          value={address.number}
                          onChange={(e) => handleAddressChange(index, "number", e.target.value)}
                          placeholder="123"
                        />
                      </div>
                      <div className="col-span-1 space-y-1.5">
                        <label className="text-xs font-medium">Complemento</label>
                        <Input
                          size="sm"
                          value={address.complement}
                          onChange={(e) => handleAddressChange(index, "complement", e.target.value)}
                          placeholder="Sala 101"
                        />
                      </div>
                      <div className="col-span-2 space-y-1.5">
                        <label className="text-xs font-medium">Logradouro</label>
                        <Input
                          size="sm"
                          value={address.street}
                          onChange={(e) => handleAddressChange(index, "street", e.target.value)}
                          placeholder="Rua, Avenida..."
                        />
                      </div>
                      <div className="col-span-2 space-y-1.5">
                        <label className="text-xs font-medium">Bairro</label>
                        <Input
                          size="sm"
                          value={address.neighborhood}
                          onChange={(e) => handleAddressChange(index, "neighborhood", e.target.value)}
                          placeholder="Bairro"
                        />
                      </div>
                      <div className="col-span-2 space-y-1.5">
                        <label className="text-xs font-medium">Cidade</label>
                        <Input
                          size="sm"
                          value={address.city}
                          onChange={(e) => handleAddressChange(index, "city", e.target.value)}
                          placeholder="Cidade"
                        />
                      </div>
                      <div className="col-span-2 space-y-1.5">
                        <label className="text-xs font-medium">Estado (UF)</label>
                        <Input
                          size="sm"
                          value={address.state}
                          onChange={(e) => handleAddressChange(index, "state", e.target.value)}
                          placeholder="CE"
                          maxLength={2}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
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