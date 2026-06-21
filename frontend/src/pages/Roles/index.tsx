/* @jsxImportSource react */
import React, { useState, useEffect } from "react";
import { toast } from "react-toastify";
import { useNavigate } from "react-router-dom";
import { 
  Search, 
  Plus, 
  Edit, 
  Trash2, 
  Loader2,
  Shield 
} from "lucide-react";

import api from "../../services/api";
import { i18n } from "../../translate/i18n";
import toastError from "../../errors/toastError";
import ConfirmationModal from "../../components/ConfirmationModal";

import { 
  PageContainer, 
  PageHeader, 
  PageContent 
} from "../../components/ui/page-layout";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "../../components/ui/table";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";

const Roles = () => {
  const navigate = useNavigate();

  interface Role {
    id: number;
    name: string;
    description?: string;
  }

  const [loading, setLoading] = useState(false);
  const [roles, setRoles] = useState<Role[]>([]);
  const [searchParam, setSearchParam] = useState("");
  const [selectedRole, setSelectedRole] = useState<Role | null>(null);
  const [confirmModalOpen, setConfirmModalOpen] = useState(false);

  useEffect(() => {
    const fetchRoles = async () => {
      setLoading(true);
      try {
        const { data } = await api.get("/roles", {
          params: { searchParam },
        });
        setRoles(data);
        setLoading(false);
      } catch (err) {
        toastError(err);
      }
    };
    const delayDebounceFn = setTimeout(() => {
      fetchRoles();
    }, 500);
    return () => clearTimeout(delayDebounceFn);
  }, [searchParam]);

  const handleSearch = (event: React.ChangeEvent<HTMLInputElement>) => {
    setSearchParam(event.target.value.toLowerCase());
  };

  const handleEditRole = (roleId: number) => {
    navigate(`/roles/${roleId}`);
  };

  const handleDeleteRole = async (roleId: number) => {
    try {
      await api.delete(`/roles/${roleId}`);
      toast.success(i18n.t("role.toasts.deleted"));
      setRoles(roles.filter((r) => r.id !== roleId));
    } catch (err) {
      toastError(err);
    }
    setSelectedRole(null);
  };

  return (
    <PageContainer>
      <ConfirmationModal
        title={
          selectedRole &&
          `${i18n.t("role.confirmationModal.deleteTitle")} ${selectedRole.name}?`
        }
        open={confirmModalOpen}
        onClose={() => setConfirmModalOpen(false)}
        onConfirm={() => selectedRole && handleDeleteRole(selectedRole.id)}
      >
        {i18n.t("role.confirmationModal.deleteMessage")}
      </ConfirmationModal>

      <PageHeader 
        title={i18n.t("role.title") as string}
        description="Gerencie as funções e permissões de acesso do sistema"
      >
        <div className="flex items-center gap-2">
          <div className="relative w-full max-w-sm hidden md:block">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder={i18n.t("role.searchPlaceholder") as string}
              value={searchParam}
              onChange={handleSearch}
              className="pl-9 h-10"
            />
          </div>
          <Button onClick={() => navigate("/roles/new")}>
            <Plus className="mr-2 h-4 w-4" />
            {i18n.t("role.buttons.add")}
          </Button>
        </div>
      </PageHeader>

      <PageContent>
        <div className="rounded-md border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{i18n.t("role.table.name")}</TableHead>
                <TableHead>{i18n.t("role.table.description")}</TableHead>
                <TableHead className="text-right w-[100px]">{i18n.t("role.table.actions")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {roles.map((role) => (
                <TableRow key={role.id}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Shield className="h-4 w-4 text-primary" />
                      <span className="font-semibold">{role.name}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className="text-muted-foreground">
                      {role.description || "Sem descrição"}
                    </span>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => handleEditRole(role.id)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive"
                        onClick={() => {
                          setSelectedRole(role);
                          setConfirmModalOpen(true);
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {loading && (
                <TableRow>
                  <TableCell colSpan={3} className="h-24 text-center">
                    <div className="flex items-center justify-center">
                      <Loader2 className="h-6 w-6 animate-spin text-primary" />
                    </div>
                  </TableCell>
                </TableRow>
              )}
              {!loading && roles.length === 0 && (
                <TableRow>
                  <TableCell colSpan={3} className="h-24 text-center text-muted-foreground">
                    Nenhuma função encontrada.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </PageContent>
    </PageContainer>
  );
};

export default Roles;
