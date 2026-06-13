/* @jsxImportSource react */
import React, { useState, useEffect, useReducer, useContext } from "react";
import openSocket from "../../services/socket-io";
import { toast } from "react-toastify";
import { useNavigate } from "react-router-dom";

import api from "../../services/api";
import { i18n } from "../../translate/i18n";
import { PageLayout, PageHeader, PageContent } from "../../components/ui/page-layout";
import ContactModal from "../../components/ContactModal";
import ConfirmationModal from "../../components/ConfirmationModal/";
import toastError from "../../errors/toastError";
import { AuthContext } from "../../context/Auth/AuthContext";
import { Can } from "../../components/Can";
import ClientModal from "../Clients/ClientModal";
import { useLocalStorage } from "../../hooks/useLocalStorage";
import { getBackendUrl } from "../../helpers/urlUtils";

import {
  Search,
  Plus,
  MessageSquare,
  Trash2,
  Edit,
  LayoutGrid,
  List,
  Download,
  Loader2,
  MoreVertical
} from "lucide-react";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from "../../components/ui/table";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Avatar } from "../../components/ui/avatar";
import { Badge } from "../../components/ui/badge";
import { Tooltip, TooltipContent, TooltipTrigger } from "../../components/ui/tooltip";
import ListItemCard from "../../components/ListItemCard";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from "../../components/ui/dropdown-menu";

const reducer = (state, action) => {
  if (action.type === "LOAD_CONTACTS") {
    const contacts = action.payload || [];
    if (contacts.length === 0) return [];
    const newContacts: any[] = [];

    contacts.forEach((contact: any) => {
      const contactIndex = state.findIndex((c) => c.id === contact.id);
      if (contactIndex !== -1) {
        state[contactIndex] = contact;
      } else {
        newContacts.push(contact);
      }
    });

    return [...state, ...newContacts];
  }

  if (action.type === "UPDATE_CONTACTS") {
    const contact = action.payload;
    const contactIndex = state.findIndex((c) => c.id === contact.id);

    if (contactIndex !== -1) {
      state[contactIndex] = contact;
      return [...state];
    } else {
      return [contact, ...state];
    }
  }

  if (action.type === "DELETE_CONTACT") {
    const contactId = action.payload;
    const contactIndex = state.findIndex((c) => c.id === contactId);
    if (contactIndex !== -1) {
      state.splice(contactIndex, 1);
    }
    return [...state];
  }

  if (action.type === "RESET") {
    return [];
  }
  return state;
};

