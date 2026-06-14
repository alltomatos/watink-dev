import React from "react";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { ChevronDown, Loader2, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { i18n } from "../../translate/i18n";
import { useQueues } from "../../../src/hooks/useQueues";

interface QueueSelectProps {
  selectedQueueIds: number[];
  onChange: (values: number[]) => void;
}

const QueueSelect: React.FC<QueueSelectProps> = ({
  selectedQueueIds = [],
  onChange,
}) => {
  const { data: queues = [], isLoading } = useQueues();

  const handleSelect = (queueId: number) => {
    const isSelected = selectedQueueIds.includes(queueId);
    const updatedIds = isSelected
      ? selectedQueueIds.filter((id) => id !== queueId)
      : [...selectedQueueIds, queueId];
    onChange(updatedIds);
  };

  const removeQueue = (e: React.MouseEvent, queueId: number) => {
    e.stopPropagation();
    onChange(selectedQueueIds.filter((id) => id !== queueId));
  };

  const selectedQueues = queues.filter((q) => selectedQueueIds.includes(q.id));

  return (
    <div className="mt-[6px] flex flex-col gap-2">
      <Label className="text-sm font-medium text-muted-foreground">
        {i18n.t("queueSelect.inputLabel")}
      </Label>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            className={cn(
              "w-full justify-between h-auto min-h-[40px] px-3 py-2 text-left font-normal",
              selectedQueueIds.length === 0 && "text-muted-foreground"
            )}
            disabled={isLoading}
          >
            <div className="flex flex-wrap gap-1 items-center">
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : selectedQueues.length > 0 ? (
                selectedQueues.map((queue) => (
                  <Badge
                    key={queue.id}
                    variant="outline"
                    className="flex items-center gap-1 pr-1 border-none text-white font-medium"
                    style={{ backgroundColor: queue.color || "#7c7c7c" }}
                  >
                    {queue.name}
                    <X
                      className="h-3 w-3 cursor-pointer hover:opacity-80"
                      onClick={(e) => removeQueue(e, queue.id)}
                    />
                  </Badge>
                ))
              ) : (
                <span>{i18n.t("queueSelect.inputLabel")}</span>
              )}
            </div>
            <ChevronDown className="h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-[var(--radix-dropdown-menu-trigger-width)]" align="start">
          {queues.map((queue) => (
            <DropdownMenuCheckboxItem
              key={queue.id}
              checked={selectedQueueIds.includes(queue.id)}
              onCheckedChange={() => handleSelect(queue.id)}
              onSelect={(e) => e.preventDefault()}
            >
              <div className="flex items-center gap-2">
                <div
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: queue.color }}
                />
                {queue.name}
              </div>
            </DropdownMenuCheckboxItem>
          ))}
          {queues.length === 0 && !isLoading && (
            <div className="p-2 text-sm text-muted-foreground text-center">
              Nenhuma fila encontrada
            </div>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
};

export default QueueSelect;
