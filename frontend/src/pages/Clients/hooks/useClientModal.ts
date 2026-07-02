import { useState, useEffect, useRef } from "react";
import { toast } from "react-toastify";
import type { AxiosError } from "axios";
import api from "../../../services/api";
import {
  ClientFormData, AddressInput, ClientAddress, ClientContact, ClientRecord,
  PendingReassign, EMPTY_ADDRESS,
} from "../clientTypes";

// ClientProp is what the modal receives to seed the form when editing — the
// real GET/POST/PUT /clients(/:id) response (ClientRecord). It carries no
// contacts/addresses: those are separate resources
// (GET /clients/:id/addresses, POST /clients/:id/contacts/:contactId/link),
// fetched independently — see docs note in handleSubmit below.
type ClientProp = ClientRecord;

interface LinkConflictBody {
  error?: string;
  requiresConfirmation?: boolean;
  currentClientId?: number;
  currentClientName?: string;
}

export interface UseClientModalReturn {
  loading: boolean;
  formData: ClientFormData;
  clientId: number | null;
  linkedContacts: ClientContact[];
  contactResults: ClientContact[];
  pendingReassign: PendingReassign | null;
  handleChange: (field: keyof ClientFormData, value: string) => void;
  handleAddAddress: () => void;
  handleAddressChange: (index: number, field: keyof AddressInput, value: string) => void;
  handleRemoveAddress: (index: number) => void;
  handleCepBlur: (index: number) => Promise<void>;
  handleSubmit: () => Promise<void>;
  fetchContacts: (inputValue: string) => void;
  handleLinkContact: (contactId: number, confirmReassign?: boolean) => Promise<void>;
  handleUnlinkContact: (contactId: number) => Promise<void>;
  handleConfirmReassign: () => Promise<void>;
  handleCancelReassign: () => void;
}

