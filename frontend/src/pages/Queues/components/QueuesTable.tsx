import React from "react";
import { Edit, Trash2, Loader2, GitMerge } from "lucide-react";

import { i18n } from "../../../translate/i18n";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../../../components/ui/table";
import { Button } from "../../../components/ui/button";
import { Queue } from "../queuesTypes";

interface QueuesTableProps {
  queues: Queue[];
  loading: boolean;
  onEdit: (queue: Queue) => void;
  onDelete: (queue: Queue) => void;
}

export function QueuesTable({ queues, loading, onEdit, onDelete }: QueuesTableProps) {
  return (
    <div className="rounded-md border bg-card">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{i18n.t("queues.table.name")}</TableHead>
            <TableHead>{i18n.t("queues.table.color")}</TableHead>
            <TableHead>{i18n.t("queues.table.greeting")}</TableHead>
            <TableHead className="text-right w-[100px]">
              {i18n.t("queues.table.actions")}
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {queues.map((queue) => (
            <TableRow key={queue.id}>
              <TableCell>
                <div className="flex items-center gap-2">
                  <GitMerge className="h-4 w-4 text-primary" />
                  <span className="font-semibold">{queue.name}</span>
                </div>
              </TableCell>
              <TableCell>
                <div className="flex items-center gap-2">
                  <div
                    className="h-4 w-4 rounded-full border border-black/10 shadow-sm"
                    style={{ backgroundColor: queue.color ?? "var(--muted)" }}
                  />
                  <span className="text-xs font-mono uppercase text-muted-foreground">
                    {queue.color}
                  </span>
                </div>
              </TableCell>
              <TableCell className="max-w-xs">
                <p className="truncate text-muted-foreground">
                  {queue.greetingMessage ?? "Sem saudação"}
                </p>
              </TableCell>
              <TableCell className="text-right">
                <div className="flex items-center justify-end gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => onEdit(queue)}
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-destructive"
                    onClick={() => onDelete(queue)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          ))}
          {loading && (
            <TableRow>
              <TableCell colSpan={4} className="h-24 text-center">
                <div className="flex items-center justify-center">
                  <Loader2 className="h-6 w-6 animate-spin text-primary" />
                </div>
              </TableCell>
            </TableRow>
          )}
          {!loading && queues.length === 0 && (
            <TableRow>
              <TableCell
                colSpan={4}
                className="h-24 text-center text-muted-foreground"
              >
                Nenhuma fila encontrada.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}
