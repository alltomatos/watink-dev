import React, { useState, useEffect, useContext } from "react";
import { Formik, Form, Field } from "formik";
import { toast } from "react-toastify";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Eye, EyeOff, Loader2 } from "lucide-react";

import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { Checkbox } from "../../components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../../components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../components/ui/select";

import { PageLayout, PageHeader, PageContent } from "../../components/ui/page-layout";
import QueueSelect from "../../components/QueueSelect";
import { Can } from "../../components/Can";
import { AuthContext } from "../../context/Auth/AuthContext";
import useWhatsApps from "../../hooks/useWhatsApps";
import api from "../../services/api";
import { i18n } from "../../translate/i18n";
import toastError from "../../errors/toastError";
import { UserSchema } from "../../utils/userValidation";

interface UserFormValues {
  name: string;
  email: string;
  password: string;
  profile: string;
  roleId: string;
}

interface Role {
  id: string;
  name: string;
}

interface Permission {
  id: string;
  name: string;
  description?: string;
}

interface WhatsApp {
  id: number;
  name: string;
}

const UserEdit: React.FC = () => {
  const { userId } = useParams<{ userId: string }>();
  const navigate = useNavigate();
  const isNew = userId === "new";

  const initialState: UserFormValues = {
    name: "",
    email: "",
    password: "",
    profile: "user",
    roleId: "",
  };

  const { user: loggedInUser } = useContext(AuthContext);
  const [user, setUser] = useState<UserFormValues>(initialState);
  const [selectedQueueIds, setSelectedQueueIds] = useState<string[]>([]);
  const [showPassword, setShowPassword] = useState(false);
  const [whatsappId, setWhatsappId] = useState<string>("");
  const { loading: loadingWapps, whatsApps } = useWhatsApps();
  const [roles, setRoles] = useState<Role[]>([]);
  const [allPermissions, setAllPermissions] = useState<Permission[]>([]);
  const [selectedPermissions, setSelectedPermissions] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const requests: Promise<unknown>[] = [
          api.get("/roles"),
          api.get("/permissions"),
        ];
        if (!isNew) requests.push(api.get(`/users/${userId}`));

        const responses = await Promise.all(requests);
        const [rolesRes, permissionsRes, userRes] = responses as [
          { data: Role[] | { roles: Role[] } },
          { data: Permission[] },
          { data: { queues?: { id: string }[]; whatsappId?: string; permissions?: { id: string }[]; name: string; email: string; profile: string; roleId?: string } } | undefined,
        ];

        setRoles(
          Array.isArray(rolesRes.data)
            ? rolesRes.data
            : (rolesRes.data as { roles: Role[] }).roles || []
        );
        setAllPermissions(permissionsRes.data);

        if (!isNew && userRes) {
          const data = userRes.data;
          setSelectedQueueIds(data.queues?.map((q) => String(q.id)) || []);
          setWhatsappId(String(data.whatsappId || ""));
          setSelectedPermissions(
            (data.permissions || []).map((p) => String(p.id || p))
          );
          setUser({
            name: data.name || "",
            email: data.email || "",
            password: "",
            profile: data.profile || "user",
            roleId: String(data.roleId || ""),
          });
        }
      } catch (err) {
        toastError(err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [userId, isNew]);

  const handleSaveUser = async (values: UserFormValues) => {
    const userData = {
      ...values,
      whatsappId,
      queueIds: selectedQueueIds,
      permissionIds: selectedPermissions,
      permissions: selectedPermissions,
    };
    try {
      if (isNew) {
        await api.post("/users", userData);
      } else {
        await api.put(`/users/${userId}`, userData);
      }
      toast.success(i18n.t("userModal.success"));
      navigate("/users");
    } catch (err) {
      toastError(err);
    }
  };

  const togglePermission = (permissionId: string) => {
    setSelectedPermissions((prev) =>
      prev.includes(permissionId)
        ? prev.filter((id) => id !== permissionId)
        : [...prev, permissionId]
    );
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
      <PageHeader
        title={
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" onClick={() => navigate("/users")}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <span>{isNew ? i18n.t("userModal.title.add") : user.name}</span>
          </div>
        }
      />

      <PageContent>
      <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
        <Tabs defaultValue="data">
          <TabsList>
            <TabsTrigger value="data">Dados do Usuário</TabsTrigger>
            <TabsTrigger value="advanced">Avançado (Exceções)</TabsTrigger>
          </TabsList>

          <TabsContent value="data" className="pt-4">
            <Formik
              initialValues={user}
              enableReinitialize
              validationSchema={UserSchema}
              onSubmit={(values, actions) => {
                handleSaveUser(values);
                actions.setSubmitting(false);
              }}
            >
              {({ touched, errors, isSubmitting, setFieldValue, values }) => (
                <Form className="space-y-4">
                  <div className="flex gap-4">
                    <div className="flex-1 space-y-1">
                      <Label htmlFor="name">{i18n.t("userModal.form.name")}</Label>
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

                    <div className="flex-1 space-y-1">
                      <Label htmlFor="password">
                        {i18n.t("userModal.form.password")}
                      </Label>
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
                          onClick={() => setShowPassword((p) => !p)}
                        >
                          {showPassword ? (
                            <EyeOff className="h-4 w-4" />
                          ) : (
                            <Eye className="h-4 w-4" />
                          )}
                        </button>
                      </div>
                      {touched.password && errors.password && (
                        <p className="text-xs text-destructive">
                          {errors.password as string}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex gap-4">
                    <div className="flex-1 space-y-1">
                      <Label htmlFor="email">
                        {i18n.t("userModal.form.email")}
                      </Label>
                      <Field
                        as={Input}
                        id="email"
                        name="email"
                        type="email"
                        className={
                          touched.email && errors.email
                            ? "border-destructive"
                            : ""
                        }
                      />
                      {touched.email && errors.email && (
                        <p className="text-xs text-destructive">
                          {errors.email as string}
                        </p>
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
                              <SelectItem value="superadmin">
                                Super Admin
                              </SelectItem>
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
                          setSelectedQueueIds(vals as any || [])
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
                          <Select
                            value={whatsappId}
                            onValueChange={setWhatsappId}
                          >
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
                      {isSubmitting && (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      )}
                      {i18n.t("userModal.buttons.okEdit")}
                    </Button>
                  </div>
                </Form>
              )}
            </Formik>
          </TabsContent>

          <TabsContent value="advanced" className="pt-4">
            <Can
              role={loggedInUser.profile}
              perform="user-modal:editProfile"
              yes={() => (
                <>
                  <div className="mb-4 rounded-lg border border-warning/30 bg-warning/10 p-3">
                    <p className="text-sm font-semibold">
                      ⚠️ Atenção: Permissões Específicas
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      As permissões marcadas aqui são adicionadas diretamente
                      a este usuário. Recomendamos usar Funções (Roles) sempre
                      que possível.
                    </p>
                  </div>
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 md:grid-cols-3">
                    {allPermissions.map((permission) => (
                      <label
                        key={permission.id}
                        className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1 hover:bg-accent"
                      >
                        <Checkbox
                          checked={selectedPermissions.includes(permission.id)}
                          onCheckedChange={() =>
                            togglePermission(permission.id)
                          }
                        />
                        <span className="text-sm">
                          {permission.description || permission.name}
                        </span>
                      </label>
                    ))}
                  </div>
                  <div className="mt-4">
                    <Button onClick={() => handleSaveUser(user)}>
                      Salvar Alterações
                    </Button>
                  </div>
                </>
              )}
              no={() => (
                <p className="text-sm text-destructive">
                  Você não tem permissão para editar permissões.
                </p>
              )}
            />
          </TabsContent>
        </Tabs>
      </div>
      </PageContent>
    </PageLayout>
  );
};

export default UserEdit;
