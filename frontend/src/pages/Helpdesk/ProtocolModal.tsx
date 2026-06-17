import React, { useState, useEffect } from "react";
import { Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "react-toastify";
import api from "../../services/api";

interface Contact {
  id: number;
  name: string;
}

interface FormData {
  subject: string;
  description: string;
  status: string;
  priority: string;
  category: string;
  contactId: number | null;
}

interface ProtocolModalProps {
  open: boolean;
  onClose: () => void;
}

const ProtocolModal: React.FC<ProtocolModalProps> = ({ open, onClose }) => {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<FormData>({
    subject: "",
    description: "",
    status: "open",
    priority: "medium",
    category: "",
    contactId: null,
  });
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
  const [contactOptions, setContactOptions] = useState<Contact[]>([]);
  const [contactLoading, setContactLoading] = useState(false);
  const [contactSearch, setContactSearch] = useState("");

  // Helpdesk Settings
  const [helpdeskEnabled, setHelpdeskEnabled] = useState(false);
  const [categories, setCategories] = useState<string[]>([]);

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const { data } = await api.get("/settings");
        const settingsData = Array.isArray(data) ? data : [];

        const enabledSetting = settingsData.find(
          (s: { key: string; value: string }) => s.key === "helpdesk_settings_enabled"
        );
        const isEnabled = enabledSetting?.value === "true";
        setHelpdeskEnabled(isEnabled);

        if (isEnabled) {
          const categoriesSetting = settingsData.find(
            (s: { key: string; value: string }) => s.key === "helpdesk_categories"
          );
          if (categoriesSetting) {
            try {
              setCategories(JSON.parse(categoriesSetting.value));
            } catch {
              setCategories(["Incidente", "Requisição de Serviço", "Problema", "Mudança"]);
            }
          } else {
            setCategories(["Incidente", "Requisição de Serviço", "Problema", "Mudança"]);
          }
        }
      } catch (err) {
        console.error("Error fetching settings", err);
      }
    };
    fetchSettings();
  }, [open]);

  useEffect(() => {
    if (!open) {
      setFormData({
        subject: "",
        description: "",
        status: "open",
        priority: "medium",
        category: "",
        contactId: null,
      });
      setSelectedContact(null);
      setContactSearch("");
      setContactOptions([]);
    }
  }, [open]);

  useEffect(() => {
    if (!contactSearch || contactSearch.length < 3) {
      setContactLoading(false);
      return;
    }

    const delayDebounceFn = setTimeout(async () => {
      setContactLoading(true);
      try {
        const { data } = await api.get("contacts", {
          params: { searchParam: contactSearch },
        });
        setContactOptions(data.contacts);
      } catch {
        toast.error("Erro ao buscar contatos");
      } finally {
        setContactLoading(false);
      }
    }, 500);

    return () => clearTimeout(delayDebounceFn);
  }, [contactSearch]);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSelectChange = (name: keyof FormData) => (value: string) => {
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleContactSelect = (contact: Contact) => {
    setSelectedContact(contact);
    setFormData((prev) => ({ ...prev, contactId: contact.id }));
    setContactSearch(contact.name);
    setContactOptions([]);
  };

  const handleSubmit = async () => {
    if (!formData.subject.trim()) {
      toast.error("Assunto é obrigatório");
      return;
    }
    if (!formData.contactId) {
      toast.error("Contato é obrigatório");
      return;
    }

    try {
      setLoading(true);
      await api.post("/protocols", formData);
      toast.success("Protocolo criado com sucesso");
      onClose();
    } catch {
      toast.error("Erro ao criar protocolo");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="max-w-lg w-full">
        <DialogHeader>
          <DialogTitle>Novo Protocolo</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-4 pt-2">
          {/* Contato com busca */}
          <div className="flex flex-col gap-1.5 relative">
            <Label htmlFor="contact-search">
              Contato <span className="text-destructive">*</span>
            </Label>
            <div className="relative">
              <Input
                id="contact-search"
                value={contactSearch}
                onChange={(e) => {
                  setContactSearch(e.target.value);
                  if (selectedContact && e.target.value !== selectedContact.name) {
                    setSelectedContact(null);
                    setFormData((prev) => ({ ...prev, contactId: null }));
                  }
                }}
                placeholder="Digite o nome do contato (mín. 3 letras)"
              />
              {contactLoading && (
                <Loader2 className="absolute right-3 top-2.5 h-4 w-4 animate-spin text-muted-foreground" />
              )}
            </div>
            {contactOptions.length > 0 && (
              <ul className="absolute z-50 top-full left-0 right-0 mt-1 rounded-md border border-border bg-background shadow-md max-h-48 overflow-y-auto">
                {contactOptions.map((contact) => (
                  <li
                    key={contact.id}
                    className="cursor-pointer px-3 py-2 text-sm hover:bg-accent hover:text-accent-foreground"
                    onMouseDown={() => handleContactSelect(contact)}
                  >
                    {contact.name}
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Assunto */}
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="modal-subject">
              Assunto <span className="text-destructive">*</span>
            </Label>
            <Input
              id="modal-subject"
              name="subject"
              value={formData.subject}
              onChange={handleChange}
              placeholder="Assunto do protocolo"
            />
          </div>

          {/* Prioridade + Categoria */}
          <div className={`grid gap-4 ${helpdeskEnabled ? "grid-cols-2" : "grid-cols-1"}`}>
            <div className="flex flex-col gap-1.5">
              <Label>Prioridade</Label>
              <Select
                value={formData.priority}
                onValueChange={handleSelectChange("priority")}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione a prioridade" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Baixa</SelectItem>
                  <SelectItem value="medium">Média</SelectItem>
                  <SelectItem value="high">Alta</SelectItem>
                  <SelectItem value="urgent">Urgente</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {helpdeskEnabled && (
              <div className="flex flex-col gap-1.5">
                <Label>Categoria</Label>
                {categories.length > 0 ? (
                  <Select
                    value={formData.category}
                    onValueChange={handleSelectChange("category")}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione a categoria" />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map((cat) => (
                        <SelectItem key={cat} value={cat}>
                          {cat}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <Input
                    name="category"
                    value={formData.category}
                    onChange={handleChange}
                    placeholder="Categoria"
                  />
                )}
              </div>
            )}
          </div>

          {/* Descrição */}
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="modal-description">Descrição</Label>
            <Textarea
              id="modal-description"
              name="description"
              value={formData.description}
              onChange={handleChange}
              rows={4}
              placeholder="Descreva o problema ou solicitação..."
            />
          </div>
        </div>

        <DialogFooter className="mt-2">
          <Button variant="outline" onClick={onClose} disabled={loading}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={loading}>
            {loading ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : null}
            Criar Protocolo
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ProtocolModal;
