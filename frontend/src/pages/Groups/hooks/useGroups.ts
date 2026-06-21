import { useState, useEffect, useReducer } from "react";
import { toast } from "react-toastify";

import api from "../../../services/api";
import { i18n } from "../../../translate/i18n";
import toastError from "../../../errors/toastError";
import { Group, GroupsAction } from "../groupsTypes";

const reducer = (state: Group[], action: GroupsAction): Group[] => {
  if (action.type === "LOAD_GROUPS") {
    const groups = action.payload;
    const newGroups: Group[] = [];
    groups.forEach((group) => {
      const groupIndex = state.findIndex((g) => g.id === group.id);
      if (groupIndex !== -1) {
        state[groupIndex] = group;
      } else {
        newGroups.push(group);
      }
    });
    return [...state, ...newGroups];
  }

  if (action.type === "UPDATE_GROUPS") {
    const group = action.payload;
    const groupIndex = state.findIndex((g) => g.id === group.id);
    if (groupIndex !== -1) {
      state[groupIndex] = group;
      return [...state];
    } else {
      return [group, ...state];
    }
  }

  if (action.type === "DELETE_GROUP") {
    const groupId = action.payload;
    const groupIndex = state.findIndex((g) => g.id === groupId);
    if (groupIndex !== -1) {
      state.splice(groupIndex, 1);
    }
    return [...state];
  }

  if (action.type === "RESET") {
    return [];
  }

  return state;
};

interface UseGroupsReturn {
  groups: Group[];
  loading: boolean;
  searchParam: string;
  selectedGroup: Group | null;
  groupModalOpen: boolean;
  confirmModalOpen: boolean;
  handleSearch: (event: React.ChangeEvent<HTMLInputElement>) => void;
  handleOpenGroupModal: () => void;
  handleCloseGroupModal: () => void;
  handleEditGroup: (group: Group) => void;
  handleDeleteGroup: (groupId: number) => Promise<void>;
  setSelectedGroup: (group: Group | null) => void;
  setConfirmModalOpen: (open: boolean) => void;
}

export const useGroups = (): UseGroupsReturn => {
  const [loading, setLoading] = useState(false);
  const [searchParam, setSearchParam] = useState("");
  const [groups, dispatch] = useReducer(reducer, []);
  const [selectedGroup, setSelectedGroup] = useState<Group | null>(null);
  const [groupModalOpen, setGroupModalOpen] = useState(false);
  const [confirmModalOpen, setConfirmModalOpen] = useState(false);

  useEffect(() => {
    dispatch({ type: "RESET" });
  }, [searchParam]);

  useEffect(() => {
    setLoading(true);
    const delayDebounceFn = setTimeout(() => {
      const fetchGroups = async () => {
        try {
          const { data } = await api.get("/groups", {
            params: { searchParam },
          });
          dispatch({ type: "LOAD_GROUPS", payload: data });
          setLoading(false);
        } catch (err) {
          toastError(err);
        }
      };
      fetchGroups();
    }, 500);
    return () => clearTimeout(delayDebounceFn);
  }, [searchParam]);

  const handleSearch = (event: React.ChangeEvent<HTMLInputElement>) => {
    setSearchParam(event.target.value.toLowerCase());
  };

  const handleOpenGroupModal = () => {
    setSelectedGroup(null);
    setGroupModalOpen(true);
  };

  const handleCloseGroupModal = () => {
    setSelectedGroup(null);
    setGroupModalOpen(false);
  };

  const handleEditGroup = (group: Group) => {
    setSelectedGroup(group);
    setGroupModalOpen(true);
  };

  const handleDeleteGroup = async (groupId: number) => {
    try {
      await api.delete(`/groups/${groupId}`);
      toast.success(i18n.t("groups.toasts.deleted"));
      dispatch({ type: "DELETE_GROUP", payload: groupId });
    } catch (err) {
      toastError(err);
    }
    setSelectedGroup(null);
  };

  return {
    groups,
    loading,
    searchParam,
    selectedGroup,
    groupModalOpen,
    confirmModalOpen,
    handleSearch,
    handleOpenGroupModal,
    handleCloseGroupModal,
    handleEditGroup,
    handleDeleteGroup,
    setSelectedGroup,
    setConfirmModalOpen,
  };
};
