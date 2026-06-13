/* @jsxImportSource react */
import React, { useState, useEffect, useReducer, useContext } from "react";
import { toast } from "react-toastify";
import { 
  Search, 
  Plus, 
  Edit, 
  Trash2, 
  Loader2,
  Users 
} from "lucide-react";

import api from "../../services/api";
import { i18n } from "../../translate/i18n";
import toastError from "../../errors/toastError";
import ConfirmationModal from "../../components/ConfirmationModal";
import GroupModal from "./GroupModal";
import { AuthContext } from "../../context/Auth/AuthContext";
import { Can } from "../../components/Can";

import { 
  PageContainer, 
  PageHeader, 
  PageContent 
} from "../../components/ui/page-layout";
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

const reducer = (state, action) => {
  if (action.type === "LOAD_GROUPS") {
    const groups = action.payload;
    const newGroups = [];

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

const Groups = () => {
  const { user } = useContext(AuthContext);

  const [loading, setLoading] = useState(false);
  const [searchParam, setSearchParam] = useState("");
  const [groups, dispatch] = useReducer(reducer, []);
  const [selectedGroup, setSelectedGroup] = useState(null);
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

  const handleSearch = (event) => {
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

  const handleEditGroup = (group) => {
    setSelectedGroup(group);
    setGroupModalOpen(true);
  };

  const handleDeleteGroup = async (groupId) => {
    try {
      await api.delete(`/groups/${groupId}`);
      toast.success(i18n.t("groups.toasts.deleted"));
      dispatch({ type: "DELETE_GROUP", payload: groupId });
    } catch (err) {
      toastError(err);
    }
    setSelectedGroup(null);
  };

  return (
    <PageContainer>
      <GroupModal
        open={groupModalOpen}
        onClose={handleCloseGroupModal}
        groupId={selectedGroup?.id}
      />
      <ConfirmationModal
        title={
          selectedGroup &&
          `${i18n.t("groups.confirmationModal.deleteTitle")} ${selectedGroup.name}?`
        }
        open={confirmModalOpen}
        onClose={() => setConfirmModalOpen(false)}
        onConfirm={() => handleDeleteGroup(selectedGroup.id)}
      >
        {i18n.t("groups.confirmationModal.deleteMessage")}
      </ConfirmationModal>

      <PageHeader 
        title={i18n.t("groups.title")}
        description="Gerencie os grupos de atendimento e permissões coletivas"
      >
        <div className="flex items-center gap-2">
          <div className="relative w-full max-w-sm hidden md:block">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder={i18n.t("groups.searchPlaceholder")}
              value={searchParam}
              onChange={handleSearch}
              className="pl-9 h-10"
            />
          </div>
          <Can
            user={user}
            perform="groups:create"
            yes={() => (
              <Button onClick={handleOpenGroupModal}>
                <Plus className="mr-2 h-4 w-4" />
                {i18n.t("groups.buttons.add")}
              </Button>
            )}
          />
        </div>
      </PageHeader>

      <PageContent>
        <div className="rounded-md border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{i18n.t("groups.table.name")}</TableHead>
                <TableHead className="text-right w-[100px]">{i18n.t("groups.table.actions")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {groups.map((group) => (
                <TableRow key={group.id}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Users className="h-4 w-4 text-primary" />
                      <span className="font-semibold">{group.name}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Can
                        user={user}
                        perform="groups:edit"
                        yes={() => (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => handleEditGroup(group)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                        )}
                      />
                      <Can
                        user={user}
                        perform="groups:delete"
                        yes={() => (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-destructive"
                            onClick={() => {
                              setSelectedGroup(group);
                              setConfirmModalOpen(true);
                            }}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      />
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {loading && (
                <TableRow>
                  <TableCell colSpan={2} className="h-24 text-center">
                    <div className="flex items-center justify-center">
                      <Loader2 className="h-6 w-6 animate-spin text-primary" />
                    </div>
                  </TableCell>
                </TableRow>
              )}
              {!loading && groups.length === 0 && (
                <TableRow>
                  <TableCell colSpan={2} className="h-24 text-center text-muted-foreground">
                    Nenhum grupo encontrado.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </PageContent>
    </PageContainer>
  );
};

export default Groups;
