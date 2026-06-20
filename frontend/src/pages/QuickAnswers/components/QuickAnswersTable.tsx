import React from "react";
import { Edit, Trash2, Loader2 } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../../../components/ui/table";
import { Button } from "../../../components/ui/button";
import { i18n } from "../../../translate/i18n";
import { QuickAnswer } from "../quickAnswersTypes";

interface QuickAnswersTableProps {
  quickAnswers: QuickAnswer[];
  loading: boolean;
  onEdit: (qa: QuickAnswer) => void;
  onDelete: (qa: QuickAnswer) => void;
  onScroll: (e: React.UIEvent<HTMLDivElement>) => void;
}

export const QuickAnswersTable = ({
  quickAnswers,
  loading,
  onEdit,
  onDelete,
  onScroll,
}: QuickAnswersTableProps) => {
  return (
    <div
      className="rounded-md border bg-card max-h-[calc(100vh-220px)] overflow-y-auto"
      onScroll={onScroll}
    >
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[200px]">
              {i18n.t("quickAnswers.table.shortcut")}
            </TableHead>
            <TableHead>{i18n.t("quickAnswers.table.message")}</TableHead>
            <TableHead className="text-right w-[100px]">
              {i18n.t("quickAnswers.table.actions")}
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {quickAnswers.map((qa) => (
            <TableRow key={qa.id}>
              <TableCell className="font-mono font-bold text-primary">
                /{qa.shortcut}
              </TableCell>
              <TableCell className="max-w-md">
                <p className="truncate text-muted-foreground">{qa.message}</p>
              </TableCell>
              <TableCell className="text-right">
                <div className="flex items-center justify-end gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => onEdit(qa)}
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-destructive"
                    onClick={() => onDelete(qa)}
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
              <TableCell
                colSpan={3}
                className="h-24 text-center text-muted-foreground"
              >
                Nenhuma resposta rápida encontrada.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
};
