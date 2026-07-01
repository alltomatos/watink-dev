import React from "react";
import { Field, FieldProps } from "formik";
import { Eye, EyeOff } from "lucide-react";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

interface UserDataSectionProps {
  isNew: boolean;
  touched: Partial<Record<"name" | "email" | "password", boolean>>;
  errors: Partial<Record<"name" | "email" | "password", string>>;
  showPassword: boolean;
  onTogglePassword: () => void;
}

const UserDataSection: React.FC<UserDataSectionProps> = ({
  isNew,
  touched,
  errors,
  showPassword,
  onTogglePassword,
}) => {
  return (
    <div className="space-y-3">
      <div className="space-y-1.5">
        <Label htmlFor="name" className={cn(touched.name && errors.name && "text-destructive")}>
          Nome
        </Label>
        <Field name="name">
          {({ field }: FieldProps) => (
            <Input {...field} id="name" autoFocus className={cn(touched.name && errors.name && "border-destructive")} />
          )}
        </Field>
        {touched.name && errors.name && <p className="text-xs text-destructive">{errors.name}</p>}
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="email" className={cn(touched.email && errors.email && "text-destructive")}>
          Email
        </Label>
        <Field name="email">
          {({ field }: FieldProps) => (
            <Input {...field} id="email" type="email" className={cn(touched.email && errors.email && "border-destructive")} />
          )}
        </Field>
        {touched.email && errors.email && <p className="text-xs text-destructive">{errors.email}</p>}
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="password" className={cn(touched.password && errors.password && "text-destructive")}>
          {isNew ? "Senha" : "Nova senha (deixe em branco para manter)"}
        </Label>
        <div className="relative">
          <Field name="password">
            {({ field }: FieldProps) => (
              <Input
                {...field}
                id="password"
                type={showPassword ? "text" : "password"}
                className={cn("pr-10", touched.password && errors.password && "border-destructive")}
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
        {touched.password && errors.password && <p className="text-xs text-destructive">{errors.password}</p>}
      </div>
    </div>
  );
};

export default UserDataSection;
