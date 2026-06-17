import React, { useState, useEffect, useRef } from "react";
import { Send, RefreshCw, TrendingUp, TrendingDown, Minus } from "lucide-react";
import { toast } from "react-toastify";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import api from "../../services/api";

interface Insight {
  averageSentiment?: number;
  conversationCount?: number;
  totalMessages?: number;
  topTopics?: string[];
  recentSummaries?: Array<{ summary: string; ticketId: number }>;
}

interface ChatMessage {
  role: "user" | "ai";
  content: string;
  sources?: string[];
}

interface ContactAIInsightsProps {
  contactId: number;
  ticketId?: number;
}

const getSentimentInfo = (
  sentiment: number
): { label: string; icon: React.ReactNode; classes: string } => {
  if (sentiment > 0.3)
    return {
      label: "Positivo",
      icon: <TrendingUp className="w-3.5 h-3.5" />,
      classes: "bg-[var(--status-success-bg)] text-[var(--status-success)]",
    };
  if (sentiment < -0.3)
    return {
      label: "Negativo",
      icon: <TrendingDown className="w-3.5 h-3.5" />,
      classes: "bg-[var(--status-error-bg)] text-[var(--status-error)]",
    };
  return {
    label: "Neutro",
    icon: <Minus className="w-3.5 h-3.5" />,
    classes: "bg-[var(--status-info-bg)] text-[var(--status-info)]",
  };
};

const ContactAIInsights = ({ contactId }: ContactAIInsightsProps) => {
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

  useEffect(() => {
    if (contactId) {
      fetchInsights();
    }
  }, [contactId]);

  const fetchInsights = async () => {
    setLoading(true);
    try {
      const { data } = await api.get(`/ai/contact/${contactId}/insights`);
      setInsights(data.insights);
    } catch (err: any) {
      console.error("Erro ao carregar insights:", err);
      if (err.response?.status !== 403) {
        toast.error("Erro ao carregar análise de IA");
      }
    }
    setLoading(false);
  };

  const handleAsk = async () => {
    if (!question.trim() || asking) return;

    const userMsg: ChatMessage = { role: "user", content: question };
    setChatHistory((prev: ChatMessage[]) => [...prev, userMsg]);
    setQuestion("");
    setAsking(true);

    try {
      const { data } = await api.post("/ai/ask", { question, contactId });
      const aiMsg: ChatMessage = {
        role: "ai",
        content: data.answer,
        sources: data.sources,
      };
      setChatHistory((prev: ChatMessage[]) => [...prev, aiMsg]);
    } catch (err) {
      console.error("Erro ao perguntar:", err);
      setChatHistory((prev: ChatMessage[]) => [
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

  if (loading) {
    return (
      <div className="h-full flex flex-col overflow-hidden bg-[var(--bg-default)]">
        <div className="flex items-center justify-center flex-1">
          <Skeleton className="w-10 h-10 rounded-full" />
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col overflow-hidden bg-[var(--bg-default)]">
      {/* Header */}
      <div className="px-4 py-3 border-b border-[var(--border-divider)] bg-[var(--bg-surface)] flex items-center justify-between">
        <span className="text-sm font-semibold">🤖 Assistente IA</span>
        <Button variant="ghost" size="icon" onClick={fetchInsights} title="Atualizar análise">
          <RefreshCw className="w-4 h-4" />
        </Button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {!insights ? (
          <div className="flex flex-col items-center justify-center py-10 text-center text-[var(--text-muted)]">
            <p className="text-sm">Nenhuma análise disponível ainda.</p>
            <p className="text-xs mt-1">
              As análises são geradas quando tickets são fechados.
            </p>
          </div>
        ) : (
          <>
            {/* Sentiment & Stats */}
            <div className="border border-[var(--border-divider)] rounded-lg p-4">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)]">
                  Sentimento Geral
                </span>
                {insights.averageSentiment !== undefined && (
                  <span
                    className={cn(
                      "inline-flex items-center gap-1 px-3 py-0.5 rounded-full text-xs font-semibold",
                      getSentimentInfo(insights.averageSentiment).classes
                    )}
                  >
                    {getSentimentInfo(insights.averageSentiment).icon}
                    {getSentimentInfo(insights.averageSentiment).label}
                  </span>
                )}
              </div>
              <div className="grid grid-cols-2 gap-2 mt-2">
                <div className="text-center p-2 bg-[var(--bg-surface-alt)] rounded-lg">
                  <p className="text-xl font-bold">
                    {insights.conversationCount ?? 0}
                  </p>
                  <p className="text-xs text-[var(--text-muted)]">Conversas</p>
                </div>
                <div className="text-center p-2 bg-[var(--bg-surface-alt)] rounded-lg">
                  <p className="text-xl font-bold">
                    {insights.totalMessages ?? 0}
                  </p>
                  <p className="text-xs text-[var(--text-muted)]">Mensagens</p>
                </div>
              </div>
            </div>

            {/* Topics */}
            {insights.topTopics && insights.topTopics.length > 0 && (
              <div className="border border-[var(--border-divider)] rounded-lg p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)] mb-2">
                  Tópicos Frequentes
                </p>
                <div className="flex flex-wrap gap-1">
                  {insights.topTopics.map((topic, i) => (
                    <Badge key={i} variant="outline" className="text-xs">
                      {topic}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Recent Summaries */}
            {insights.recentSummaries && insights.recentSummaries.length > 0 && (
              <div className="border border-[var(--border-divider)] rounded-lg p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)] mb-2">
                  Resumos Recentes
                </p>
                <ul className="space-y-2">
                  {insights.recentSummaries.map((item, i) => (
                    <li key={i}>
                      <p className="text-sm">{item.summary}</p>
                      <p className="text-xs text-[var(--text-muted)]">
                        Ticket #{item.ticketId}
                      </p>
                      {i < (insights.recentSummaries?.length ?? 0) - 1 && (
                        <Separator className="mt-2" />
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </>
        )}
      </div>

      {/* Chat Section */}
      <div className="border-t border-[var(--border-divider)] p-3 bg-[var(--bg-surface)]">
        <p className="text-xs text-[var(--text-muted)] mb-2">
          Pergunte sobre este contato:
        </p>

        {chatHistory.length > 0 && (
          <div className="max-h-[200px] overflow-y-auto mb-2 space-y-1.5">
            {chatHistory.map((msg, i) => (
              <div
                key={i}
                className={cn(
                  "px-3 py-2 rounded-xl text-sm whitespace-pre-wrap max-w-[80%]",
                  msg.role === "user"
                    ? "bg-primary text-primary-foreground rounded-br-none ml-auto"
                    : "bg-[var(--border-default)] rounded-bl-none"
                )}
              >
                {msg.content}
              </div>
            ))}
            {asking && (
              <div className="px-3 py-2 rounded-xl text-sm bg-[var(--border-default)] rounded-bl-none max-w-[80%] flex items-center gap-2">
                <Skeleton className="w-3 h-3 rounded-full" />
                <span className="text-xs">Pensando...</span>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        )}

        <div className="flex gap-2">
          <Input
            className="flex-1 h-8 text-sm"
            placeholder="Ex: Qual foi o último problema reportado?"
            value={question}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setQuestion(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={asking}
          />
          <Button
            size="sm"
            variant="default"
            onClick={handleAsk}
            disabled={!question.trim() || asking}
            className="h-8 px-3"
          >
            <Send className="w-3.5 h-3.5" />
          </Button>
        </div>
      </div>
    </div>
  );
};

export default ContactAIInsights;
