/* @jsxImportSource react */
import React, { useState, useEffect, useReducer } from "react";
import openSocket from "../../services/socket-io";
import { 
  Plus, 
  Search, 
  Edit, 
  Trash2, 
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
import QuickAnswersModal from "../../components/QuickAnswersModal";
import ConfirmationModal from "../../components/ConfirmationModal";

const reducer = (state: any[], action: { type: string; payload?: any }): any[] => {
  if (action.type === "LOAD_QUICK_ANSWERS") {
    const quickAnswers = action.payload || [];
    if (quickAnswers.length === 0) return [];
    const newQuickAnswers: any[] = [];

    quickAnswers.forEach((quickAnswer: any) => {
      const quickAnswerIndex = state.findIndex((q) => q.id === quickAnswer.id);
      if (quickAnswerIndex !== -1) {
        state[quickAnswerIndex] = quickAnswer;
      } else {
        newQuickAnswers.push(quickAnswer);
      }
    });

    return [...state, ...newQuickAnswers];
  }

  if (action.type === "UPDATE_QUICK_ANSWERS") {
    const quickAnswer = action.payload;
    const quickAnswerIndex = state.findIndex((q) => q.id === quickAnswer.id);

    if (quickAnswerIndex !== -1) {
      state[quickAnswerIndex] = quickAnswer;
      return [...state];
    } else {
      return [quickAnswer, ...state];
    }
  }

  if (action.type === "DELETE_QUICK_ANSWER") {
    const quickAnswerId = action.payload;
    const quickAnswerIndex = state.findIndex((q) => q.id === quickAnswerId);
    if (quickAnswerIndex !== -1) {
      state.splice(quickAnswerIndex, 1);
    }
    return [...state];
  }

  if (action.type === "RESET") {
    return [];
  }
  return state;
};

const QuickAnswers = () => {
  const [loading, setLoading] = useState(false);
  const [pageNumber, setPageNumber] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [searchParam, setSearchParam] = useState("");
  const [quickAnswers, dispatch] = useReducer(reducer, []);
  const [selectedQuickAnswer, setSelectedQuickAnswer] = useState<any>(null);
  const [quickAnswerModalOpen, setQuickAnswerModalOpen] = useState(false);
  const [confirmModalOpen, setConfirmModalOpen] = useState(false);

  useEffect(() => {
    dispatch({ type: "RESET" });
    setPageNumber(1);
  }, [searchParam]);

  useEffect(() => {
    setLoading(true);
    const delayDebounceFn = setTimeout(() => {
      const fetchQuickAnswers = async () => {
        try {
          const { data } = await api.get("/quickAnswers/", {
            params: { searchParam, pageNumber },
          });
          dispatch({ type: "LOAD_QUICK_ANSWERS", payload: data.quickAnswers || [] });
          setHasMore(data.hasMore);
          setLoading(false);
        } catch (err) {
          toastError(err);
        }
      };
      fetchQuickAnswers();
    }, 500);
    return () => clearTimeout(delayDebounceFn);
  }, [searchParam, pageNumber]);

  useEffect(() => {
    const socket = openSocket();
    if (!socket) return;

    socket.on("quickAnswer", (data) => {
      if (data.action === "update" || data.action === "create") {
        dispatch({ type: "UPDATE_QUICK_ANSWERS", payload: data.quickAnswer });
      }

      if (data.action === "delete") {
        dispatch({ type: "DELETE_QUICK_ANSWER", payload: +data.quickAnswerId });
      }
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  const handleSearch = (event: React.ChangeEvent<HTMLInputElement>) => {
    setSearchParam(event.target.value.toLowerCase());
  };

  const handleOpenQuickAnswerModal = () => {
    setSelectedQuickAnswer(null);
    setQuickAnswerModalOpen(true);
  };

  const handleCloseQuickAnswerModal = () => {
    setSelectedQuickAnswer(null);
    setQuickAnswerModalOpen(false);
  };

  const handleEditQuickAnswer = (quickAnswer: any) => {
    setSelectedQuickAnswer(quickAnswer);
    setQuickAnswerModalOpen(true);
  };

  const handleDeleteQuickAnswer = async (quickAnswerId: any) => {
    try {
      await api.delete(`/quickAnswers/${quickAnswerId}`);
      toast.success(i18n.t("quickAnswers.toasts.deleted"));
    } catch (err) {
      toastError(err);
    }
    setSelectedQuickAnswer(null);
    setSearchParam("");
    setPageNumber(1);
  };

  const loadMore = () => {
    setPageNumber((prev) => prev + 1);
  };

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    if (!hasMore || loading) return;
    const { scrollTop, scrollHeight, clientHeight } = e.currentTarget;
    if (scrollHeight - (scrollTop + clientHeight) < 100) {
      loadMore();
    }
  };

  return (
    <PageLayout>
      <QuickAnswersModal
        open={quickAnswerModalOpen}
        onClose={handleCloseQuickAnswerModal}
        aria-labelledby="form-dialog-title"
        quickAnswerId={selectedQuickAnswer?.id}
      />
      <ConfirmationModal
        title={
          selectedQuickAnswer &&
          `${i18n.t("quickAnswers.confirmationModal.deleteTitle")} ${
            selectedQuickAnswer.shortcut
          }?`
        }
        open={confirmModalOpen}
        onClose={() => setConfirmModalOpen(false)}
        onConfirm={() => handleDeleteQuickAnswer(selectedQuickAnswer.id)}
      >
        {i18n.t("quickAnswers.confirmationModal.deleteMessage")}
      </ConfirmationModal>

      <PageHeader 
        title={i18n.t("quickAnswers.title") as string}
        description="Gerencie suas respostas rápidas para agilizar o atendimento"
      >
        <div className="flex items-center gap-2">
          <div className="relative w-full max-w-sm hidden md:block">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder={i18n.t("quickAnswers.searchPlaceholder") as string}
              value={searchParam}
              onChange={handleSearch}
              className="pl-9 h-10"
            />
          </div>
          <Button onClick={handleOpenQuickAnswerModal}>
            <Plus className="mr-2 h-4 w-4" />
            {i18n.t("quickAnswers.buttons.add")}
          </Button>
        </div>
      </PageHeader>

      <PageContent>
        <div
          className="rounded-md border bg-card max-h-[calc(100vh-220px)] overflow-y-auto"
          onScroll={handleScroll}
        >
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[200px]">{i18n.t("quickAnswers.table.shortcut")}</TableHead>
                <TableHead>{i18n.t("quickAnswers.table.message")}</TableHead>
                <TableHead className="text-right w-[100px]">{i18n.t("quickAnswers.table.actions")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {quickAnswers.map((quickAnswer) => (
                <TableRow key={quickAnswer.id}>
                  <TableCell className="font-mono font-bold text-primary">
                    /{quickAnswer.shortcut}
                  </TableCell>
                  <TableCell className="max-w-md">
                    <p className="truncate text-muted-foreground">
                      {quickAnswer.message}
                    </p>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => handleEditQuickAnswer(quickAnswer)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive"
                        onClick={() => {
                          setSelectedQuickAnswer(quickAnswer);
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
                  <TableCell colSpan={3} className="h-24 text-center">
                    <div className="flex items-center justify-center">
                      <Loader2 className="h-6 w-6 animate-spin text-primary" />
                    </div>
                  </TableCell>
                </TableRow>
              )}
              {!loading && quickAnswers.length === 0 && (
                <TableRow>
                  <TableCell colSpan={3} className="h-24 text-center text-muted-foreground">
                    Nenhuma resposta rápida encontrada.
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

export default QuickAnswers;
