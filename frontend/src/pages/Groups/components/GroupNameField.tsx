import React from "react";
import { Field } from "formik";
import { Input } from "@/components/ui/input";
import { i18n } from "../../../translate/i18n";

interface GroupNameFieldProps {
  touched: boolean | undefined;
  error: string | undefined;
}

const GroupNameField: React.FC<GroupNameFieldProps> = ({ touched, error }) => (
  <div className="space-y-1.5">
    <label className="text-sm font-medium" htmlFor="group-name">
      {i18n.t("groupModal.form.name")}
    </label>
    <Field
      as={Input}
      id="group-name"
      name="name"
      placeholder="Nome do grupo"
      autoFocus
    />
    {touched && error && (
      <p className="text-xs text-destructive">{error}</p>
    )}
  </div>
);

export default GroupNameField;
