import React from "react";
import {
  Edit,
  Trash2,
  Loader2,
  MessageSquare,
  LayoutList,
  BarChart2,
  Image,
  Zap,
  Hash,
  QrCode,
} from "lucide-react";
import { Card, CardContent } from "../../../components/ui/card";
import { Button } from "../../../components/ui/button";
import { Badge } from "../../../components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../../../components/ui/table";
import { QuickAnswer, QuickAnswerType } from "../quickAnswersTypes";
import type { ViewMode } from "./QuickAnswersToolbar";

interface QuickAnswersTableProps {
  quickAnswers: QuickAnswer[];
  loading: boolean;
  onEdit: (qa: QuickAnswer) => void;
  onDelete: (qa: QuickAnswer) => void;
  onScroll: (e: React.UIEvent<HTMLDivElement>) => void;
  view?: ViewMode;
}

const TYPE_CONFIG: Record<
  QuickAnswerType,
  { label: string; icon: React.ElementType; bg: string; color: string }
> = {
  text: {
    label: "Texto",
    icon: MessageSquare,
    bg: "hsl(var(--status-info-bg))",
    color: "hsl(var(--status-info))",
  },
  interactive_buttons: {
    label: "Botões",
    icon: Zap,
    bg: "hsl(var(--status-warning-bg))",
    color: "hsl(var(--status-warning))",
  },
  list: {
    label: "Lista",
    icon: LayoutList,
    bg: "hsl(var(--status-success-bg))",
    color: "hsl(var(--status-success))",
  },
  media: {
    label: "Mídia",
    icon: Image,
    bg: "hsl(var(--status-default-bg, var(--muted)))",
    color: "hsl(var(--status-default-text, var(--muted-foreground)))",
  },
  poll: {
    label: "Enquete",
    icon: BarChart2,
    bg: "hsl(var(--status-error-bg))",
    color: "hsl(var(--status-error))",
  },
  carousel: {
    label: "Carrossel",
    icon: Hash,
    bg: "hsl(var(--status-default-bg, var(--muted)))",
    color: "hsl(var(--status-default-text, var(--muted-foreground)))",
  },
  pix: {
    label: "PIX",
    icon: QrCode,
    bg: "hsl(var(--status-success-bg))",
    color: "hsl(var(--status-success))",
  },
};

function getTypeConfig(type?: QuickAnswerType) {
  return TYPE_CONFIG[type ?? "text"] ?? TYPE_CONFIG.text;
}

function getPreviewText(qa: QuickAnswer): string {
  if (qa.message) return qa.message;
  if (!qa.content) return "";
  const c = qa.content as unknown as Record<string, unknown>;
  if (typeof c.body === "string") return c.body;
  if (typeof c.question === "string") return c.question;
  if (typeof c.caption === "string") return c.caption;
  return "";
}

export const QuickAnswersTable = ({
  quickAnswers,
  loading,
  onEdit,
  onDelete,
  onScroll,
  view = "grid",
}: QuickAnswersTableProps) => {
  if (loading && quickAnswers.length === 0) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
        {[1, 2, 3, 4, 5, 6].map((n) => (
          <div key={n} className="h-32 rounded-2xl bg-muted animate-pulse" />
        ))}
      </div>
    );
  }

  if (!loading && quickAnswers.length === 0) {
    return null;
  }

  if (view === "table") {
    return (
      <div
        className="rounded-xl border bg-card max-h-[calc(100vh-220px)] overflow-y-auto"
        onScroll={onScroll}
      >
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[48px]"></TableHead>
              <TableHead className="w-[180px]">Atalho</TableHead>
              <TableHead>Mensagem</TableHead>
              <TableHead className="w-[120px]">Tipo</TableHead>
              <TableHead className="text-right w-[90px]">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {quickAnswers.map((qa) => {
              const cfg = getTypeConfig(qa.type);
              const Icon = cfg.icon;
              const preview = getPreviewText(qa);
              return (
                <TableRow key={qa.id} className="group">
                  <TableCell>
                    <span
                      className="flex h-7 w-7 items-center justify-center rounded-lg"
                      style={{ backgroundColor: cfg.bg, color: cfg.color }}
                    >
                      <Icon className="h-3.5 w-3.5" />
                    </span>
                  </TableCell>
                  <TableCell className="font-mono font-bold text-primary">
                    /{qa.shortcut}
                  </TableCell>
                  <TableCell className="max-w-xs">
                    <p className="truncate text-sm text-muted-foreground">
                      {preview}
                    </p>
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant="outline"
                      className="border-transparent text-[11px] font-semibold"
                      style={{ backgroundColor: cfg.bg, color: cfg.color }}
                    >
                      {cfg.label}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-muted-foreground hover:text-primary hover:bg-primary/10"
                        onClick={() => onEdit(qa)}
                      >
                        <Edit className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                        onClick={() => onDelete(qa)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
            {loading && (
              <TableRow>
                <TableCell colSpan={5} className="h-16 text-center">
                  <Loader2 className="h-5 w-5 animate-spin text-primary mx-auto" />
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    );
  }

  return (
    <div
      className="max-h-[calc(100vh-220px)] overflow-y-auto pr-1"
      onScroll={onScroll}
    >
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
        {quickAnswers.map((qa) => {
          const cfg = getTypeConfig(qa.type);
          const Icon = cfg.icon;
          const preview = getPreviewText(qa);

          return (
            <Card
              key={qa.id}
              className="group relative cursor-default transition-all hover:-translate-y-0.5 hover:shadow-lg rounded-2xl shadow-[0px_4px_20px_rgba(0,0,0,0.06)] border"
            >
              <CardContent className="p-4 flex flex-col gap-3">
                {/* Header: shortcut + actions */}
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <span
                      className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg"
                      style={{ backgroundColor: cfg.bg, color: cfg.color }}
                    >
                      <Icon className="h-3.5 w-3.5" />
                    </span>
                    <span className="font-mono font-bold text-primary text-sm truncate">
                      /{qa.shortcut}
                    </span>
                  </div>
                  <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity -mt-0.5 -mr-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-muted-foreground hover:text-primary hover:bg-primary/10"
                      onClick={() => onEdit(qa)}
                    >
                      <Edit className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                      onClick={() => onDelete(qa)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>

                {/* Message preview */}
                {preview && (
                  <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                    {preview}
                  </p>
                )}

                {/* Footer: type badge */}
                <div className="flex items-center justify-between mt-auto">
                  <Badge
                    variant="outline"
                    className="border-transparent text-[11px] font-semibold"
                    style={{ backgroundColor: cfg.bg, color: cfg.color }}
                  >
                    {cfg.label}
                  </Badge>
                </div>
              </CardContent>
            </Card>
          );
        })}

        {loading && (
          <div className="col-span-full flex justify-center py-6">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        )}
      </div>
    </div>
  );
};
