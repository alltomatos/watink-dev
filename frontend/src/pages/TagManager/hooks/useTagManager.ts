import { useState, useEffect, useReducer } from "react";
import { toast } from "react-toastify";

import api from "../../../services/api";
import openSocket from "../../../services/socket-io";
import { i18n } from "../../../translate/i18n";
import toastError from "../../../errors/toastError";
import { Tag, TagAction } from "../tagManagerTypes";

const reducer = (state: Tag[], action: TagAction): Tag[] => {
  if (action.type === "LOAD_TAGS") {
    const tags = action.payload ?? [];
    if (tags.length === 0) return [];
    const newTags: Tag[] = [];
    tags.forEach((tag) => {
      const idx = state.findIndex((s) => s.id === tag.id);
      if (idx !== -1) {
        state[idx] = tag;
      } else {
        newTags.push(tag);
      }
    });
    return [...state, ...newTags];
  }

  if (action.type === "UPDATE_TAGS") {
    const tag = action.payload;
    const idx = state.findIndex((s) => s.id === tag.id);
    if (idx !== -1) {
      state[idx] = tag;
      return [...state];
    }
    return [tag, ...state];
  }

  if (action.type === "DELETE_TAG") {
    const tagId = action.payload;
    const idx = state.findIndex((s) => s.id === tagId);
    if (idx !== -1) state.splice(idx, 1);
    return [...state];
  }

  if (action.type === "RESET") return [];

  return state;
};

export const useTagManager = () => {
  const [loading, setLoading] = useState(false);
  const [searchParam, setSearchParam] = useState("");
  const [tags, dispatch] = useReducer(reducer, []);
  const [showArchived, setShowArchived] = useState(false);
  const [selectedTag, setSelectedTag] = useState<Tag | null>(null);
  const [tagModalOpen, setTagModalOpen] = useState(false);
  const [confirmModalOpen, setConfirmModalOpen] = useState(false);

  useEffect(() => {
    dispatch({ type: "RESET" });
  }, [searchParam, showArchived]);

  useEffect(() => {
    setLoading(true);
    const timer = setTimeout(async () => {
      try {
        const { data } = await api.get("/tags", {
          params: { searchParam, includeArchived: showArchived },
        });
        dispatch({ type: "LOAD_TAGS", payload: Array.isArray(data) ? data : [] });
      } catch (err) {
        toastError(err);
      } finally {
        setLoading(false);
      }
    }, 500);
    return () => clearTimeout(timer);
  }, [searchParam, showArchived]);

  useEffect(() => {
    const socket = openSocket();
    if (!socket) return;
    socket.on("tag", (data: { action: string; tag?: Tag; tagId?: number | string }) => {
      if ((data.action === "update" || data.action === "create") && data.tag) {
        dispatch({ type: "UPDATE_TAGS", payload: data.tag });
      }
      if (data.action === "delete" && data.tagId !== undefined) {
        dispatch({ type: "DELETE_TAG", payload: +data.tagId });
      }
    });
    return () => { socket.disconnect(); };
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

  const handleEditTag = (tag: Tag) => {
    setSelectedTag(tag);
    setTagModalOpen(true);
  };

  const handleDeleteTag = async (tagId: number) => {
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

  const handleToggleArchive = async (tag: Tag) => {
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

  const filteredTags = tags.filter((t) =>
    t.name?.toLowerCase().includes(searchParam)
  );

  return {
    loading,
    searchParam,
    tags: filteredTags,
    showArchived,
    selectedTag,
    tagModalOpen,
    confirmModalOpen,
    setShowArchived,
    setSelectedTag,
    setConfirmModalOpen,
    handleSearch,
    handleOpenTagModal,
    handleCloseTagModal,
    handleEditTag,
    handleDeleteTag,
    handleToggleArchive,
  };
};