export const useClientModal = (
  open: boolean,
  client: ClientProp | null | undefined,
  initialContact: ClientContact | undefined,
  onClose: () => void,
): UseClientModalReturn => {
  const [loading, setLoading] = useState(false);
  const [clientId, setClientId] = useState<number | null>(client?.id ?? null);
  const [formData, setFormData] = useState<ClientFormData>({
    type: "pf", name: "", socialName: "", document: "", email: "", phone: "", notes: "",
    addresses: [],
  });
  const [linkedContacts, setLinkedContacts] = useState<ClientContact[]>([]);
  const [contactResults, setContactResults] = useState<ClientContact[]>([]);
  const [pendingReassign, setPendingReassign] = useState<PendingReassign | null>(null);
  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchLinkedContacts = (id: number) => {
    api.get<{ contacts: ClientContact[] }>(`/contacts`, { params: { clientId: id } })
      .then(({ data }) => setLinkedContacts(data.contacts ?? []))
      .catch(() => {
        // Non-fatal — the tab still works for linking new contacts even if
        // the initial list fails to load.
      });
  };

  useEffect(() => {
    if (!open) return;
    setContactResults([]);
    setPendingReassign(null);
    if (client) {
      setClientId(client.id);
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
        // existing list; linked contacts are fetched via fetchLinkedContacts.
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
      fetchLinkedContacts(client.id);
    } else {
      setClientId(null);
      setLinkedContacts(
        initialContact
          ? [{ id: initialContact.id, name: initialContact.name, number: initialContact.number, email: initialContact.email }]
          : [],
      );
      setFormData({
        type: "pf",
        name: initialContact ? initialContact.name ?? "" : "",
        socialName: "",
        document: "",
        email: initialContact?.email ?? "",
        phone: initialContact?.number ?? "",
        notes: "",
        addresses: [],
      });
    }
  }, [client, open, initialContact]);

  // fetchContacts populates contactResults with the search matches (GET
  // /contacts?searchParam=) so ContactsTab can render an autocomplete list —
  // previously this call fired and discarded the response.
  const fetchContacts = (inputValue: string) => {
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    if (!inputValue) {
      setContactResults([]);
      return;
    }
    searchTimeoutRef.current = setTimeout(async () => {
      try {
        const { data } = await api.get<{ contacts: ClientContact[] }>("/contacts", {
          params: { searchParam: inputValue },
        });
        setContactResults(data.contacts ?? []);
      } catch {
        setContactResults([]);
      }
    }, 500);
  };

  const handleChange = (field: keyof ClientFormData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  // handleLinkContact links an EXISTING Contact to this (already saved)
  // Client — POST /clients/:clientId/contacts/:contactId/link. A 409 means
  // the Contact already belongs to a different Client (ADR 0023): capture
  // the payload into pendingReassign so ContactsTab can render
  // ConfirmationModal instead of failing silently.
  const handleLinkContact = async (contactId: number, confirmReassign = false) => {
    if (!clientId) {
      toast.error("Salve o cliente antes de vincular contatos");
      return;
    }
    try {
      await api.post(`/clients/${clientId}/contacts/${contactId}/link`, { confirmReassign });
      toast.success("Contato vinculado com sucesso");
      setContactResults([]);
      setPendingReassign(null);
      fetchLinkedContacts(clientId);
    } catch (err) {
      const axiosErr = err as AxiosError<LinkConflictBody>;
      if (axiosErr.response?.status === 409 && axiosErr.response.data?.requiresConfirmation) {
        const body = axiosErr.response.data;
        const contact = contactResults.find((c) => Number(c.id) === contactId);
        setPendingReassign({
          contactId,
          contactName: contact?.name ?? "este contato",
          currentClientId: body.currentClientId ?? 0,
          currentClientName: body.currentClientName ?? "outro cliente",
        });
        return;
      }
      toast.error("Erro ao vincular contato");
    }
  };

  const handleConfirmReassign = async () => {
    if (!pendingReassign) return;
    await handleLinkContact(pendingReassign.contactId, true);
  };

  const handleCancelReassign = () => {
    setPendingReassign(null);
  };

  const handleUnlinkContact = async (contactId: number) => {
    if (!clientId) return;
    try {
      await api.delete(`/clients/${clientId}/contacts/${contactId}`);
      toast.success("Contato desvinculado");
      setLinkedContacts((prev) => prev.filter((c) => Number(c.id) !== contactId));
    } catch {
      toast.error("Erro ao desvincular contato");
    }
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
      let savedClientId: number;
      if (client) {
        await api.put(`/clients/${client.id}`, clientPayload());
        savedClientId = client.id;
        toast.success("Cliente atualizado com sucesso");
      } else {
        const { data } = await api.post<ClientRecord>("/clients", clientPayload());
        savedClientId = data.id;
        toast.success("Cliente criado com sucesso");
        // A pré-seleção de um Contact (ex: botão "Cadastrar Cliente" a partir
        // do sidebar de um Ticket) só preenche os campos de texto acima —
        // sem este link, o Contact nunca fica de fato vinculado ao Client
        // recém-criado (Contact.ClientID continua nulo).
        if (initialContact?.id) {
          try {
            await api.post(`/clients/${savedClientId}/contacts/${initialContact.id}/link`, {
              confirmReassign: false,
            });
          } catch {
            toast.error("Cliente criado, mas não foi possível vincular o contato automaticamente");
          }
        }
      }
      setClientId(savedClientId);

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
          await api.put(`/clients/${savedClientId}/addresses/${address.id}`, addressPayload);
        } else {
          await api.post(`/clients/${savedClientId}/addresses`, addressPayload);
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
    loading, formData, clientId, linkedContacts, contactResults, pendingReassign,
    handleChange,
    handleAddAddress, handleAddressChange, handleRemoveAddress,
    handleCepBlur, handleSubmit, fetchContacts,
    handleLinkContact, handleUnlinkContact, handleConfirmReassign, handleCancelReassign,
  };
};
