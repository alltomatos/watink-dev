import React, { useState, useEffect } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { ChevronDown } from "lucide-react";
import api from "../../services/api";
import { i18n } from "../../translate/i18n";

interface Tag {
  id: number;
  name: string;
  color?: string;
}

interface TicketsTagFilterProps {
  selectedTags: number[];
  onChange: (ids: number[]) => void;
}

const TicketsTagFilter = ({ selectedTags = [], onChange }: TicketsTagFilterProps) => {
  const [tags, setTags] = useState<Tag[]>([]);

  useEffect(() => {
    api.get("/tags")
      .then(({ data }) => setTags(data))
      .catch(console.error);
  }, []);

  const toggle = (id: number) => {
    onChange(
      selectedTags.includes(id)
        ? selectedTags.filter((t) => t !== id)
        : [...selectedTags, id]
    );
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="h-8 w-[120px] justify-between text-xs font-normal ml-1.5"
        >
          {i18n.t("ticketsTagFilter.placeholder") || "Tags"}
          <ChevronDown className="ml-1 h-3 w-3 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-52 p-1" align="start">
        {tags.length === 0 && (
          <p className="px-2 py-1.5 text-xs text-muted-foreground">Nenhuma tag</p>
        )}
        {tags.map((tag) => (
          <label
            key={tag.id}
            className="flex items-center gap-2 rounded px-2 py-1.5 text-sm cursor-pointer hover:bg-accent"
          >
            <Checkbox
              checked={selectedTags.includes(tag.id)}
              onCheckedChange={() => toggle(tag.id)}
            />
            {tag.color && (
              <span
                className="h-2.5 w-2.5 rounded-full shrink-0"
                style={{ backgroundColor: tag.color }}
              />
            )}
            <span className="flex-1 truncate">{tag.name}</span>
          </label>
        ))}
      </PopoverContent>
    </Popover>
  );
};

export default TicketsTagFilter;
