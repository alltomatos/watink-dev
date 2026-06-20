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
import type { Group } from "../userModalTypes";

interface GroupsDropdownProps {
  groups: Group[];
  selectedGroupIds: number[];
  onToggle: (groupId: number, checked: boolean) => void;
}

const GroupsDropdown: React.FC<GroupsDropdownProps> = ({
  groups,
  selectedGroupIds,
  onToggle,
}) => {
  const label = i18n.t("userModal.form.group");
  const selectedNames = groups
    .filter((g) => selectedGroupIds.includes(g.id))
    .map((g) => g.name)
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
          {groups.map((group) => (
            <DropdownMenuCheckboxItem
              key={group.id}
              checked={selectedGroupIds.includes(group.id)}
              onCheckedChange={(checked) => onToggle(group.id, checked)}
            >
              {group.name}
            </DropdownMenuCheckboxItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
};

export default GroupsDropdown;
