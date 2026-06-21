import { useState, useEffect, useRef } from "react";
import { toast } from "react-toastify";
import api from "../../../services/api";
import { Insight, ChatMessage } from "../contactAIInsightsTypes";

interface UseContactAIInsightsReturn {
  loading: boolean;
  insights: Insight | null;
  chatHistory: ChatMessage[];
  asking: boolean;
  question: string;
  messagesEndRef: React.RefObject<HTMLDivElement>;
  setQuestion: (value: string) => void;
  fetchInsights: () => Promise<void>;
  handleAsk: () => Promise<void>;
  handleKeyDown: (e: React.KeyboardEvent<HTMLInputElement>) => void;
}

export function useContactAIInsights(contactId: number): UseContactAIInsightsReturn {
  const [loading, setLoading] = useState(true);
  const [insights, setInsights] = useState<Insight | null>(null);
  const [question, setQuestion] = useState("");
  const [asking, setAsking] = useState(false);
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [chatHistory]);

  const fetchInsights = async () => {
    setLoading(true);
    try {
      const { data } = await api.get(`/ai/contact/${contactId}/insights`);
      setInsights(data.insights);
    } catch (err: unknown) {
      console.error("Erro ao carregar insights:", err);
      const axiosErr = err as { response?: { status?: number } };
      if (axiosErr.response?.status !== 403) {
        toast.error("Erro ao carregar análise de IA");
      }
    }
    setLoading(false);
  };

  useEffect(() => {
    if (contactId) {
      fetchInsights();
    }
    // fetchInsights é recreada a cada render; contactId é o trigger real
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [contactId]);

  const handleAsk = async () => {
    if (!question.trim() || asking) return;

    const userMsg: ChatMessage = { role: "user", content: question };
    setChatHistory((prev) => [...prev, userMsg]);
    setQuestion("");
    setAsking(true);

    try {
      const { data } = await api.post("/ai/ask", { question, contactId });
      const aiMsg: ChatMessage = {
        role: "ai",
        content: data.answer,
        sources: data.sources,
      };
      setChatHistory((prev) => [...prev, aiMsg]);
    } catch (err) {
      console.error("Erro ao perguntar:", err);
      setChatHistory((prev) => [
        ...prev,
        {
          role: "ai" as const,
          content: "Desculpe, ocorreu um erro ao processar sua pergunta.",
        },
      ]);
    }
    setAsking(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleAsk();
    }
  };

  return {
    loading,
    insights,
    chatHistory,
    asking,
    question,
    messagesEndRef,
    setQuestion,
    fetchInsights,
    handleAsk,
    handleKeyDown,
  };
}
