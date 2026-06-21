import React from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { ChevronDown } from "lucide-react";
import { i18n } from "../../translate/i18n";

export interface Queue {
  id: number;
  name: string;
  color?: string;
}

interface TicketsQueueSelectProps {
  userQueues: Queue[];
  selectedQueueIds: number[];
  onChange: (ids: number[]) => void;
}

const TicketsQueueSelect = ({ userQueues = [], selectedQueueIds = [], onChange }: TicketsQueueSelectProps) => {
  const toggle = (id: number) => {
    onChange(
      selectedQueueIds.includes(id)
        ? selectedQueueIds.filter((q) => q !== id)
        : [...selectedQueueIds, id]
    );
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="h-8 w-[90px] justify-between text-xs font-normal"
        >
          {i18n.t("ticketsQueueSelect.placeholder")}
          <ChevronDown className="ml-1 h-3 w-3 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-52 p-1" align="start">
        {userQueues.length === 0 && (
          <p className="px-2 py-1.5 text-xs text-muted-foreground">Nenhuma fila</p>
        )}
        {userQueues.map((queue) => (
          <label
            key={queue.id}
            className="flex items-center gap-2 rounded px-2 py-1.5 text-sm cursor-pointer hover:bg-accent"
          >
            <Checkbox
              checked={selectedQueueIds.includes(queue.id)}
              onCheckedChange={() => toggle(queue.id)}
              style={{ accentColor: queue.color }}
            />
            <span className="flex-1 truncate">{queue.name}</span>
            {queue.color && (
              <span
                className="h-2.5 w-2.5 rounded-full shrink-0"
                style={{ backgroundColor: queue.color }}
              />
            )}
          </label>
        ))}
      </PopoverContent>
    </Popover>
  );
};

export default TicketsQueueSelect;
