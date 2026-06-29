/* @jsxImportSource react */
import React, { useState } from "react";
import { Loader2, Search } from "lucide-react";

import api from "../../services/api";
import toastError from "../../errors/toastError";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface QueryHit {
  text: string;
  sourceId: number;
  score: number;
  citation?: string;
}

interface RetrievalPlaygroundProps {
  knowledgeBaseId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function scoreClass(score: number): string {
  if (score >= 0.5)
    return "bg-[hsl(var(--status-success-bg))] text-[hsl(var(--status-success-text))]";
  if (score >= 0.3)
    return "bg-[hsl(var(--status-warning-bg))] text-[hsl(var(--status-warning-text))]";
  return "bg-[hsl(var(--status-error-bg))] text-[hsl(var(--status-error-text))]";
}

const RetrievalPlayground: React.FC<RetrievalPlaygroundProps> = ({
  knowledgeBaseId,
  open,
  onOpenChange,
}) => {
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [hits, setHits] = useState<QueryHit[] | null>(null);

  const runQuery = async () => {
    if (!query.trim()) return;
    setLoading(true);
    try {
      const { data } = await api.post<{ chunks: QueryHit[] }>(
        `/knowledge-bases/${knowledgeBaseId}/query`,
        { query: query.trim(), topK: 6 }
      );
      setHits(Array.isArray(data.chunks) ? data.chunks : []);
    } catch (err) {
      toastError(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Testar recuperação (RAG)</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground -mt-1">
          Faça uma pergunta como um usuário faria. A IA busca os trechos mais
          parecidos na base — veja o que volta e com que score para avaliar a
          qualidade da vetorização.
        </p>

        <div className="flex gap-2">
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") runQuery();
            }}
            placeholder="Ex: Qual o horário de atendimento?"
            autoFocus
          />
          <Button onClick={runQuery} disabled={loading || !query.trim()}>
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Search className="h-4 w-4" />
            )}
            Buscar
          </Button>
        </div>

        <div className="flex max-h-[50vh] flex-col gap-3 overflow-y-auto">
          {hits === null ? null : hits.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">
              Nenhum trecho relevante encontrado para essa pergunta.
            </p>
          ) : (
            hits.map((hit, i) => (
              <div
                key={`${hit.sourceId}-${i}`}
                className="flex flex-col gap-2 rounded-xl border p-3"
              >
                <div className="flex items-center gap-2">
                  <Badge className={`border-transparent ${scoreClass(hit.score)}`}>
                    score {hit.score.toFixed(3)}
                  </Badge>
                  <span className="text-xs text-muted-foreground">
                    fonte #{hit.sourceId}
                  </span>
                </div>
                <p className="whitespace-pre-wrap text-sm text-foreground">
                  {hit.text}
                </p>
              </div>
            ))
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default RetrievalPlayground;
