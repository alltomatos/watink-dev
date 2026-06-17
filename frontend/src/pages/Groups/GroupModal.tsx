/* @jsxImportSource react */
import React, { useState, useEffect } from "react";
import * as Yup from "yup";
import { Formik, Form, Field } from "formik";
import { toast } from "react-toastify";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Loader2 } from "lucide-react";
import api from "../../services/api";
import toastError from "../../errors/toastError";
import { i18n } from "../../translate/i18n";

// ─── Types ───────────────────────────────────────────────────────────────────

interface Permission {
  id: string;
  name: string;
  description?: string;
}

interface GroupFormValues {
  name: string;
}

const CATEGORY_MAP: Record<string, string> = {
  contacts: "Contatos",
  tickets: "Tickets",
  users: "Usuários",
  groups: "Grupos",
  quick_answers: "Respostas Rápidas",
  flows: "Flow Builder",
  knowledge_bases: "Base de Conhecimento",
  connections: "Conexões",
  queues: "Filas",
  settings: "Configurações",
  dashboard: "Dashboard",
  pipelines: "Pipelines",
  swagger: "Desenvolvedor",
  clients: "Clientes",
  helpdesk: "Helpdesk",
  marketplace: "Marketplace",
};

const categoryOf = (name: string): string => {
  for (const [key, label] of Object.entries(CATEGORY_MAP)) {
    if (name.includes(key)) return label;
  }
  return "Outros";
};

const groupPermissions = (perms: Permission[]): Record<string, Permission[]> => {
  const grouped: Record<string, Permission[]> = {};
  perms.forEach((p) => {
    const cat = categoryOf(p.name);
    if (!grouped[cat]) grouped[cat] = [];
    grouped[cat].push(p);
  });
  return grouped;
};

// ─── Component ────────────────────────────────────────────────────────────────

interface GroupModalProps {
  open: boolean;
  onClose: () => void;
  groupId?: string | null;
}

const GroupModal: React.FC<GroupModalProps> = ({ open, onClose, groupId }) => {
  const [allPermissions, setAllPermissions] = useState<Permission[]>([]);
  const [selectedPermissions, setSelectedPermissions] = useState<string[]>([]);
  const [groupName, setGroupName] = useState("");

  useEffect(() => {
    if (!open) return;
    const fetchPermissions = async () => {
      try {
        const { data } = await api.get<Permission[]>("/permissions");
        setAllPermissions(Array.isArray(data) ? data : []);
      } catch (err) {
        toastError(err);
      }
    };
    fetchPermissions();
  }, [open]);

  useEffect(() => {
    if (!open || !groupId) {
      setSelectedPermissions([]);
      setGroupName("");
      return;
    }
    const fetchGroup = async () => {
      try {
        const { data } = await api.get<{ name?: string; permissions?: Permission[] }>(`/groups/${groupId}`);
        setGroupName(data?.name ?? "");
        setSelectedPermissions(
          Array.isArray(data?.permissions) ? data.permissions.map((p) => p.id) : []
        );
      } catch (err) {
        toastError(err);
      }
    };
    fetchGroup();
  }, [open, groupId]);

  const handlePermissionToggle = (permissionId: string) => {
    setSelectedPermissions((prev) =>
      prev.includes(permissionId)
        ? prev.filter((id) => id !== permissionId)
        : [...prev, permissionId]
    );
  };

  const handleSubmit = async (values: GroupFormValues) => {
    const payload = { ...values, permissions: selectedPermissions };
    try {
      if (groupId) {
        await api.put(`/groups/${groupId}`, payload);
        toast.success(i18n.t("groupModal.success"));
      } else {
        await api.post("/groups", payload);
        toast.success(i18n.t("groupModal.success"));
      }
      onClose();
    } catch (err) {
      toastError(err);
    }
  };

  const grouped = groupPermissions(allPermissions);
  const schema = Yup.object().shape({
    name: Yup.string()
      .min(2, "Muito curto!")
      .max(50, "Muito longo!")
      .required("Obrigatório"),
  });

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {groupId ? i18n.t("groupModal.title.edit") : i18n.t("groupModal.title.add")}
          </DialogTitle>
        </DialogHeader>

        <Formik
          initialValues={{ name: groupName }}
          enableReinitialize
          validationSchema={schema}
          onSubmit={(values, { setSubmitting }) => {
            setTimeout(() => {
              handleSubmit(values);
              setSubmitting(false);
            }, 300);
          }}
        >
          {({ touched, errors, isSubmitting }) => (
            <Form>
              <div className="space-y-6">
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
                  {touched.name && errors.name && (
                    <p className="text-xs text-destructive">{errors.name}</p>
                  )}
                </div>

                {Object.entries(grouped).map(([category, perms]) => (
                  <div key={category} className="space-y-3">
                    <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                      {category}
                    </h3>
                    <div className="grid grid-cols-2 gap-2">
                      {perms.map((permission) => (
                        <label
                          key={permission.id}
                          className="flex items-start gap-2.5 rounded-md border border-border bg-card p-3 cursor-pointer hover:bg-muted/50 transition-colors"
                        >
                          <Checkbox
                            id={`perm-${permission.id}`}
                            checked={selectedPermissions.includes(permission.id)}
                            onCheckedChange={() => handlePermissionToggle(permission.id)}
                          />
                          <span className="text-sm leading-tight pt-0.5">
                            {permission.description || permission.name}
                          </span>
                        </label>
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              <DialogFooter className="mt-6 gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={onClose}
                  disabled={isSubmitting}
                >
                  {i18n.t("groupModal.buttons.cancel")}
                </Button>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {groupId ? i18n.t("groupModal.buttons.okEdit") : i18n.t("groupModal.buttons.okAdd")}
                </Button>
              </DialogFooter>
            </Form>
          )}
        </Formik>
      </DialogContent>
    </Dialog>
  );
};

export default GroupModal;