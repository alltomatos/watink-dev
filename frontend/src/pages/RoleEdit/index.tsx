import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import { Formik, Form, Field } from "formik";
import * as Yup from "yup";
import { ArrowLeft, Save, Edit, Shield, Loader2 } from "lucide-react";

import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { Textarea } from "../../components/ui/textarea";

import { PageLayout } from "../../components/ui/page-layout";
import RolePermissionTransferList from "../../components/RolePermissionTransferList";
import api from "../../services/api";
import toastError from "../../errors/toastError";
import { i18n } from "../../translate/i18n";

interface Permission {
  id: string;
  name: string;
  permissionId?: string;
}

interface RoleFormValues {
  name: string;
  description: string;
  permissions?: Permission[];
  RolePermissions?: Permission[];
}

const RoleSchema = Yup.object().shape({
  name: Yup.string()
    .min(2, "Nome muito curto!")
    .max(50, "Nome muito longo!")
    .required("Nome é obrigatório"),
  description: Yup.string().max(100, "Descrição muito longa!"),
});

const RoleEdit: React.FC = () => {
  const { roleId } = useParams<{ roleId: string }>();
  const navigate = useNavigate();
  const isNew = roleId === "new";

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [role, setRole] = useState<RoleFormValues>({ name: "", description: "", permissions: [] });
  const [allPermissions, setAllPermissions] = useState<Permission[]>([]);
  const [selectedPermissions, setSelectedPermissions] = useState<string[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const requests: Promise<unknown>[] = [api.get("/permissions")];
        if (!isNew) requests.push(api.get(`/roles/${roleId}`));

        const responses = await Promise.all(requests);
        const [permissionsRes, roleRes] = responses as [
          { data: Permission[] },
          { data: RoleFormValues } | undefined,
        ];

        setAllPermissions(permissionsRes.data);

        if (!isNew && roleRes) {
          setRole(roleRes.data);
          const perms =
            roleRes.data.permissions || roleRes.data.RolePermissions || [];
          setSelectedPermissions(
            perms.map((p) => String(p.permissionId || p.id))
          );
        }
      } catch (err) {
        toastError(err);
        navigate("/roles");
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [roleId, isNew, navigate]);

  const handleSave = async (values: RoleFormValues) => {
    setSaving(true);
    try {
      const roleData = {
        name: values.name,
        description: values.description,
        permissionIds: selectedPermissions,
        permissions: selectedPermissions,
      };
      if (isNew) {
        await api.post("/roles", roleData);
      } else {
        await api.put(`/roles/${roleId}`, roleData);
      }
      toast.success(i18n.t("role.success"));
      navigate("/roles");
    } catch (err) {
      toastError(err);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <PageLayout>
        <div className="flex min-h-[400px] items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </PageLayout>
    );
  }

  return (
    <PageLayout>
      <Formik
        initialValues={role}
        enableReinitialize
        validationSchema={RoleSchema}
        onSubmit={handleSave}
      >
        {({ touched, errors }) => (
          <Form className="animate-in fade-in slide-in-from-bottom-2 duration-300 space-y-4">
            {/* Header */}
            <div
              className="flex items-center justify-between rounded-2xl p-4 backdrop-blur"
              style={{
                background:
                  "linear-gradient(135deg, color-mix(in srgb, var(--primary) 8%, transparent) 0%, color-mix(in srgb, var(--secondary) 6%, transparent) 100%)",
              }}
            >
              <div className="flex items-center gap-3">
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="rounded-xl shadow-sm"
                  onClick={() => navigate("/roles")}
                >
                  <ArrowLeft className="h-4 w-4" />
                </Button>
                <div>
                  <h1 className="text-xl font-semibold">
                    {isNew
                      ? i18n.t("role.formTitle.add") || "Adicionar Função"
                      : i18n.t("role.formTitle.edit") || "Editar Função"}
                  </h1>
                  {!isNew && (
                    <p className="text-sm text-muted-foreground">{role.name}</p>
                  )}
                </div>
              </div>
              <Button type="submit" disabled={saving} className="rounded-xl">
                {saving ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Save className="mr-2 h-4 w-4" />
                )}
                {i18n.t("common.save") || "Salvar"}
              </Button>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              {/* Dados da Função */}
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
                      className={
                        touched.name && errors.name ? "border-destructive" : ""
                      }
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

              {/* Permissões */}
              <div className="rounded-2xl border border-border bg-card p-5 shadow-sm transition-shadow hover:shadow-md md:col-span-2">
                <div className="mb-4 flex items-center gap-3 border-b border-border pb-3">
                  <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-info/20 text-info">
                    <Shield className="h-4 w-4" />
                  </span>
                  <span className="text-base font-semibold">Permissões</span>
                </div>
                <RolePermissionTransferList
                  allPermissions={allPermissions}
                  selectedPermissions={selectedPermissions}
                  onChange={(ids) => setSelectedPermissions(ids as string[])}
                />
              </div>
            </div>
          </Form>
        )}
      </Formik>
    </PageLayout>
  );
};

export default RoleEdit;
