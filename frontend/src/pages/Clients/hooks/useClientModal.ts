import { useState, useEffect, useRef } from "react";
import { toast } from "react-toastify";
import api from "../../../services/api";
import {
  ClientFormData, ContactInput, AddressInput, ClientAddress, ClientContact, ClientRecord,
  EMPTY_CONTACT, EMPTY_ADDRESS,
} from "../clientTypes";

// ClientProp is what the modal receives to seed the form when editing — the
// real GET/POST/PUT /clients(/:id) response (ClientRecord). It carries no
// contacts/addresses: those are separate resources
// (GET /clients/:id/addresses, POST /clients/:id/contacts/:contactId/link),
// fetched independently — see docs note in handleSubmit below.
type ClientProp = ClientRecord;

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
    type: "pf", name: "", socialName: "", document: "", email: "", phone: "", notes: "",
    contacts: [], addresses: [],
  });
  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!open) return;
    if (client) {
      setFormData({
        type: client.type || "pf",
        name: client.name ?? "",
        socialName: client.socialName ?? "",
        document: client.document ?? "",
        email: client.email ?? "",
        phone: client.phone ?? "",
        notes: client.notes ?? "",
        // Contacts/addresses are separate backend resources (not part of the
        // ClientRecord response) — fetch addresses so edit mode shows the
        // existing list; linked contacts stay out of scope here (F2).
        contacts: [],
        addresses: [],
      });
      api.get<{ addresses: ClientAddress[] }>(`/clients/${client.id}/addresses`)
        .then(({ data }) => {
          const addresses: AddressInput[] = (data.addresses ?? []).map((a) => ({
            id: a.id,
            label: a.label,
            zipCode: a.zipCode,
            street: a.street,
            number: a.number,
            complement: a.complement,
            neighborhood: a.neighborhood,
            city: a.city,
            state: a.state,
            isPrimary: a.isPrimary,
          }));
          setFormData((prev) => ({ ...prev, addresses }));
        })
        .catch(() => {
          toast.error("Erro ao carregar endereços do cliente");
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
        socialName: "",
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
      const { data } = await api.get<{
        street: string; neighborhood: string; city: string; state: string; notFound: boolean;
      }>("/addresses/lookup", { params: { cep } });
      if (data.notFound) {
        toast.error("CEP não encontrado");
        return;
      }
      setFormData((prev) => {
        const addresses = [...prev.addresses];
        addresses[index] = {
          ...addresses[index],
          street: data.street ?? "",
          neighborhood: data.neighborhood ?? "",
          city: data.city ?? "",
          state: data.state ?? "",
        };
        return { ...prev, addresses };
      });
    } catch {
      toast.error("Erro ao consultar CEP");
    }
  };

  // clientPayload strips contacts/addresses (form-only aggregates) down to the
  // exact clientInput shape the backend accepts
  // (business/internal/controllers/client.go) — POST/PUT /clients never take
  // nested arrays; addresses are separate calls right after (see below).
  const clientPayload = () => ({
    type: formData.type,
    name: formData.name,
    socialName: formData.socialName || null,
    document: formData.document,
    email: formData.email,
    phone: formData.phone,
    notes: formData.notes,
  });

  const handleSubmit = async () => {
    if (!formData.name.trim()) {
      toast.error("Nome é obrigatório");
      return;
    }
    try {
      setLoading(true);
      let clientId: number;
      if (client) {
        await api.put(`/clients/${client.id}`, clientPayload());
        clientId = client.id;
        toast.success("Cliente atualizado com sucesso");
      } else {
        const { data } = await api.post<ClientRecord>("/clients", clientPayload());
        clientId = data.id;
        toast.success("Cliente criado com sucesso");
      }

      for (const address of formData.addresses) {
        const addressPayload = {
          label: address.label,
          zipCode: address.zipCode,
          street: address.street,
          number: address.number,
          complement: address.complement,
          neighborhood: address.neighborhood,
          city: address.city,
          state: address.state,
          isPrimary: address.isPrimary,
        };
        if (address.id) {
          await api.put(`/clients/${clientId}/addresses/${address.id}`, addressPayload);
        } else {
          await api.post(`/clients/${clientId}/addresses`, addressPayload);
        }
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
