import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import { Formik, Form, Field } from "formik";
import * as Yup from "yup";
import {
  ArrowLeft,
  Save,
  Search,
  UserPlus,
  Trash2,
  Shield,
  Users,
  Edit,
  Loader2,
} from "lucide-react";

import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { Badge } from "../../components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "../../components/ui/dialog";
import Avatar from "../../components/ui/avatar";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "../../components/ui/tooltip";

import MainContainer from "../../components/MainContainer";
import PermissionTransferList from "../../components/PermissionTransferList";
import api from "../../services/api";
import toastError from "../../errors/toastError";
import { i18n } from "../../translate/i18n";

interface Permission {
  id: string;
  name: string;
}

interface GroupUser {
  id: string;
  name: string;
  email?: string;
}

interface GroupFormValues {
  name: string;
  permissions?: Permission[];
  users?: GroupUser[];
}

const GroupSchema = Yup.object().shape({
  name: Yup.string()
    .min(2, "Nome muito curto!")
    .max(50, "Nome muito longo!")
    .required("Nome é obrigatório"),
});


const GroupEdit: React.FC = () => {
  const { groupId } = useParams<{ groupId: string }>();
  const navigate = useNavigate();
  const isNew = groupId === "new";

  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [group, setGroup] = useState<GroupFormValues>({ name: "", permissions: [], users: [] });
  const [allPermissions, setAllPermissions] = useState<Permission[]>([]);
  const [allUsers, setAllUsers] = useState<GroupUser[]>([]);
  const [selectedPermissions, setSelectedPermissions] = useState<string[]>([]);
  const [groupUsers, setGroupUsers] = useState<GroupUser[]>([]);
  const [userSearchTerm, setUserSearchTerm] = useState("");
  const [addUserDialogOpen, setAddUserDialogOpen] = useState(false);
  const [availableUserSearch, setAvailableUserSearch] = useState("");

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const requests: Promise<unknown>[] = [
          api.get("/permissions"),
          api.get("/users"),
        ];
        if (!isNew) requests.unshift(api.get(`/groups/${groupId}`));

        const responses = await Promise.all(requests);

        if (isNew) {
          const [permissionsRes, usersRes] = responses as [
            { data: Permission[] },
            { data: GroupUser[] | { users: GroupUser[] } },
          ];
          setAllPermissions(permissionsRes.data);
          setAllUsers(
            Array.isArray(usersRes.data)
              ? usersRes.data
              : (usersRes.data as { users: GroupUser[] }).users || []
          );
        } else {
          const [groupRes, permissionsRes, usersRes] = responses as [
            { data: GroupFormValues & { users?: GroupUser[]; permissions?: Permission[] } },
            { data: Permission[] },
            { data: GroupUser[] | { users: GroupUser[] } },
          ];
          setGroup(groupRes.data);
          setSelectedPermissions(
            groupRes.data.permissions?.map((p) => p.id) || []
          );
          setGroupUsers(groupRes.data.users || []);
          setAllPermissions(permissionsRes.data);
          setAllUsers(
            Array.isArray(usersRes.data)
              ? usersRes.data
              : (usersRes.data as { users: GroupUser[] }).users || []
          );
        }
      } catch (err) {
        toastError(err);
        navigate("/groups");
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [groupId, isNew, navigate]);

  const handleSave = async (values: GroupFormValues) => {
    setSaving(true);
    try {
      const groupData = {
        name: values.name,
        permissions: selectedPermissions,
        userIds: groupUsers.map((u) => u.id),
      };
      if (isNew) {
        await api.post("/groups", groupData);
        toast.success(i18n.t("groupModal.success"));
        navigate("/groups");
      } else {
        await api.put(`/groups/${groupId}`, groupData);
        toast.success(i18n.t("groupModal.success"));
      }
    } catch (err) {
      toastError(err);
    } finally {
      setSaving(false);
    }
  };

  const handleRemoveUser = (userId: string) => {
    setGroupUsers((prev) => prev.filter((u) => u.id !== userId));
  };

  const handleAddUser = (user: GroupUser) => {
    if (!groupUsers.find((u) => u.id === user.id)) {
      setGroupUsers((prev) => [...prev, user]);
    }
    setAddUserDialogOpen(false);
    setAvailableUserSearch("");
  };

  const filteredGroupUsers = groupUsers.filter(
    (u) =>
      u.name.toLowerCase().includes(userSearchTerm.toLowerCase()) ||
      u.email?.toLowerCase().includes(userSearchTerm.toLowerCase())
  );

  const availableUsers = allUsers.filter(
    (u) =>
      !groupUsers.find((gu) => gu.id === u.id) &&
      (u.name.toLowerCase().includes(availableUserSearch.toLowerCase()) ||
        u.email?.toLowerCase().includes(availableUserSearch.toLowerCase()))
  );

  if (loading) {
    return (
      <MainContainer>
        <div className="flex min-h-[400px] items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </MainContainer>
    );
  }

  return (
    <MainContainer>
      <Formik
        initialValues={group}
        enableReinitialize
        validationSchema={GroupSchema}
        onSubmit={handleSave}
      >
        {({ touched, errors }) => (
          <Form className="animate-in fade-in slide-in-from-bottom-2 duration-300">
            {/* Header */}
            <div
              className="mb-6 flex items-center justify-between rounded-2xl p-4 backdrop-blur"
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
                  onClick={() => navigate("/groups")}
                >
                  <ArrowLeft className="h-4 w-4" />
                </Button>
                <div>
                  <h1 className="text-xl font-semibold">
                    {isNew
                      ? i18n.t("groupModal.title.add")
                      : i18n.t("groupModal.title.edit")}
                  </h1>
                  {!isNew && (
                    <p className="text-sm text-muted-foreground">{group.name}</p>
                  )}
                </div>
              </div>
              <Button type="submit" disabled={saving} className="rounded-xl">
                {saving ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Save className="mr-2 h-4 w-4" />
                )}
                {isNew
                  ? i18n.t("groupModal.buttons.okAdd")
                  : i18n.t("groupModal.buttons.okEdit")}
              </Button>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              {/* Dados do Grupo */}
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
                    className={
                      touched.name && errors.name ? "border-destructive" : ""
                    }
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
                      {selectedPermissions.length} permissões
                    </Badge>
                    <Badge variant="secondary">
                      <Users className="mr-1 h-3 w-3" />
                      {groupUsers.length} usuários
                    </Badge>
                  </div>
                </div>
              </div>

              {/* Usuários */}
              <div className="rounded-2xl border border-border bg-card p-5 shadow-sm transition-shadow hover:shadow-md">
                <div className="mb-4 flex items-center gap-3 border-b border-border pb-3">
                  <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-success/20 text-success">
                    <Users className="h-4 w-4" />
                  </span>
                  <span className="text-base font-semibold">
                    Usuários do Grupo
                  </span>
                  <Badge className="ml-auto" variant="secondary">
                    {groupUsers.length}
                  </Badge>
                </div>

                <div className="relative mb-3">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder="Buscar usuários..."
                    value={userSearchTerm}
                    onChange={(e) => setUserSearchTerm(e.target.value)}
                    className="pl-9"
                  />
                </div>

                <ul className="max-h-[280px] space-y-1 overflow-y-auto">
                  {filteredGroupUsers.length === 0 ? (
                    <div className="flex flex-col items-center py-6 text-center text-muted-foreground">
                      <Users className="mb-2 h-10 w-10 opacity-30" />
                      <p className="text-sm">Nenhum usuário no grupo</p>
                    </div>
                  ) : (
                    filteredGroupUsers.map((u) => (
                      <li
                        key={u.id}
                        className="flex items-center gap-3 rounded-lg px-2 py-1 hover:bg-accent"
                      >
                        <Avatar name={u.name} size="sm" />
                        <div className="flex-1 min-w-0">
                          <p className="truncate text-sm font-medium">{u.name}</p>
                          <p className="truncate text-xs text-muted-foreground">
                            {u.email}
                          </p>
                        </div>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-destructive hover:text-destructive"
                              onClick={() => handleRemoveUser(u.id)}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>Remover do grupo</TooltipContent>
                        </Tooltip>
                      </li>
                    ))
                  )}
                </ul>

                <Button
                  type="button"
                  variant="outline"
                  className="mt-3 w-full rounded-lg"
                  onClick={() => setAddUserDialogOpen(true)}
                >
                  <UserPlus className="mr-2 h-4 w-4" />
                  Adicionar Usuário
                </Button>
              </div>

              {/* Permissões */}
              <div className="rounded-2xl border border-border bg-card p-5 shadow-sm transition-shadow hover:shadow-md md:col-span-2">
                <div className="mb-4 flex items-center gap-3 border-b border-border pb-3">
                  <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-warning/20 text-warning">
                    <Shield className="h-4 w-4" />
                  </span>
                  <span className="text-base font-semibold">Permissões</span>
                  <Badge variant="outline" className="ml-auto">
                    {selectedPermissions.length}/{allPermissions.length}
                  </Badge>
                </div>
                <PermissionTransferList
                  allPermissions={allPermissions}
                  selectedPermissions={selectedPermissions}
                  onChange={setSelectedPermissions}
                />
              </div>
            </div>
          </Form>
        )}
      </Formik>

      {/* Dialog: adicionar usuário */}
      <Dialog open={addUserDialogOpen} onOpenChange={setAddUserDialogOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Adicionar Usuário ao Grupo</DialogTitle>
          </DialogHeader>
          <div className="relative mb-3">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Buscar usuário..."
              value={availableUserSearch}
              onChange={(e) => setAvailableUserSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <ul className="max-h-[260px] space-y-1 overflow-y-auto">
            {availableUsers.length === 0 ? (
              <li className="py-4 text-center text-sm text-muted-foreground">
                Nenhum usuário disponível
              </li>
            ) : (
              availableUsers.map((u) => (
                <li
                  key={u.id}
                  className="flex cursor-pointer items-center gap-3 rounded-lg px-2 py-1.5 transition-all hover:bg-accent hover:translate-x-1"
                  onClick={() => handleAddUser(u)}
                >
                  <Avatar name={u.name} size="sm" />
                  <div className="flex-1 min-w-0">
                    <p className="truncate text-sm font-medium">{u.name}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      {u.email}
                    </p>
                  </div>
                  <UserPlus className="h-4 w-4 text-primary" />
                </li>
              ))
            )}
          </ul>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setAddUserDialogOpen(false)}
            >
              Cancelar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </MainContainer>
  );
};

export default GroupEdit;
