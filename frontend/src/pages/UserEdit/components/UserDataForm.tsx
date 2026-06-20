import React, { useContext } from "react";
import { Form, Field } from "formik";
import { Eye, EyeOff, Loader2 } from "lucide-react";

import { Button } from "../../../components/ui/button";
import { Input } from "../../../components/ui/input";
import { Label } from "../../../components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../../components/ui/select";

import QueueSelect from "../../../components/QueueSelect";
import { Can } from "../../../components/Can";
import { AuthContext } from "../../../context/Auth/AuthContext";
import useWhatsApps from "../../../hooks/useWhatsApps";
import { i18n } from "../../../translate/i18n";
import { Role, WhatsApp } from "../userEditTypes";

interface UserDataFormProps {
  touched: Record<string, boolean>;
  errors: Record<string, string>;
  isSubmitting: boolean;
  values: { profile: string; roleId: string };
  setFieldValue: (field: string, value: unknown) => void;
  showPassword: boolean;
  onTogglePassword: () => void;
  selectedQueueIds: string[];
  onQueuesChange: (vals: string[]) => void;
  whatsappId: string;
  onWhatsappChange: (val: string) => void;
  roles: Role[];
}

const UserDataForm: React.FC<UserDataFormProps> = ({
  touched,
  errors,
  isSubmitting,
  values,
  setFieldValue,
  showPassword,
  onTogglePassword,
  selectedQueueIds,
  onQueuesChange,
  whatsappId,
  onWhatsappChange,
  roles,
}) => {
  const { user: loggedInUser } = useContext(AuthContext);
  const { loading: loadingWapps, whatsApps } = useWhatsApps();

  return (
    <Form className="space-y-4">
      <div className="flex gap-4">
        <div className="flex-1 space-y-1">
          <Label htmlFor="name">{i18n.t("userModal.form.name")}</Label>
          <Field
            as={Input}
            id="name"
            name="name"
            className={touched.name && errors.name ? "border-destructive" : ""}
          />
          {touched.name && errors.name && (
            <p className="text-xs text-destructive">{errors.name}</p>
          )}
        </div>

        <div className="flex-1 space-y-1">
          <Label htmlFor="password">{i18n.t("userModal.form.password")}</Label>
          <div className="relative">
            <Field
              as={Input}
              id="password"
              name="password"
              type={showPassword ? "text" : "password"}
              className={
                touched.password && errors.password
                  ? "border-destructive pr-10"
                  : "pr-10"
              }
            />
            <button
              type="button"
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
              onClick={onTogglePassword}
            >
              {showPassword ? (
                <EyeOff className="h-4 w-4" />
              ) : (
                <Eye className="h-4 w-4" />
              )}
            </button>
          </div>
          {touched.password && errors.password && (
            <p className="text-xs text-destructive">{errors.password}</p>
          )}
        </div>
      </div>

      <div className="flex gap-4">
        <div className="flex-1 space-y-1">
          <Label htmlFor="email">{i18n.t("userModal.form.email")}</Label>
          <Field
            as={Input}
            id="email"
            name="email"
            type="email"
            className={
              touched.email && errors.email ? "border-destructive" : ""
            }
          />
          {touched.email && errors.email && (
            <p className="text-xs text-destructive">{errors.email}</p>
          )}
        </div>

        <Can
          role={loggedInUser.profile}
          perform="user-modal:editProfile"
          yes={() => (
            <div className="flex-1 space-y-1">
              <Label>{i18n.t("userModal.form.profile")}</Label>
              <Select
                value={values.profile}
                onValueChange={(v) => setFieldValue("profile", v)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="user">User</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                  <SelectItem value="superadmin">Super Admin</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}
        />

        <div className="flex-1 space-y-1">
          <Label>Função</Label>
          <Select
            value={values.roleId}
            onValueChange={(v) => setFieldValue("roleId", v)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Nenhuma" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">
                <em>Nenhuma</em>
              </SelectItem>
              {roles.map((role) => (
                <SelectItem key={role.id} value={role.id}>
                  {role.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <Can
        role={loggedInUser.profile}
        perform="user-modal:editQueues"
        yes={() => (
          <QueueSelect
            selectedQueueIds={(selectedQueueIds || []) as unknown as number[]}
            onChange={(vals: number[]) =>
              onQueuesChange((vals as unknown as string[]) || [])
            }
          />
        )}
      />

      <Can
        role={loggedInUser.profile}
        perform="user-modal:editQueues"
        yes={() =>
          !loadingWapps ? (
            <div className="space-y-1">
              <Label>{i18n.t("userModal.form.whatsapp")}</Label>
              <Select value={whatsappId} onValueChange={onWhatsappChange}>
                <SelectTrigger>
                  <SelectValue placeholder="&nbsp;" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">&nbsp;</SelectItem>
                  {(whatsApps as WhatsApp[]).map((w) => (
                    <SelectItem key={w.id} value={String(w.id)}>
                      {w.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ) : null
        }
      />

      <div className="pt-2">
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {i18n.t("userModal.buttons.okEdit")}
        </Button>
      </div>
    </Form>
  );
};

export default UserDataForm;
