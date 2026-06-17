/* @jsxImportSource react */
import React, { useState, useEffect, useReducer } from "react";
import openSocket from "../../services/socket-io";
import { 
  Plus, 
  Search, 
  Edit, 
  Trash2, 
  Archive, 
  RotateCcw,
  Loader2
} from "lucide-react";
import { toast } from "react-toastify";

import api from "../../services/api";
import { i18n } from "../../translate/i18n";
import toastError from "../../errors/toastError";

import {
  PageLayout,
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
import { Badge } from "../../components/ui/badge";
import TagModal from "../../components/TagModal";
import ConfirmationModal from "../../components/ConfirmationModal";

const reducer = (state: any[], action: { type: string; payload?: any }): any[] => {
  if (action.type === "LOAD_TAGS") {
    const tags = action.payload || [];
    if (tags.length === 0) return [];
    const newTags: any[] = [];

    tags.forEach((tag: any) => {
      const tagIndex = state.findIndex((s) => s.id === tag.id);
      if (tagIndex !== -1) {
        state[tagIndex] = tag;
      } else {
        newTags.push(tag);
      }
    });

    return [...state, ...newTags];
  }

  if (action.type === "UPDATE_TAGS") {
    const tag = action.payload;
    const tagIndex = state.findIndex((s) => s.id === tag.id);

    if (tagIndex !== -1) {
      state[tagIndex] = tag;
      return [...state];
    } else {
      return [tag, ...state];
    }
  }

  if (action.type === "DELETE_TAG") {
    const tagId = action.payload;
    const tagIndex = state.findIndex((s) => s.id === tagId);
    if (tagIndex !== -1) {
      state.splice(tagIndex, 1);
    }
    return [...state];
  }

  if (action.type === "RESET") {
    return [];
  }
  return state;
};

const TagManager = () => {
  const [loading, setLoading] = useState(false);
  const [searchParam, setSearchParam] = useState("");
  const [tags, dispatch] = useReducer(reducer, []);
  const [showArchived, setShowArchived] = useState(false);
  const [selectedTag, setSelectedTag] = useState<any>(null);
  const [tagModalOpen, setTagModalOpen] = useState(false);
  const [confirmModalOpen, setConfirmModalOpen] = useState(false);

  useEffect(() => {
    dispatch({ type: "RESET" });
  }, [searchParam, showArchived]);

  useEffect(() => {
    setLoading(true);
    const delayDebounceFn = setTimeout(() => {
      const fetchTags = async () => {
        try {
          // Backend retorna array plano; suporta includeArchived
          const { data } = await api.get("/tags", {
            params: { searchParam, includeArchived: showArchived },
          });
          dispatch({ type: "LOAD_TAGS", payload: Array.isArray(data) ? data : [] });
          setLoading(false);
        } catch (err) {
          toastError(err);
          setLoading(false);
        }
      };
      fetchTags();
    }, 500);
    return () => clearTimeout(delayDebounceFn);
  }, [searchParam, showArchived]);

  useEffect(() => {
    const socket = openSocket();
    if (!socket) return;

    socket.on("tag", (data) => {
      if (data.action === "update" || data.action === "create") {
        dispatch({ type: "UPDATE_TAGS", payload: data.tag });
      }

      if (data.action === "delete") {
        dispatch({ type: "DELETE_TAG", payload: +data.tagId });
      }
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  const handleSearch = (event: React.ChangeEvent<HTMLInputElement>) => {
    setSearchParam(event.target.value.toLowerCase());
  };

  const handleOpenTagModal = () => {
    setSelectedTag(null);
    setTagModalOpen(true);
  };

  const handleCloseTagModal = () => {
    setSelectedTag(null);
    setTagModalOpen(false);
  };

  const handleEditTag = (tag: any) => {
    setSelectedTag(tag);
    setTagModalOpen(true);
  };

  // Exclusão definitiva (forceDelete); sem o parâmetro o backend apenas arquiva
  const handleDeleteTag = async (tagId: any) => {
    try {
      await api.delete(`/tags/${tagId}?forceDelete=true`);
      toast.success(i18n.t("tags.toasts.deleted"));
      dispatch({ type: "DELETE_TAG", payload: tagId });
    } catch (err) {
      toastError(err);
    }
    setSelectedTag(null);
    setConfirmModalOpen(false);
  };

  // Arquivar (soft delete) ou restaurar
  const handleToggleArchive = async (tag: any) => {
    try {
      await api.put(`/tags/${tag.id}`, { ...tag, archived: !tag.archived });
      toast.success(
        tag.archived
          ? i18n.t("tags.toasts.restored")
          : i18n.t("tags.toasts.archived")
      );
      dispatch({ type: "DELETE_TAG", payload: tag.id });
    } catch (err) {
      toastError(err);
    }
  };

  return (
    <PageLayout>
      <TagModal
        open={tagModalOpen}
        onClose={handleCloseTagModal}
        aria-labelledby="form-dialog-title"
        tagId={selectedTag?.id}
      />
      <ConfirmationModal
        title={
          selectedTag &&
          `${i18n.t("tags.confirmationModal.deleteTitle")} ${selectedTag.name}?`
        }
        open={confirmModalOpen}
        onClose={() => setConfirmModalOpen(false)}
        onConfirm={() => handleDeleteTag(selectedTag.id)}
      >
        {i18n.t("tags.confirmationModal.deleteMessage")}
      </ConfirmationModal>

      <PageHeader 
        title={i18n.t("tags.title") as string}
        description="Gerencie as etiquetas para organizar seus atendimentos"
      >
        <div className="flex items-center gap-2">
          <div className="relative w-full max-w-sm hidden md:block">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder={i18n.t("tags.searchPlaceholder") as string}
              value={searchParam}
              onChange={handleSearch}
              className="pl-9 h-10"
            />
          </div>
          <Button
            variant={showArchived ? "secondary" : "ghost"}
            onClick={() => setShowArchived((prev) => !prev)}
          >
            <Archive className="mr-2 h-4 w-4" />
            {showArchived ? "Ocultar arquivadas" : "Ver arquivadas"}
          </Button>
          <Button onClick={handleOpenTagModal}>
            <Plus className="mr-2 h-4 w-4" />
            {i18n.t("tags.buttons.add")}
          </Button>
        </div>
      </PageHeader>

      <PageContent>
        <div className="rounded-md border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{i18n.t("tags.table.name")}</TableHead>
                <TableHead>Grupo</TableHead>
                <TableHead>Descrição</TableHead>
                <TableHead className="text-center w-[80px]">Uso</TableHead>
                <TableHead className="text-right w-[140px]">{i18n.t("tags.table.actions")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {tags
                .filter((tag) => tag.name?.toLowerCase().includes(searchParam))
                .map((tag) => (
                <TableRow key={tag.id} className={tag.archived ? "opacity-60" : ""}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <div
                        className="h-4 w-4 rounded-full border border-black/10 shadow-sm"
                        style={{ backgroundColor: tag.color || "var(--muted)" }}
                      />
                      <span className="font-semibold">{tag.name}</span>
                      {tag.archived && (
                        <Badge variant="outline" className="text-[10px]">Arquivada</Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {tag.group?.name || "-"}
                  </TableCell>
                  <TableCell className="text-muted-foreground max-w-xs truncate">
                    {tag.description || "-"}
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge variant="secondary">{tag.usageCount ?? 0}</Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => handleEditTag(tag)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        title={tag.archived ? "Restaurar" : "Arquivar"}
                        onClick={() => handleToggleArchive(tag)}
                      >
                        {tag.archived ? (
                          <RotateCcw className="h-4 w-4" />
                        ) : (
                          <Archive className="h-4 w-4" />
                        )}
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive"
                        onClick={() => {
                          setSelectedTag(tag);
                          setConfirmModalOpen(true);
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {loading && (
                <TableRow>
                  <TableCell colSpan={5} className="h-24 text-center">
                    <div className="flex items-center justify-center">
                      <Loader2 className="h-6 w-6 animate-spin text-primary" />
                    </div>
                  </TableCell>
                </TableRow>
              )}
              {!loading && tags.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                    Nenhuma etiqueta encontrada.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </PageContent>
    </PageLayout>
  );
};

export default TagManager;
