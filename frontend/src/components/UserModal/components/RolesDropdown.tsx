import React from "react";
import { ChevronDown } from "lucide-react";

import { i18n } from "../../../translate/i18n";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { Role } from "../userModalTypes";

interface RolesDropdownProps {
  roles: Role[];
  selectedRoleIds: number[];
  onToggle: (roleId: number, checked: boolean) => void;
}

const RolesDropdown: React.FC<RolesDropdownProps> = ({
  roles,
  selectedRoleIds,
  onToggle,
}) => {
  const label = i18n.t("userModal.form.role");
  const selectedNames = roles
    .filter((r) => selectedRoleIds.includes(r.id))
    .map((r) => r.name)
    .join(", ");

  return (
    <div className="flex flex-col gap-2">
      <Label>{label}</Label>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" className="w-full justify-between font-normal">
            <span className="truncate">{selectedNames || label}</span>
            <ChevronDown className="h-4 w-4 opacity-50" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-[var(--radix-dropdown-menu-trigger-width)]">
          {roles.map((role) => (
            <DropdownMenuCheckboxItem
              key={role.id}
              checked={selectedRoleIds.includes(role.id)}
              onCheckedChange={(checked) => onToggle(role.id, checked)}
            >
              {role.name}
            </DropdownMenuCheckboxItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
};

export default RolesDropdown;
