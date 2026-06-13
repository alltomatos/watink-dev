import React, { useState, useEffect, useReducer, useContext } from "react";
import { toast } from "react-toastify";
import openSocket from "../../services/socket-io";
import { useNavigate } from "react-router-dom";

import {
  makeStyles,
  Paper,
  IconButton,
  Avatar,
  Typography,
  Checkbox,
  FormControlLabel,
} from "@material-ui/core";

import { Search, Plus, Edit, Trash2 } from "lucide-react";
import { PageContainer, PageHeader, PageContent } from "../../components/ui/page-layout";
import { Button as ShadButton } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Badge } from "../../components/ui/badge";
import { Avatar as ShadAvatar } from "../../components/ui/avatar";
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

const reducer = (state, action) => {
  if (action.type === "LOAD_USERS") {
    const users = action.payload;
    const newUsers = [];

    users.forEach((user) => {
      const userIndex = state.findIndex((u) => u.id === user.id);
      if (userIndex !== -1) {
        state[userIndex] = user;
      } else {
        newUsers.push(user);
      }
    });

    return [...state, ...newUsers];
  }

  if (action.type === "UPDATE_USERS") {
    const user = action.payload;
    const userIndex = state.findIndex((u) => u.id === user.id);

    if (userIndex !== -1) {
      state[userIndex] = user;
      return [...state];
    } else {
      return [user, ...state];
    }
  }

  if (action.type === "DELETE_USER") {
    const userId = action.payload;

    const userIndex = state.findIndex((u) => u.id === userId);
    if (userIndex !== -1) {
      state.splice(userIndex, 1);
    }
    return [...state];
  }

  if (action.type === "RESET") {
    return [];
  }
};

const useStyles = makeStyles((theme) => ({
  userName: {
    fontWeight: 600,
    fontSize: "0.9rem",
  },
  userEmail: {
    color: "var(--text-secondary)",
    fontSize: "0.85rem",
  },
}));

const Users = () => {
  const classes = useStyles();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(false);
  const [pageNumber, setPageNumber] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [searchParam, setSearchParam] = useState("");
  const [users, dispatch] = useReducer(reducer, []);
  const [userModalOpen, setUserModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [confirmModalOpen, setConfirmModalOpen] = useState(false);
  const [deletingUser, setDeletingUser] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const { user: loggedInUser } = useContext(AuthContext);
  const [smtpPluginActive, setSmtpPluginActive] = useState(false);

  useEffect(() => {
    const fetchSmtpStatus = async () => {
      try {
        const { data } = await api.get("/settings/smtp");
        setSmtpPluginActive(data.active);
      } catch (err) {
        // Fallback for settings not found
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
          const { data } = await api.get("/users/", {
            params: { searchParam, pageNumber },
          });
          dispatch({ type: "LOAD_USERS", payload: data.users });
          setHasMore(data.hasMore);
          setLoading(false);
        } catch (err) {
          toastError(err);
        }
      };
      fetchUsers();
    }, 500);
    return () => clearTimeout(delayDebounceFn);
  }, [searchParam, pageNumber]);

  useEffect(() => {
    const socket = openSocket();

    if (!socket) return;

    socket.on("user", (data) => {
      if (data.action === "update" || data.action === "create") {
        dispatch({ type: "UPDATE_USERS", payload: data.user });
      }

      if (data.action === "delete") {
        dispatch({ type: "DELETE_USER", payload: +data.userId });
      }
    });

    return () => {
      socket.disconnect();
    };
  }, [loggedInUser]);

  const handleSearch = (event) => {
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

  const handleEditUser = (user) => {
    setSelectedUser(user);
    setUserModalOpen(true);
  };

  const handleDeleteUser = async (userId) => {
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

  const getInitials = (name) => {
    if (!name) return "";
    return name
      .split(" ")
      .slice(0, 2)
      .map((n) => n[0])
      .join("")
      .toUpperCase();
  };

  const getProfileStyle = (profile) => {
    switch (profile) {
      case "admin":
        return { color: "primary", label: "Admin" };
      case "supervisor":
        return { color: "secondary", label: "Supervisor" };
      default:
        return { color: "default", label: "Usuário" };
    }
  };

  return (
    <PageContainer>
      <ConfirmationModal
        title={
          deletingUser &&
          `${i18n.t("users.confirmationModal.deleteTitle")} ${deletingUser.name}?`
        }
        open={confirmModalOpen}
        onClose={setConfirmModalOpen}
        onConfirm={() => handleDeleteUser(deletingUser.id)}
        confirmDisabled={!confirmDelete}
      >
        <div className="mt-0">
          <Typography>
            {i18n.t("users.confirmationModal.deleteMessage")}
          </Typography>

          <div className="mt-4 mb-4 p-3 bg-slate-100 dark:bg-slate-800 rounded-lg border border-border">
            <Typography variant="body2" color="textPrimary">
              <strong>{i18n.t("users.table.name")}:</strong> {deletingUser?.name}
            </Typography>
            <Typography variant="body2" color="textPrimary">
              <strong>{i18n.t("users.table.email")}:</strong> {deletingUser?.email}
            </Typography>
          </div>

          <Typography variant="body2" className="text-destructive mb-3 font-bold">
            {i18n.t("users.confirmationModal.warning")}
          </Typography>

          <FormControlLabel
            control={
              <Checkbox
                checked={confirmDelete}
                onChange={(e) => setConfirmDelete(e.target.checked)}
                color="secondary"
              />
            }
            label={i18n.t("users.confirmationModal.confirmCheckbox")}
          />
        </div>
      </ConfirmationModal>

      <UserModal
        open={userModalOpen}
        onClose={handleCloseUserModal}
        userId={selectedUser && selectedUser.id}
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
              <ShadButton 
                onClick={handleOpenUserModal}
                className="gap-2"
              >
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
              const profileInfo = getProfileStyle(user.profile);
              return (
                <TableRow key={user.id}>
                  <TableCell className="text-center">
                    <ShadAvatar size="sm" name={user.name} />
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col">
                      <span className={classes.userName}>{user.name}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-center">
                    <span className={classes.userEmail}>{user.email}</span>
                  </TableCell>
                  {smtpPluginActive && (
                    <TableCell className="text-center">
                      <Badge variant={user.emailVerified ? "default" : "secondary"}>
                        {user.emailVerified ? "Sim" : "Não"}
                      </Badge>
                    </TableCell>
                  )}
                  <TableCell className="text-center">
                    <Badge variant={profileInfo.color === "primary" ? "default" : "outline"}>
                      {profileInfo.label}
                    </Badge>
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
            {loading && <TableRowSkeleton columns={6} />}
          </TableBody>
        </Table>
      </PageContent>
    </PageContainer>
  );
};

export default Users;
