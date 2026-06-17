/* @jsxImportSource react */
import React, { useState, useEffect, useReducer, useContext } from "react";
import { toast } from "react-toastify";
import openSocket from "../../services/socket-io";

import { Search, Plus, Edit, Trash2 } from "lucide-react";
import { PageContainer, PageHeader, PageContent } from "../../components/ui/page-layout";
import { Button as ShadButton } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Badge } from "../../components/ui/badge";
import { Avatar as ShadAvatar } from "../../components/ui/avatar";
import { Checkbox } from "../../components/ui/checkbox";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../../components/ui/table";
import api from "../../services/api";
import { i18n } from "../../translate/i18n";
import TableRowSkeleton from "../../components/TableRowSkeleton";
import ConfirmationModal from "../../components/ConfirmationModal";
import UserModal from "../../components/UserModal";
import toastError from "../../errors/toastError";
import { AuthContext } from "../../context/Auth/AuthContext";
import { Can } from "../../components/Can";

// ─── Types ───────────────────────────────────────────────────────────────────

interface User {
  id: number | string;
  name: string;
  email: string;
  profile: string;
  emailVerified?: boolean;
}

type Action =
  | { type: "LOAD_USERS"; payload: User[] }
  | { type: "UPDATE_USERS"; payload: User }
  | { type: "DELETE_USER"; payload: number | string }
  | { type: "RESET" };

// ─── Reducer ─────────────────────────────────────────────────────────────────

