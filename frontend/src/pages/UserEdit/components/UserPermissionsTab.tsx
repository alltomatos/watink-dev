import React, { useContext } from "react";

import { Button } from "../../../components/ui/button";
import { Checkbox } from "../../../components/ui/checkbox";
import { Can } from "../../../components/Can";
import { AuthContext } from "../../../context/Auth/AuthContext";
import { Permission, UserFormValues } from "../userEditTypes";

interface UserPermissionsTabProps {
  allPermissions: Permission[];
  selectedPermissions: string[];
  onTogglePermission: (id: string) => void;
  onSave: (values: UserFormValues) => Promise<void>;
  currentValues: UserFormValues;
}

const UserPermissionsTab: React.FC<UserPermissionsTabProps> = ({
  allPermissions,
  selectedPermissions,
  onTogglePermission,
  onSave,
  currentValues,
}) => {
  const { user: loggedInUser } = useContext(AuthContext);

  return (
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
              As permissões marcadas aqui são adicionadas diretamente a este
              usuário. Recomendamos usar Funções (Roles) sempre que possível.
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
                  onCheckedChange={() => onTogglePermission(permission.id)}
                />
                <span className="text-sm">
                  {permission.description || permission.name}
                </span>
              </label>
            ))}
          </div>
          <div className="mt-4">
            <Button onClick={() => onSave(currentValues)}>
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
  );
};

export default UserPermissionsTab;
