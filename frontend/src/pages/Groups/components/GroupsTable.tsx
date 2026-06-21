import React, { useContext } from "react";
import { Edit, Trash2, Loader2, Users } from "lucide-react";

import { i18n } from "../../../translate/i18n";
import { Can } from "../../../components/Can";
import { AuthContext } from "../../../context/Auth/AuthContext";
import { Button } from "../../../components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../../../components/ui/table";
import { Group } from "../groupsTypes";

interface GroupsTableProps {
  groups: Group[];
  loading: boolean;
  onEdit: (group: Group) => void;
  onDelete: (group: Group) => void;
}

const GroupsTable: React.FC<GroupsTableProps> = ({
  groups,
  loading,
  onEdit,
  onDelete,
}) => {
  const { user } = useContext(AuthContext);

  return (
    <div className="rounded-md border bg-card">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{i18n.t("groups.table.name")}</TableHead>
            <TableHead className="text-right w-[100px]">
              {i18n.t("groups.table.actions")}
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {groups.map((group) => (
            <TableRow key={group.id}>
              <TableCell>
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4 text-primary" />
                  <span className="font-semibold">{group.name}</span>
                </div>
              </TableCell>
              <TableCell className="text-right">
                <div className="flex items-center justify-end gap-1">
                  <Can
                    user={user}
                    perform="groups:edit"
                    yes={() => (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => onEdit(group)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                    )}
                  />
                  <Can
                    user={user}
                    perform="groups:delete"
                    yes={() => (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive"
                        onClick={() => onDelete(group)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  />
                </div>
              </TableCell>
            </TableRow>
          ))}
          {loading && (
            <TableRow>
              <TableCell colSpan={2} className="h-24 text-center">
                <div className="flex items-center justify-center">
                  <Loader2 className="h-6 w-6 animate-spin text-primary" />
                </div>
              </TableCell>
            </TableRow>
          )}
          {!loading && groups.length === 0 && (
            <TableRow>
              <TableCell
                colSpan={2}
                className="h-24 text-center text-muted-foreground"
              >
                Nenhum grupo encontrado.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
};

export default GroupsTable;
