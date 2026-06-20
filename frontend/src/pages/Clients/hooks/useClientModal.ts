import { useState, useEffect, useRef } from "react";
import { toast } from "react-toastify";
import api from "../../../services/api";
import {
  ClientFormData, ContactInput, AddressInput, ClientContact,
  EMPTY_CONTACT, EMPTY_ADDRESS,
} from "../clientTypes";

interface ClientProp {
  id: string;
  type?: string;
  name?: string;
  document?: string;
  email?: string;
  phone?: string;
  notes?: string;
  contacts?: ContactInput[];
  addresses?: AddressInput[];
}

export interface UseClientModalReturn {
  loading: boolean;
  formData: ClientFormData;
  handleChange: (field: keyof ClientFormData, value: string) => void;
  handleAddExistingContact: () => void;
  handleAddNewContact: () => void;
  handleContactChange: (index: number, field: keyof ContactInput, value: string | boolean | null) => void;
  handleRemoveContact: (index: number) => void;
  handleAddAddress: () => void;
  handleAddressChange: (index: number, field: keyof AddressInput, value: string) => void;
  handleRemoveAddress: (index: number) => void;
  handleCepBlur: (index: number) => Promise<void>;
  handleSubmit: () => Promise<void>;
  fetchContacts: (inputValue: string) => void;
}

export const useClientModal = (
  open: boolean,
  client: ClientProp | null | undefined,
  initialContact: ClientContact | undefined,
  onClose: () => void,
): UseClientModalReturn => {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<ClientFormData>({
    type: "pf", name: "", document: "", email: "", phone: "", notes: "",
    contacts: [], addresses: [],
  });
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
        ? [{
            name: initialContact.name ?? "",
            role: "",
            phone: initialContact.number ?? "",
            email: initialContact.email ?? "",
            isPrimary: true,
            contactId: initialContact.id ?? null,
            isNew: true,
          }]
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
  }, [client, open, initialContact]);

  const fetchContacts = (inputValue: string) => {
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    if (!inputValue) return;
    searchTimeoutRef.current = setTimeout(async () => {
      try {
        await api.get<{ contacts: ClientContact[] }>("/contacts", {
          params: { searchParam: inputValue },
        });
      } catch {
        // silent
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
      const data = await resp.json() as {
        erro?: boolean; logradouro?: string; bairro?: string; localidade?: string; uf?: string;
      };
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

  return {
    loading, formData,
    handleChange, handleAddExistingContact, handleAddNewContact,
    handleContactChange, handleRemoveContact,
    handleAddAddress, handleAddressChange, handleRemoveAddress,
    handleCepBlur, handleSubmit, fetchContacts,
  };
};
