import React from "react";
import { Edit, Trash2 } from "lucide-react";
import { Button as ShadButton } from "../../../components/ui/button";
import { Badge } from "../../../components/ui/badge";
import { Avatar as ShadAvatar } from "../../../components/ui/avatar";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../../../components/ui/table";
import TableRowSkeleton from "../../../components/TableRowSkeleton";
import { i18n } from "../../../translate/i18n";
import { User, ProfileInfo } from "../usersTypes";

// ─── Helpers ─────────────────────────────────────────────────────────────────

const getProfileInfo = (profile: string): ProfileInfo => {
  switch (profile) {
    case "admin":
      return { variant: "default", label: "Admin" };
    case "supervisor":
      return { variant: "secondary", label: "Supervisor" };
    default:
      return { variant: "outline", label: "Usuário" };
  }
};

// ─── Component ───────────────────────────────────────────────────────────────

interface UsersTableProps {
  users: User[];
  loading: boolean;
  smtpPluginActive: boolean;
  onEdit: (user: User) => void;
  onDelete: (user: User) => void;
}

const UsersTable: React.FC<UsersTableProps> = ({
  users,
  loading,
  smtpPluginActive,
  onEdit,
  onDelete,
}) => {
  const colSpan = smtpPluginActive ? 6 : 5;

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="w-16 text-center">Avatar</TableHead>
          <TableHead>{i18n.t("users.table.name")}</TableHead>
          <TableHead className="text-center">{i18n.t("users.table.email")}</TableHead>
          {smtpPluginActive && (
            <TableHead className="text-center">{i18n.t("users.table.emailVerified")}</TableHead>
          )}
          <TableHead className="text-center">{i18n.t("users.table.profile")}</TableHead>
          <TableHead className="text-right">{i18n.t("users.table.actions")}</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {users.map((user) => {
          const profileInfo = getProfileInfo(user.profile);
          return (
            <TableRow key={user.id}>
              <TableCell className="text-center">
                <ShadAvatar size="sm" name={user.name} />
              </TableCell>
              <TableCell>
                <span className="font-semibold text-sm">{user.name}</span>
              </TableCell>
              <TableCell className="text-center">
                <span className="text-sm text-muted-foreground">{user.email}</span>
              </TableCell>
              {smtpPluginActive && (
                <TableCell className="text-center">
                  <Badge variant={user.emailVerified ? "default" : "secondary"}>
                    {user.emailVerified ? "Sim" : "Não"}
                  </Badge>
                </TableCell>
              )}
              <TableCell className="text-center">
                <Badge variant={profileInfo.variant}>{profileInfo.label}</Badge>
              </TableCell>
              <TableCell className="text-right">
                <div className="flex justify-end gap-1">
                  <ShadButton
                    variant="ghost"
                    size="icon"
                    onClick={() => onEdit(user)}
                    className="h-8 w-8 text-primary hover:text-primary hover:bg-primary/10"
                  >
                    <Edit className="h-4 w-4" />
                  </ShadButton>
                  <ShadButton
                    variant="ghost"
                    size="icon"
                    onClick={() => onDelete(user)}
                    className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                  >
                    <Trash2 className="h-4 w-4" />
                  </ShadButton>
                </div>
              </TableCell>
            </TableRow>
          );
        })}
        {loading && <TableRowSkeleton columns={colSpan} />}
      </TableBody>
    </Table>
  );
};

export default UsersTable;
