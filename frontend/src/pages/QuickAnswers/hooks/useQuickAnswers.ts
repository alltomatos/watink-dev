import { useState, useEffect, useReducer } from "react";
import { toast } from "react-toastify";

import api from "../../../services/api";
import { subscribeToSocket } from "../../../services/sse-client";
import { i18n } from "../../../translate/i18n";
import toastError from "../../../errors/toastError";
import { QuickAnswer, QuickAnswersAction } from "../quickAnswersTypes";

const reducer = (state: QuickAnswer[], action: QuickAnswersAction): QuickAnswer[] => {
  if (action.type === "LOAD_QUICK_ANSWERS") {
    const quickAnswers = action.payload ?? [];
    if (quickAnswers.length === 0) return [];
    const newQuickAnswers: QuickAnswer[] = [];
    quickAnswers.forEach((qa) => {
      const idx = state.findIndex((q) => q.id === qa.id);
      if (idx !== -1) {
        state[idx] = qa;
      } else {
        newQuickAnswers.push(qa);
      }
    });
    return [...state, ...newQuickAnswers];
  }

  if (action.type === "UPDATE_QUICK_ANSWERS") {
    const qa = action.payload;
    const idx = state.findIndex((q) => q.id === qa.id);
    if (idx !== -1) {
      state[idx] = qa;
      return [...state];
    }
    return [qa, ...state];
  }

  if (action.type === "DELETE_QUICK_ANSWER") {
    const idx = state.findIndex((q) => q.id === action.payload);
    if (idx !== -1) state.splice(idx, 1);
    return [...state];
  }

  if (action.type === "RESET") {
    return [];
  }

  return state;
};

export interface UseQuickAnswersReturn {
  quickAnswers: QuickAnswer[];
  loading: boolean;
  hasMore: boolean;
  searchParam: string;
  selectedQuickAnswer: QuickAnswer | null;
  quickAnswerModalOpen: boolean;
  confirmModalOpen: boolean;
  handleSearch: (e: React.ChangeEvent<HTMLInputElement>) => void;
  handleOpenQuickAnswerModal: () => void;
  handleCloseQuickAnswerModal: () => void;
  handleEditQuickAnswer: (qa: QuickAnswer) => void;
  handleDeleteQuickAnswer: (id: number) => Promise<void>;
  handleRequestDelete: (qa: QuickAnswer) => void;
  handleCloseConfirmModal: () => void;
  handleScroll: (e: React.UIEvent<HTMLDivElement>) => void;
}

export const useQuickAnswers = (): UseQuickAnswersReturn => {
  const [loading, setLoading] = useState(false);
  const [pageNumber, setPageNumber] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [searchParam, setSearchParam] = useState("");
  const [quickAnswers, dispatch] = useReducer(reducer, []);
  const [selectedQuickAnswer, setSelectedQuickAnswer] = useState<QuickAnswer | null>(null);
  const [quickAnswerModalOpen, setQuickAnswerModalOpen] = useState(false);
  const [confirmModalOpen, setConfirmModalOpen] = useState(false);

  useEffect(() => {
    dispatch({ type: "RESET" });
    setPageNumber(1);
  }, [searchParam]);

  useEffect(() => {
    setLoading(true);
    const timer = setTimeout(async () => {
      try {
        const { data } = await api.get("/quickAnswers/", {
          params: { searchParam, pageNumber },
        });
        dispatch({ type: "LOAD_QUICK_ANSWERS", payload: data.quickAnswers ?? [] });
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
    const handleQuickAnswer = (data: { action: string; quickAnswer?: QuickAnswer; quickAnswerId?: number }) => {
      if (data.action === "update" || data.action === "create") {
        dispatch({ type: "UPDATE_QUICK_ANSWERS", payload: data.quickAnswer! });
      }
      if (data.action === "delete") {
        dispatch({ type: "DELETE_QUICK_ANSWER", payload: Number(data.quickAnswerId) });
      }
    };

    return subscribeToSocket({ quickAnswer: handleQuickAnswer });
  }, []);

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchParam(e.target.value.toLowerCase());
  };

  const handleOpenQuickAnswerModal = () => {
    setSelectedQuickAnswer(null);
    setQuickAnswerModalOpen(true);
  };

  const handleCloseQuickAnswerModal = () => {
    setSelectedQuickAnswer(null);
    setQuickAnswerModalOpen(false);
  };

  const handleEditQuickAnswer = (qa: QuickAnswer) => {
    setSelectedQuickAnswer(qa);
    setQuickAnswerModalOpen(true);
  };

  const handleRequestDelete = (qa: QuickAnswer) => {
    setSelectedQuickAnswer(qa);
    setConfirmModalOpen(true);
  };

  const handleCloseConfirmModal = () => {
    setConfirmModalOpen(false);
  };

  const handleDeleteQuickAnswer = async (id: number) => {
    try {
      await api.delete(`/quickAnswers/${id}`);
      toast.success(i18n.t("quickAnswers.toasts.deleted"));
    } catch (err) {
      toastError(err);
    }
    setSelectedQuickAnswer(null);
    setSearchParam("");
    setPageNumber(1);
  };

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    if (!hasMore || loading) return;
    const { scrollTop, scrollHeight, clientHeight } = e.currentTarget;
    if (scrollHeight - (scrollTop + clientHeight) < 100) {
      setPageNumber((prev) => prev + 1);
    }
  };

  return {
    quickAnswers,
    loading,
    hasMore,
    searchParam,
    selectedQuickAnswer,
    quickAnswerModalOpen,
    confirmModalOpen,
    handleSearch,
    handleOpenQuickAnswerModal,
    handleCloseQuickAnswerModal,
    handleEditQuickAnswer,
    handleDeleteQuickAnswer,
    handleRequestDelete,
    handleCloseConfirmModal,
    handleScroll,
  };
};
