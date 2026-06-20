import { useState, useEffect, useReducer, useContext } from "react";
import { toast } from "react-toastify";
import openSocket from "../../../services/socket-io";
import api from "../../../services/api";
import { i18n } from "../../../translate/i18n";
import toastError from "../../../errors/toastError";
import { AuthContext } from "../../../context/Auth/AuthContext";
import { User, UsersAction } from "../usersTypes";

// ─── Reducer ─────────────────────────────────────────────────────────────────

const usersReducer = (state: User[], action: UsersAction): User[] => {
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

// ─── Hook ────────────────────────────────────────────────────────────────────

export interface UseUsersReturn {
  users: User[];
  loading: boolean;
  hasMore: boolean;
  searchParam: string;
  userModalOpen: boolean;
  selectedUser: User | null;
  confirmModalOpen: boolean;
  deletingUser: User | null;
  confirmDelete: boolean;
  smtpPluginActive: boolean;
  handleSearch: (e: React.ChangeEvent<HTMLInputElement>) => void;
  handleOpenUserModal: () => void;
  handleCloseUserModal: () => void;
  handleEditUser: (user: User) => void;
  handleDeleteUser: (userId: number | string) => Promise<void>;
  handleScroll: (e: React.UIEvent<HTMLDivElement>) => void;
  setConfirmModalOpen: (open: boolean) => void;
  setDeletingUser: (user: User | null) => void;
  setConfirmDelete: (v: boolean) => void;
}

const useUsers = (): UseUsersReturn => {
  const [loading, setLoading] = useState(false);
  const [pageNumber, setPageNumber] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [searchParam, setSearchParam] = useState("");
  const [users, dispatch] = useReducer(usersReducer, []);
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

  return {
    users,
    loading,
    hasMore,
    searchParam,
    userModalOpen,
    selectedUser,
    confirmModalOpen,
    deletingUser,
    confirmDelete,
    smtpPluginActive,
    handleSearch,
    handleOpenUserModal,
    handleCloseUserModal,
    handleEditUser,
    handleDeleteUser,
    handleScroll,
    setConfirmModalOpen,
    setDeletingUser,
    setConfirmDelete,
  };
};

export default useUsers;
