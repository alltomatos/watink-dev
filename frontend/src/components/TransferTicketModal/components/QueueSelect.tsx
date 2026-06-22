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
import type { QueueOption } from "../transferTicketModalTypes";

interface QueueSelectProps {
  queues: QueueOption[];
  selectedQueue: string;
  onValueChange: (value: string) => void;
}

export function QueueSelect({
  queues,
  selectedQueue,
  onValueChange,
}: QueueSelectProps) {
  return (
    <div className="space-y-1">
      <Label>{i18n.t("transferTicketModal.fieldQueueLabel")}</Label>
      <Select value={selectedQueue} onValueChange={onValueChange}>
        <SelectTrigger>
          <SelectValue
            placeholder={i18n.t("transferTicketModal.fieldQueuePlaceholder")}
          />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="none">Nenhuma fila</SelectItem>
          {queues.map((queue) => (
            <SelectItem key={queue.id} value={String(queue.id)}>
              {queue.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
