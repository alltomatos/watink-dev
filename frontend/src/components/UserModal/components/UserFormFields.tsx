import React from "react";
import { Field, FieldProps } from "formik";
import { Eye, EyeOff } from "lucide-react";

import { i18n } from "../../../translate/i18n";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

interface UserFormFieldsProps {
  touched: Partial<Record<"name" | "email" | "password", string>>;
  errors: Partial<Record<"name" | "email" | "password", string>>;
  showPassword: boolean;
  onTogglePassword: () => void;
}

const UserFormFields: React.FC<UserFormFieldsProps> = ({
  touched,
  errors,
  showPassword,
  onTogglePassword,
}) => {
  return (
    <>
      <div className="grid grid-cols-2 gap-4">
        <div className="flex flex-col gap-2">
          <Label
            htmlFor="name"
            className={cn(touched.name && errors.name && "text-destructive")}
          >
            {i18n.t("userModal.form.name")}
          </Label>
          <Field name="name">
            {({ field }: FieldProps) => (
              <Input
                {...field}
                id="name"
                autoFocus
                className={cn(touched.name && errors.name && "border-destructive")}
              />
            )}
          </Field>
          {touched.name && errors.name && (
            <span className="text-xs text-destructive">{errors.name}</span>
          )}
        </div>

        <div className="flex flex-col gap-2">
          <Label
            htmlFor="password"
            className={cn(touched.password && errors.password && "text-destructive")}
          >
            {i18n.t("userModal.form.password")}
          </Label>
          <div className="relative">
            <Field name="password">
              {({ field }: FieldProps) => (
                <Input
                  {...field}
                  id="password"
                  type={showPassword ? "text" : "password"}
                  className={cn(
                    "pr-10",
                    touched.password && errors.password && "border-destructive"
                  )}
                />
              )}
            </Field>
            <button
              type="button"
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              onClick={onTogglePassword}
            >
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
          {touched.password && errors.password && (
            <span className="text-xs text-destructive">{errors.password}</span>
          )}
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <Label
          htmlFor="email"
          className={cn(touched.email && errors.email && "text-destructive")}
        >
          {i18n.t("userModal.form.email")}
        </Label>
        <Field name="email">
          {({ field }: FieldProps) => (
            <Input
              {...field}
              id="email"
              type="email"
              className={cn(touched.email && errors.email && "border-destructive")}
            />
          )}
        </Field>
        {touched.email && errors.email && (
          <span className="text-xs text-destructive">{errors.email}</span>
        )}
      </div>
    </>
  );
};

export default UserFormFields;