const Contacts = () => {
  const navigate = useNavigate();
  const { user } = useContext(AuthContext);

  const [loading, setLoading] = useState(false);
  const [pageNumber, setPageNumber] = useState(1);
  const [searchParam, setSearchParam] = useState("");
  const [contacts, dispatch] = useReducer(reducer, []);
  const [selectedContactId, setSelectedContactId] = useState(null);
  const [contactModalOpen, setContactModalOpen] = useState(false);
  const [clientModalOpen, setClientModalOpen] = useState(false);
  const [selectedInitialContact, setSelectedInitialContact] = useState(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [importConfirmOpen, setImportConfirmOpen] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [view, setView] = useLocalStorage("contactsView", "table");

  useEffect(() => {
    dispatch({ type: "RESET" });
    setPageNumber(1);
  }, [searchParam]);

  useEffect(() => {
    setLoading(true);
    const delayDebounceFn = setTimeout(() => {
      const fetchContacts = async () => {
        try {
          const { data } = await api.get("/contacts/", {
            params: { searchParam, pageNumber },
          });
          dispatch({ type: "LOAD_CONTACTS", payload: data.contacts });
          setHasMore(data.hasMore);
          setLoading(false);
        } catch (err) {
          toastError(err);
        }
      };
      fetchContacts();
    }, 500);
    return () => clearTimeout(delayDebounceFn);
  }, [searchParam, pageNumber]);

  useEffect(() => {
    const socket = openSocket();
    socket.on("contact", (data) => {
      if (data.action === "update" || data.action === "create") {
        dispatch({ type: "UPDATE_CONTACTS", payload: data.contact });
      }
      if (data.action === "delete") {
        dispatch({ type: "DELETE_CONTACT", payload: +data.contactId });
      }
    });
    return () => {
      socket.disconnect();
    };
  }, []);

  const handleSearch = (event) => {
    setSearchParam(event.target.value.toLowerCase());
  };

  const handleOpenContactModal = () => {
    setSelectedContactId(null);
    setContactModalOpen(true);
  };

  const handleCloseContactModal = () => {
    setSelectedContactId(null);
    setContactModalOpen(false);
  };

  const handleOpenClientModal = (contact) => {
    setSelectedInitialContact(contact);
    setClientModalOpen(true);
  };

  const handleSaveTicket = async (contactId) => {
    if (!contactId) return;
    setLoading(true);
    try {
      const { data: ticket } = await api.post("/tickets", {
        contactId: contactId,
        userId: user?.id,
        status: "open",
      });
      navigate(`/tickets/${ticket.id}`);
    } catch (err) {
      toastError(err);
    }
    setLoading(false);
  };

  const handleDeleteContact = async (contactId) => {
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

  const loadMore = () => {
    setPageNumber((prevPageNumber) => prevPageNumber + 1);
  };

  const handleScroll = (e) => {
    if (!hasMore || loading) return;
    const { scrollTop, scrollHeight, clientHeight } = e.currentTarget;
    if (scrollHeight - (scrollTop + clientHeight) < 100) {
      loadMore();
    }
  };

  const getContactStatus = (contact) => {
    if (contact.isGroup || contact.number?.includes("@g.us")) {
      return <Badge variant="secondary">Grupo</Badge>;
    }
    if (contact.lid) {
      return <Badge variant="outline" className="text-green-600 border-green-300">Verificado</Badge>;
    }
    return <Badge variant="outline" className="text-muted-foreground">Pendente</Badge>;
  };

  return (
    <PageLayout>
      <ContactModal
        open={contactModalOpen}
        onClose={handleCloseContactModal}
        aria-labelledby="form-dialog-title"
        contactId={selectedContactId}
      />

      {clientModalOpen && (
        <ClientModal
          open={clientModalOpen}
          onClose={() => {
            setClientModalOpen(false);
            setSelectedInitialContact(null);
          }}
          initialContact={selectedInitialContact}
        />
      )}

      <ConfirmationModal
        title={i18n.t("contacts.confirmationModal.deleteTitle")}
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        onConfirm={() => handleDeleteContact(selectedContactId)}
      >
        {i18n.t("contacts.confirmationModal.deleteMessage")}
      </ConfirmationModal>

      <ConfirmationModal
        title={i18n.t("contacts.confirmationModal.importTitlte")}
        open={importConfirmOpen}
        onClose={() => setImportConfirmOpen(false)}
        onConfirm={handleImportContacts}
      >
        {i18n.t("contacts.confirmationModal.importMessage")}
      </ConfirmationModal>

      <PageHeader title={i18n.t("contacts.title")} description={`${contacts.length} contatos encontrados`}>
        <div className="flex items-center gap-2">
          <div className="relative w-full max-w-sm hidden md:block">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder={i18n.t("contacts.searchPlaceholder")}
              value={searchParam}
              onChange={handleSearch}
              className="pl-9 h-10"
            />
          </div>

          <Button variant="outline" size="sm" onClick={() => setImportConfirmOpen(true)} className="hidden sm:flex">
            <Download className="mr-2 h-4 w-4" />
            {i18n.t("contacts.buttons.import")}
          </Button>

          <Button size="sm" onClick={handleOpenContactModal}>
            <Plus className="mr-2 h-4 w-4" />
            {i18n.t("contacts.buttons.add")}
          </Button>

          <div className="flex items-center border rounded-md p-1 bg-muted/50">
            <Button
              variant={view === "table" ? "secondary" : "ghost"}
              size="icon"
              className="h-8 w-8 rounded-sm"
              onClick={() => setView("table")}
            >
              <List className="h-4 w-4" />
            </Button>
            <Button
              variant={view === "card" ? "secondary" : "ghost"}
              size="icon"
              className="h-8 w-8 rounded-sm"
              onClick={() => setView("card")}
            >
              <LayoutGrid className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </PageHeader>

      <PageContent onScroll={handleScroll}>
        {view === "table" ? (
          <div className="rounded-md border bg-card">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[80px]"></TableHead>
                  <TableHead>{i18n.t("contacts.table.name")}</TableHead>
                  <TableHead>{i18n.t("contacts.table.number")}</TableHead>
                  <TableHead>{i18n.t("contacts.table.email")}</TableHead>
                  <TableHead className="text-right">{i18n.t("contacts.table.actions")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading && contacts.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="h-24 text-center">
                      <div className="flex items-center justify-center">
                        <Loader2 className="h-6 w-6 animate-spin text-primary" />
                      </div>
                    </TableCell>
                  </TableRow>
                ) : contacts.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                      Nenhum contato pode ser carregado.
                    </TableCell>
                  </TableRow>
                ) : (
                  contacts.map((contact) => (
                    <TableRow key={contact.id} className="group">
                      <TableCell>
                        <Avatar src={getBackendUrl(contact.profilePicUrl)} name={contact.name} size="sm" />
                      </TableCell>
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          {contact.name}
                          {getContactStatus(contact)}
                        </div>
                      </TableCell>
                      <TableCell>{contact.number}</TableCell>
                      <TableCell>{contact.email}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-green-600 hover:text-green-700 hover:bg-green-50"
                                onClick={() => handleSaveTicket(contact.id)}
                              >
                                <MessageSquare className="h-4 w-4" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>Iniciar Conversa</TooltipContent>
                          </Tooltip>

                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8">
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => {
                                setSelectedContactId(contact.id);
                                setContactModalOpen(true);
                              }}>
                                <Edit className="mr-2 h-4 w-4" />
                                <span>Editar</span>
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleOpenClientModal(contact)}>
                                <Plus className="mr-2 h-4 w-4" />
                                <span>Tornar Cliente</span>
                              </DropdownMenuItem>
                              <Can
                                user={user}
                                perform="contacts-page:deleteContact"
                                yes={() => (
                                  <DropdownMenuItem
                                    className="text-destructive focus:text-destructive"
                                    onClick={() => {
                                      setSelectedContactId(contact.id);
                                      setConfirmOpen(true);
                                    }}
                                  >
                                    <Trash2 className="mr-2 h-4 w-4" />
                                    <span>Excluir</span>
                                  </DropdownMenuItem>
                                )}
                              />
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 pb-8">
            {contacts.map((contact) => (
              <ListItemCard
                key={contact.id}
                avatar={getBackendUrl(contact.profilePicUrl)}
                title={contact.name}
                subtitle={contact.number}
                status={getContactStatus(contact)}
                actions={
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => handleSaveTicket(contact.id)}
                    >
                      <MessageSquare className="h-4 w-4 text-green-600" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => {
                        setSelectedContactId(contact.id);
                        setContactModalOpen(true);
                      }}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => handleOpenClientModal(contact)}
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                    <Can
                      user={user}
                      perform="contacts-page:deleteContact"
                      yes={() => (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive"
                          onClick={() => {
                            setSelectedContactId(contact.id);
                            setConfirmOpen(true);
                          }}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    />
                  </div>
                }
              />
            ))}
            {loading && (
              <div className="col-span-full flex justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            )}
          </div>
        )}
      </PageContent>
    </PageLayout>
  );
};

export default Contacts;
