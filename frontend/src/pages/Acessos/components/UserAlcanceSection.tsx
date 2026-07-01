import React from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { ALCANCE_OPTIONS, type Alcance } from "../acessosTypes";

interface UserAlcanceSectionProps {
  alcance: Alcance | string;
  onChange: (alcance: string) => void;
}

const UserAlcanceSection: React.FC<UserAlcanceSectionProps> = ({ alcance, onChange }) => {
  const current = ALCANCE_OPTIONS.find((o) => o.value === alcance);

  return (
    <div className="space-y-1.5">
      <Label>Alcance</Label>
      <Select value={alcance || "proprio"} onValueChange={onChange}>
        <SelectTrigger>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {ALCANCE_OPTIONS.map((opt) => (
            <SelectItem key={opt.value} value={opt.value}>
              {opt.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {current && <p className="text-xs text-muted-foreground">{current.description}</p>}
    </div>
  );
};

export default UserAlcanceSection;
