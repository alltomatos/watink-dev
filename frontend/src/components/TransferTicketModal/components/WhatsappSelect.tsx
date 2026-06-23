import React from "react";

import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import { i18n } from "../../../translate/i18n";

interface WhatsApp {
  id: number | string;
  name: string;
}

interface WhatsappSelectProps {
  whatsApps: WhatsApp[];
  selectedWhatsapp: string;
  onValueChange: (value: string) => void;
}

export function WhatsappSelect({
  whatsApps,
  selectedWhatsapp,
  onValueChange,
}: WhatsappSelectProps) {
  return (
    <div className="space-y-1">
      <Label>{i18n.t("transferTicketModal.fieldConnectionLabel")}</Label>
      <Select value={selectedWhatsapp} onValueChange={onValueChange}>
        <SelectTrigger>
          <SelectValue
            placeholder={i18n.t(
              "transferTicketModal.fieldConnectionPlaceholder"
            )}
          />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="none">Selecione uma conexão</SelectItem>
          {whatsApps.map((wa) => (
            <SelectItem key={wa.id} value={String(wa.id)}>
              {wa.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
