import React from "react";
import { Loader2 } from "lucide-react";

import { Tag } from "../tagManagerTypes";
import { i18n } from "../../../translate/i18n";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../../../components/ui/table";
import { TagTableRow } from "./TagTableRow";

interface TagTableProps {
  tags: Tag[];
  loading: boolean;
  onEdit: (tag: Tag) => void;
  onToggleArchive: (tag: Tag) => void;
  onDelete: (tag: Tag) => void;
}

export const TagTable = ({
  tags,
  loading,
  onEdit,
  onToggleArchive,
  onDelete,
}: TagTableProps) => (
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
        {tags.map((tag) => (
          <TagTableRow
            key={tag.id}
            tag={tag}
            onEdit={onEdit}
            onToggleArchive={onToggleArchive}
            onDelete={onDelete}
          />
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
);
