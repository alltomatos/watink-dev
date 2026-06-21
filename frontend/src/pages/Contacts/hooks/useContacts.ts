import { useState, useEffect, useReducer, useContext } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";

import api from "../../../services/api";
import openSocket from "../../../services/socket-io";
import { i18n } from "../../../translate/i18n";
import toastError from "../../../errors/toastError";
import { AuthContext } from "../../../context/Auth/AuthContext";
import { useLocalStorage } from "../../../hooks/useLocalStorage";
import { Contact, ContactsAction, ContactsView } from "../contactsTypes";

function contactsReducer(state: Contact[], action: ContactsAction): Contact[] {
  if (action.type === "LOAD_CONTACTS") {
    const incoming = action.payload ?? [];
    if (incoming.length === 0) return [];
    const next = [...state];
    incoming.forEach((contact) => {
      const idx = next.findIndex((c) => c.id === contact.id);
      if (idx !== -1) {
        next[idx] = contact;
      } else {
        next.push(contact);
      }
    });
    return next;
  }

  if (action.type === "UPDATE_CONTACTS") {
    const contact = action.payload;
    const idx = state.findIndex((c) => c.id === contact.id);
    if (idx !== -1) {
      const next = [...state];
      next[idx] = contact;
      return next;
    }
    return [contact, ...state];
  }

  if (action.type === "DELETE_CONTACT") {
    return state.filter((c) => c.id !== action.payload);
  }

  if (action.type === "RESET") {
    return [];
  }

  return state;
}

export interface UseContactsReturn {
  contacts: Contact[];
  loading: boolean;
  hasMore: boolean;
  searchParam: string;
  view: ContactsView;
  selectedContactId: number | null;
  contactModalOpen: boolean;
  clientModalOpen: boolean;
  selectedInitialContact: Contact | null;
  confirmOpen: boolean;
  importConfirmOpen: boolean;
  setView: (v: ContactsView) => void;
  setConfirmOpen: (v: boolean) => void;
  setImportConfirmOpen: (v: boolean) => void;
  handleSearch: (e: React.ChangeEvent<HTMLInputElement>) => void;
  handleScroll: (e: React.UIEvent<HTMLDivElement>) => void;
  handleOpenContactModal: () => void;
  handleCloseContactModal: () => void;
  handleOpenClientModal: (contact: Contact) => void;
  handleCloseClientModal: () => void;
  handleEditContact: (contactId: number) => void;
  handleSaveTicket: (contactId: number) => Promise<void>;
  handleDeleteContact: (contactId: number) => Promise<void>;
  handleImportContacts: () => Promise<void>;
  handleRequestDelete: (contactId: number) => void;
}

export function useContacts(): UseContactsReturn {
  const navigate = useNavigate();
  const { user } = useContext(AuthContext);

  const [loading, setLoading] = useState(false);
  const [pageNumber, setPageNumber] = useState(1);
  const [searchParam, setSearchParam] = useState("");
  const [contacts, dispatch] = useReducer(contactsReducer, []);
  const [selectedContactId, setSelectedContactId] = useState<number | null>(null);
  const [contactModalOpen, setContactModalOpen] = useState(false);
  const [clientModalOpen, setClientModalOpen] = useState(false);
  const [selectedInitialContact, setSelectedInitialContact] = useState<Contact | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [importConfirmOpen, setImportConfirmOpen] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [view, setView] = useLocalStorage<ContactsView>("contactsView", "table");

  useEffect(() => {
    dispatch({ type: "RESET" });
    setPageNumber(1);
  }, [searchParam]);

  useEffect(() => {
    setLoading(true);
    const timer = setTimeout(async () => {
      try {
        const { data } = await api.get("/contacts/", {
          params: { searchParam, pageNumber },
        });
        dispatch({ type: "LOAD_CONTACTS", payload: data.contacts });
        setHasMore(data.hasMore);
      } catch (err) {
        toastError(err);
      } finally {
        setLoading(false);
      }
    }, 500);
    return () => clearTimeout(timer);
  }, [searchParam, pageNumber]);

  useEffect(() => {
    const socket = openSocket();
    if (!socket) return;
    socket.on("contact", (data: { action: string; contact?: Contact; contactId?: string }) => {
      if (data.action === "update" || data.action === "create") {
        dispatch({ type: "UPDATE_CONTACTS", payload: data.contact! });
      }
      if (data.action === "delete") {
        dispatch({ type: "DELETE_CONTACT", payload: Number(data.contactId) });
      }
    });
    return () => { socket.disconnect(); };
  }, []);

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchParam(e.target.value.toLowerCase());
  };

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    if (!hasMore || loading) return;
    const { scrollTop, scrollHeight, clientHeight } = e.currentTarget;
    if (scrollHeight - (scrollTop + clientHeight) < 100) {
      setPageNumber((prev) => prev + 1);
    }
  };

  const handleOpenContactModal = () => {
    setSelectedContactId(null);
    setContactModalOpen(true);
  };

  const handleCloseContactModal = () => {
    setSelectedContactId(null);
    setContactModalOpen(false);
  };

  const handleEditContact = (contactId: number) => {
    setSelectedContactId(contactId);
    setContactModalOpen(true);
  };

  const handleOpenClientModal = (contact: Contact) => {
    setSelectedInitialContact(contact);
    setClientModalOpen(true);
  };

  const handleCloseClientModal = () => {
    setClientModalOpen(false);
    setSelectedInitialContact(null);
  };

  const handleRequestDelete = (contactId: number) => {
    setSelectedContactId(contactId);
    setConfirmOpen(true);
  };

  const handleSaveTicket = async (contactId: number) => {
    if (!contactId) return;
    setLoading(true);
    try {
      const { data: ticket } = await api.post("/tickets", {
        contactId,
        userId: user?.id,
        status: "open",
      });
      navigate(`/tickets/${ticket.id}`);
    } catch (err) {
      toastError(err);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteContact = async (contactId: number) => {
    if (!contactId) return;
    try {
      await api.delete(`/contacts/${contactId}`);
      toast.success(i18n.t("contacts.toasts.deleted"));
    } catch (err) {
      toastError(err);
    }
    setSelectedContactId(null);
    setSearchParam("");
    setPageNumber(1);
  };

  const handleImportContacts = async () => {
    try {
      await api.post("/contacts/import");
      toast.success(i18n.t("contacts.toasts.importSuccess"));
      setSearchParam("");
      setPageNumber(1);
    } catch (err) {
      toastError(err);
    }
  };

  return {
    contacts,
    loading,
    hasMore,
    searchParam,
    view,
    selectedContactId,
    contactModalOpen,
    clientModalOpen,
    selectedInitialContact,
    confirmOpen,
    importConfirmOpen,
    setView,
    setConfirmOpen,
    setImportConfirmOpen,
    handleSearch,
    handleScroll,
    handleOpenContactModal,
    handleCloseContactModal,
    handleOpenClientModal,
    handleCloseClientModal,
    handleEditContact,
    handleSaveTicket,
    handleDeleteContact,
    handleImportContacts,
    handleRequestDelete,
  };
}
