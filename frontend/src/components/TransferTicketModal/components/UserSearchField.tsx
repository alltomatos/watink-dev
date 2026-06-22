import React from "react";
import { Loader2 } from "lucide-react";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import { i18n } from "../../../translate/i18n";
import type { UserOption } from "../transferTicketModalTypes";

interface UserSearchFieldProps {
  searchParam: string;
  loading: boolean;
  options: UserOption[];
  selectedUser: UserOption | null;
  onSearchChange: (value: string) => void;
  onSelectUser: (opt: UserOption) => void;
}

export function UserSearchField({
  searchParam,
  loading,
  options,
  selectedUser,
  onSearchChange,
  onSelectUser,
}: UserSearchFieldProps) {
  return (
    <div className="space-y-1">
      <Label>{i18n.t("transferTicketModal.fieldLabel")}</Label>
      <div className="relative">
        <Input
          autoFocus
          placeholder="Buscar usuário..."
          value={searchParam}
          onChange={(e) => onSearchChange(e.target.value)}
          className="w-full"
          required
        />
        {loading && (
          <Loader2 className="absolute right-3 top-3 h-4 w-4 animate-spin text-muted-foreground" />
        )}
      </div>

      {options.length > 0 && !selectedUser && (
        <div className="absolute z-50 w-full max-w-[calc(100%-3rem)] mt-1 max-h-48 overflow-auto rounded-md border bg-popover text-popover-foreground shadow-md">
          {options.map((opt) => (
            <div
              key={opt.id}
              className="px-3 py-2 text-sm cursor-pointer hover:bg-accent"
              onClick={() => onSelectUser(opt)}
            >
              {opt.name}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
