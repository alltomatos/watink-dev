import React from "react";
import { Field } from "formik";
import { Edit, Shield, Users } from "lucide-react";
import { Input } from "../../../components/ui/input";
import { Label } from "../../../components/ui/label";
import { Badge } from "../../../components/ui/badge";
import { i18n } from "../../../translate/i18n";

interface GroupDataCardProps {
  touched: { name?: boolean };
  errors: { name?: string };
  selectedPermissionsCount: number;
  groupUsersCount: number;
}

const GroupDataCard: React.FC<GroupDataCardProps> = ({
  touched,
  errors,
  selectedPermissionsCount,
  groupUsersCount,
}) => {
  return (
    <div className="rounded-2xl border border-border bg-card p-5 shadow-sm transition-shadow hover:shadow-md">
      <div className="mb-4 flex items-center gap-3 border-b border-border pb-3">
        <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-info/20 text-info">
          <Edit className="h-4 w-4" />
        </span>
        <span className="text-base font-semibold">Dados do Grupo</span>
      </div>

      <div className="space-y-1">
        <Label htmlFor="name">{i18n.t("groupModal.form.name")}</Label>
        <Field
          as={Input}
          id="name"
          name="name"
          className={touched.name && errors.name ? "border-destructive" : ""}
        />
        {touched.name && errors.name && (
          <p className="text-xs text-destructive">{errors.name as string}</p>
        )}
      </div>

      <div className="mt-6">
        <p className="mb-2 text-xs text-muted-foreground">Resumo</p>
        <div className="flex flex-wrap gap-2">
          <Badge variant="outline">
            <Shield className="mr-1 h-3 w-3" />
            {selectedPermissionsCount} permissões
          </Badge>
          <Badge variant="secondary">
            <Users className="mr-1 h-3 w-3" />
            {groupUsersCount} usuários
          </Badge>
        </div>
      </div>
    </div>
  );
};

export default GroupDataCard;