const reducer = (state: User[], action: Action): User[] => {
  if (action.type === "LOAD_USERS") {
    const newUsers: User[] = [];
    action.payload.forEach((user) => {
      const idx = state.findIndex((u) => u.id === user.id);
      if (idx !== -1) {
        state[idx] = user;
      } else {
        newUsers.push(user);
      }
    });
    return [...state, ...newUsers];
  }

  if (action.type === "UPDATE_USERS") {
    const idx = state.findIndex((u) => u.id === action.payload.id);
    if (idx !== -1) {
      const next = [...state];
      next[idx] = action.payload;
      return next;
    }
    return [action.payload, ...state];
  }

  if (action.type === "DELETE_USER") {
    return state.filter((u) => u.id !== action.payload);
  }

  if (action.type === "RESET") {
    return [];
  }

  return state;
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

const getProfileInfo = (profile: string): { variant: "default" | "outline" | "secondary"; label: string } => {
  switch (profile) {
    case "admin":
      return { variant: "default", label: "Admin" };
    case "supervisor":
      return { variant: "secondary", label: "Supervisor" };
    default:
      return { variant: "outline", label: "Usuário" };
  }
};

// ─── Component ────────────────────────────────────────────────────────────────

const Users: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [pageNumber, setPageNumber] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [searchParam, setSearchParam] = useState("");
  const [users, dispatch] = useReducer(reducer, []);
  const [userModalOpen, setUserModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [confirmModalOpen, setConfirmModalOpen] = useState(false);
  const [deletingUser, setDeletingUser] = useState<User | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const { user: loggedInUser } = useContext(AuthContext);
  const [smtpPluginActive, setSmtpPluginActive] = useState(false);

  useEffect(() => {
    const fetchSmtpStatus = async () => {
      try {
        const { data } = await api.get<{ active: boolean }>("/settings/smtp");
        setSmtpPluginActive(data.active);
      } catch {
        // plugin não instalado — silencioso
      }
    };
    fetchSmtpStatus();
  }, []);

  useEffect(() => {
    dispatch({ type: "RESET" });
    setPageNumber(1);
  }, [searchParam]);

  useEffect(() => {
    setLoading(true);
    const delayDebounceFn = setTimeout(() => {
      const fetchUsers = async () => {
        try {
          const { data } = await api.get<{ users: User[]; hasMore: boolean }>("/users/", {
            params: { searchParam, pageNumber },
          });
          dispatch({ type: "LOAD_USERS", payload: data.users });
          setHasMore(data.hasMore);
        } catch (err) {
          toastError(err);
        } finally {
          setLoading(false);
        }
      };
      fetchUsers();
    }, 500);
    return () => clearTimeout(delayDebounceFn);
  }, [searchParam, pageNumber]);

  useEffect(() => {
    const socket = openSocket();
    if (!socket) return;

    socket.on("user", (data: { action: string; user?: User; userId?: number | string }) => {
      if (data.action === "update" || data.action === "create") {
        dispatch({ type: "UPDATE_USERS", payload: data.user! });
      }
      if (data.action === "delete") {
        dispatch({ type: "DELETE_USER", payload: data.userId! });
      }
    });

    return () => {
      socket.disconnect();
    };
  }, [loggedInUser]);

  const handleSearch = (event: React.ChangeEvent<HTMLInputElement>) => {
    setSearchParam(event.target.value.toLowerCase());
  };

  const handleOpenUserModal = () => {
    setSelectedUser(null);
    setUserModalOpen(true);
  };

  const handleCloseUserModal = () => {
    setSelectedUser(null);
    setUserModalOpen(false);
  };

  const handleEditUser = (user: User) => {
    setSelectedUser(user);
    setUserModalOpen(true);
  };

  const handleDeleteUser = async (userId: number | string) => {
    try {
      await api.delete(`/users/${userId}`);
      setPageNumber(1);
      toast.success(i18n.t("users.toasts.deleted"));
    } catch (err) {
      toastError(err);
    }
    setDeletingUser(null);
    setSearchParam("");
    setConfirmDelete(false);
  };

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    if (!hasMore || loading) return;
    const { scrollTop, scrollHeight, clientHeight } = e.currentTarget;
    if (scrollHeight - (scrollTop + clientHeight) < 100) {
      setPageNumber((prev) => prev + 1);
    }
  };

  const colSpan = smtpPluginActive ? 6 : 5;

  return (
    <PageContainer>
      <ConfirmationModal
        title={
          deletingUser
            ? `${i18n.t("users.confirmationModal.deleteTitle")} ${deletingUser.name}?`
            : ""
        }
        open={confirmModalOpen}
        onClose={() => {
          setConfirmModalOpen(false);
          setConfirmDelete(false);
        }}
        onConfirm={() => deletingUser && handleDeleteUser(deletingUser.id)}
      >
        <div className="space-y-4">
          <p className="text-sm">{i18n.t("users.confirmationModal.deleteMessage")}</p>

          {deletingUser && (
            <div className="rounded-lg border border-border bg-muted/40 p-3 text-sm space-y-1">
              <p>
                <strong>{i18n.t("users.table.name")}:</strong> {deletingUser.name}
              </p>
              <p>
                <strong>{i18n.t("users.table.email")}:</strong> {deletingUser.email}
              </p>
            </div>
          )}

          <p className="text-sm font-bold text-destructive">
            {i18n.t("users.confirmationModal.warning")}
          </p>

          <label className="flex items-center gap-2 cursor-pointer">
            <Checkbox
              checked={confirmDelete}
              onCheckedChange={(v) => setConfirmDelete(!!v)}
            />
            <span className="text-sm">{i18n.t("users.confirmationModal.confirmCheckbox")}</span>
          </label>
        </div>
      </ConfirmationModal>

      <UserModal
        open={userModalOpen}
        onClose={handleCloseUserModal}
        userId={selectedUser?.id}
      />

      <PageHeader title={i18n.t("users.title")}>
        <div className="flex items-center gap-2">
          <div className="relative w-64 group">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground transition-colors group-focus-within:text-primary" />
            <Input
              className="pl-9 h-10"
              placeholder={i18n.t("contacts.searchPlaceholder")}
              type="search"
              value={searchParam}
              onChange={handleSearch}
            />
          </div>
          <Can
            user={loggedInUser}
            perform="users:create"
            yes={() => (
              <ShadButton onClick={handleOpenUserModal} className="gap-2">
                <Plus className="h-4 w-4" />
                {i18n.t("users.buttons.add")}
              </ShadButton>
            )}
          />
        </div>
      </PageHeader>

      <PageContent onScroll={handleScroll}>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-16 text-center">Avatar</TableHead>
              <TableHead>{i18n.t("users.table.name")}</TableHead>
              <TableHead className="text-center">{i18n.t("users.table.email")}</TableHead>
              {smtpPluginActive && (
                <TableHead className="text-center">{i18n.t("users.table.emailVerified")}</TableHead>
              )}
              <TableHead className="text-center">{i18n.t("users.table.profile")}</TableHead>
              <TableHead className="text-right">{i18n.t("users.table.actions")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.map((user) => {
              const profileInfo = getProfileInfo(user.profile);
              return (
                <TableRow key={user.id}>
                  <TableCell className="text-center">
                    <ShadAvatar size="sm" name={user.name} />
                  </TableCell>
                  <TableCell>
                    <span className="font-semibold text-sm">{user.name}</span>
                  </TableCell>
                  <TableCell className="text-center">
                    <span className="text-sm text-muted-foreground">{user.email}</span>
                  </TableCell>
                  {smtpPluginActive && (
                    <TableCell className="text-center">
                      <Badge variant={user.emailVerified ? "default" : "secondary"}>
                        {user.emailVerified ? "Sim" : "Não"}
                      </Badge>
                    </TableCell>
                  )}
                  <TableCell className="text-center">
                    <Badge variant={profileInfo.variant}>{profileInfo.label}</Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <ShadButton
                        variant="ghost"
                        size="icon"
                        onClick={() => handleEditUser(user)}
                        className="h-8 w-8 text-primary hover:text-primary hover:bg-primary/10"
                      >
                        <Edit className="h-4 w-4" />
                      </ShadButton>
                      <ShadButton
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          setConfirmModalOpen(true);
                          setDeletingUser(user);
                        }}
                        className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                      >
                        <Trash2 className="h-4 w-4" />
                      </ShadButton>
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
            {loading && <TableRowSkeleton columns={colSpan} />}
          </TableBody>
        </Table>
      </PageContent>
    </PageContainer>
  );
};

export default Users;
