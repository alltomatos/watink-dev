import React from "react";
import { Edit, Trash2, Archive, RotateCcw } from "lucide-react";

import { Tag } from "../tagManagerTypes";
import { TableCell, TableRow } from "../../../components/ui/table";
import { Button } from "../../../components/ui/button";
import { Badge } from "../../../components/ui/badge";

interface TagTableRowProps {
  tag: Tag;
  onEdit: (tag: Tag) => void;
  onToggleArchive: (tag: Tag) => void;
  onDelete: (tag: Tag) => void;
}

export const TagTableRow = ({
  tag,
  onEdit,
  onToggleArchive,
  onDelete,
}: TagTableRowProps) => (
  <TableRow className={tag.archived ? "opacity-60" : ""}>
    <TableCell>
      <div className="flex items-center gap-2">
        <div
          className="h-4 w-4 rounded-full border border-black/10 shadow-sm"
          style={{ backgroundColor: tag.color || "var(--muted)" }}
        />
        <span className="font-semibold">{tag.name}</span>
        {tag.archived && (
          <Badge variant="outline" className="text-[10px]">Arquivada</Badge>
        )}
      </div>
    </TableCell>
    <TableCell className="text-muted-foreground">
      {tag.group?.name || "-"}
    </TableCell>
    <TableCell className="text-muted-foreground max-w-xs truncate">
      {tag.description || "-"}
    </TableCell>
    <TableCell className="text-center">
      <Badge variant="secondary">{tag.usageCount ?? 0}</Badge>
    </TableCell>
    <TableCell className="text-right">
      <div className="flex items-center justify-end gap-1">
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={() => onEdit(tag)}
        >
          <Edit className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          title={tag.archived ? "Restaurar" : "Arquivar"}
          onClick={() => onToggleArchive(tag)}
        >
          {tag.archived ? (
            <RotateCcw className="h-4 w-4" />
          ) : (
            <Archive className="h-4 w-4" />
          )}
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-destructive"
          onClick={() => onDelete(tag)}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    </TableCell>
  </TableRow>
);
