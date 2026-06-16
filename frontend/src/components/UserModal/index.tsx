import React, { useState, useEffect, useContext } from "react";
import { Formik, Form, Field, FieldProps } from "formik";
import { toast } from "react-toastify";
import { Eye, EyeOff, Loader2, ChevronDown } from "lucide-react";

import { i18n } from "../../translate/i18n";
import api from "../../services/api";
import toastError from "../../errors/toastError";
import QueueSelect from "../QueueSelect";
import { AuthContext } from "../../context/Auth/AuthContext";
import { Can } from "../Can";
import useWhatsApps from "../../hooks/useWhatsApps";
import { UserSchema } from "../../utils/userValidation";
import type {
  Group,
  Role,
  UserDetail,
  UserQueue,
  UserSavePayload,
} from "../../types/domain";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

/** Local Formik form values — a subset of UserDetail */
type UserFormValues = Pick<UserDetail, "name" | "email" | "password" | "groupIds">;

interface UserModalProps {
  open: boolean;
  onClose: () => void;
  userId?: number | string;
}

const UserModal: React.FC<UserModalProps> = ({ open, onClose, userId }) => {
  const initialState: UserFormValues = {
    name: "",
    email: "",
    password: "",
    groupIds: [],
  };

  const { user: _loggedInUser } = useContext(AuthContext);

  const [user, setUser] = useState<UserFormValues>(initialState);
  const [selectedQueueIds, setSelectedQueueIds] = useState<number[]>([]);
  const [showPassword, setShowPassword] = useState(false);
  const [whatsappId, setWhatsappId] = useState<number | string>("");
  const [groups, setGroups] = useState<Group[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [selectedRoleIds, setSelectedRoleIds] = useState<number[]>([]);
  const { loading, whatsApps } = useWhatsApps();

  useEffect(() => {
    const fetchGroups = async () => {
      try {
        const { data } = await api.get("/groups");
        setGroups(data);
      } catch (err) {
        toastError(err);
      }
    };
    const fetchRoles = async () => {
      try {
        const { data } = await api.get("/roles");
        setRoles(data);
      } catch (err) {
        toastError(err);
      }
    };
    fetchGroups();
    fetchRoles();
  }, []);

  useEffect(() => {
    const fetchUser = async () => {
      if (!userId || !open) return;
      try {
        const { data } = await api.get<UserDetail>(`/users/${userId}`);
        const userGroupIds = data.groups?.map((group: Group) => group.id) ?? [];
        const userRoleIds = data.roles?.map((role: Role) => role.id) ?? [];
        setUser((prevState) => ({
          ...prevState,
          name: data.name,
          email: data.email,
          groupIds: userGroupIds,
        }));
        const userQueueIds = data.queues?.map((queue: UserQueue) => queue.id) ?? [];
        setSelectedQueueIds(userQueueIds);
        setSelectedRoleIds(userRoleIds);
        setWhatsappId(data.whatsappId ? data.whatsappId : "");
      } catch (err) {
        toastError(err);
      }
    };

    fetchUser();
  }, [userId, open]);

  const handleClose = () => {
    onClose();
    setUser(initialState);
    setSelectedRoleIds([]);
    setSelectedQueueIds([]);
    setWhatsappId("");
  };

  const handleSaveUser = async (values: UserFormValues) => {
    const userData: UserSavePayload = {
      name: values.name,
      email: values.email,
      password: values.password,
      whatsappId: whatsappId === "" ? null : Number(whatsappId),
      queueIds: selectedQueueIds,
      roleIds: selectedRoleIds,
      groupIds: values.groupIds ?? [],
    };
    try {
      if (userId) {
        await api.put(`/users/${userId}`, userData);
      } else {
        await api.post("/users", userData);
      }
      toast.success(i18n.t("userModal.success"));
      handleClose();
    } catch (err) {
      toastError(err);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && handleClose()}>
      <DialogContent className="sm:max-w-[450px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {userId
              ? i18n.t("userModal.title.edit")
              : i18n.t("userModal.title.add")}
          </DialogTitle>
        </DialogHeader>

        <Formik
          initialValues={user}
          enableReinitialize={true}
          validationSchema={UserSchema}
          onSubmit={async (values, actions) => {
            await handleSaveUser(values);
            actions.setSubmitting(false);
          }}
        >
          {({ touched, errors, isSubmitting, values, setFieldValue }) => (
            <Form className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-2">
                  <Label htmlFor="name" className={cn(touched.name && errors.name && "text-destructive")}>
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
                  <Label htmlFor="password" className={cn(touched.password && errors.password && "text-destructive")}>
                    {i18n.t("userModal.form.password")}
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
                      onClick={() => setShowPassword(!showPassword)}
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
                <Label htmlFor="email" className={cn(touched.email && errors.email && "text-destructive")}>
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

              {/* Roles Selection */}
              <div className="flex flex-col gap-2">
                <Label>{i18n.t("userModal.form.role")}</Label>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="outline"
                      className="w-full justify-between font-normal"
                    >
                      <span className="truncate">
                        {selectedRoleIds.length > 0
                          ? roles
                              .filter((r) => selectedRoleIds.includes(r.id))
                              .map((r) => r.name)
                              .join(", ")
                          : i18n.t("userModal.form.role")}
                      </span>
                      <ChevronDown className="h-4 w-4 opacity-50" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent className="w-[var(--radix-dropdown-menu-trigger-width)]">
                    {roles.map((role) => (
                      <DropdownMenuCheckboxItem
                        key={role.id}
                        checked={selectedRoleIds.includes(role.id)}
                        onCheckedChange={(checked) => {
                          setSelectedRoleIds((prev) =>
                            checked
                              ? [...prev, role.id]
                              : prev.filter((id) => id !== role.id)
                          );
                        }}
                      >
                        {role.name}
                      </DropdownMenuCheckboxItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>

              {/* Groups Selection */}
              <div className="flex flex-col gap-2">
                <Label>{i18n.t("userModal.form.group")}</Label>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="outline"
                      className="w-full justify-between font-normal"
                    >
                      <span className="truncate">
                        {values.groupIds && values.groupIds.length > 0
                          ? groups
                              .filter((g) => values.groupIds?.includes(g.id))
                              .map((g) => g.name)
                              .join(", ")
                          : i18n.t("userModal.form.group")}
                      </span>
                      <ChevronDown className="h-4 w-4 opacity-50" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent className="w-[var(--radix-dropdown-menu-trigger-width)]">
                    {groups.map((group) => (
                      <DropdownMenuCheckboxItem
                        key={group.id}
                        checked={values.groupIds?.includes(group.id)}
                        onCheckedChange={(checked) => {
                          const currentGroups = values.groupIds || [];
                          const nextGroups = checked
                            ? [...currentGroups, group.id]
                            : currentGroups.filter((id) => id !== group.id);
                          setFieldValue("groupIds", nextGroups);
                        }}
                      >
                        {group.name}
                      </DropdownMenuCheckboxItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>

              <Can
                perform="user-modal:editQueues"
                yes={() => (
                  <QueueSelect
                    selectedQueueIds={selectedQueueIds}
                    onChange={(values) => setSelectedQueueIds(values)}
                  />
                )}
              />

              <Can
                perform="user-modal:editQueues"
                yes={() =>
                  !loading && (
                    <div className="flex flex-col gap-2">
                      <Label>{i18n.t("userModal.form.whatsapp")}</Label>
                      <Select
                        value={whatsappId.toString()}
                        onValueChange={(val) => setWhatsappId(val === "none" ? "" : parseInt(val))}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder={i18n.t("userModal.form.whatsapp")} />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">&nbsp;</SelectItem>
                          {whatsApps.map((whatsapp) => (
                            <SelectItem key={whatsapp.id} value={whatsapp.id.toString()}>
                              {whatsapp.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )
                }
              />

              <DialogFooter className="pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleClose}
                  disabled={isSubmitting}
                >
                  {i18n.t("userModal.buttons.cancel")}
                </Button>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {userId
                    ? i18n.t("userModal.buttons.okEdit")
                    : i18n.t("userModal.buttons.okAdd")}
                </Button>
              </DialogFooter>
            </Form>
          )}
        </Formik>
      </DialogContent>
    </Dialog>
  );
};

export default UserModal;
