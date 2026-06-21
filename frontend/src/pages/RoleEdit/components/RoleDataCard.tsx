import React from "react";
import { Field, FormikErrors, FormikTouched } from "formik";
import { Edit } from "lucide-react";
import { Input } from "../../../components/ui/input";
import { Label } from "../../../components/ui/label";
import { Textarea } from "../../../components/ui/textarea";
import { i18n } from "../../../translate/i18n";
import { RoleFormValues } from "../roleEditTypes";

interface RoleDataCardProps {
  touched: FormikTouched<RoleFormValues>;
  errors: FormikErrors<RoleFormValues>;
}

export const RoleDataCard: React.FC<RoleDataCardProps> = ({ touched, errors }) => {
  return (
    <div className="rounded-2xl border border-border bg-card p-5 shadow-sm transition-shadow hover:shadow-md">
      <div className="mb-4 flex items-center gap-3 border-b border-border pb-3">
        <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-info/20 text-info">
          <Edit className="h-4 w-4" />
        </span>
        <span className="text-base font-semibold">Dados da Função</span>
      </div>

      <div className="space-y-3">
        <div className="space-y-1">
          <Label htmlFor="name">
            {i18n.t("role.form.name") || "Nome"}
          </Label>
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

        <div className="space-y-1">
          <Label htmlFor="description">
            {i18n.t("role.form.description") || "Descrição"}
          </Label>
          <Field
            as={Textarea}
            id="description"
            name="description"
            rows={3}
            className={
              touched.description && errors.description
                ? "border-destructive resize-none"
                : "resize-none"
            }
          />
          {touched.description && errors.description && (
            <p className="text-xs text-destructive">
              {errors.description as string}
            </p>
          )}
        </div>
      </div>
    </div>
  );
};
