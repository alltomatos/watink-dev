import React, { useEffect, useState } from "react";
import { Tags as TagsIcon, Plus } from "lucide-react";
import { toast } from "react-toastify";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import TagChip, { Tag } from "../../../components/TagChip";
import api from "../../../services/api";

interface TicketTagsSectionProps {
  ticketId: number;
}

const TicketTagsSection: React.FC<TicketTagsSectionProps> = ({ ticketId }) => {
  const [allTags, setAllTags] = useState<Tag[]>([]);
  const [ticketTags, setTicketTags] = useState<Tag[]>([]);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const queryClient = useQueryClient();

  useEffect(() => {
    api
      .get<Tag[]>(`/entities/ticket/${ticketId}/tags`)
      .then(({ data }) => setTicketTags(data))
      .catch(() => setTicketTags([]));
  }, [ticketId]);

  const openPopover = async (isOpen: boolean) => {
    setOpen(isOpen);
    if (isOpen && allTags.length === 0) {
      try {
        const { data } = await api.get<Tag[]>("/tags");
        setAllTags(data);
      } catch {
        setAllTags([]);
      }
    }
  };

  const syncTags = async (nextTags: Tag[]) => {
    setSaving(true);
    try {
      await api.put(`/entities/ticket/${ticketId}/tags/sync`, {
        tagIds: nextTags.map((t) => t.id),
      });
      setTicketTags(nextTags);
      queryClient.invalidateQueries({ queryKey: ["tickets"] });
    } catch {
      toast.error("Erro ao atualizar tags do ticket.");
    } finally {
      setSaving(false);
    }
  };

  const toggleTag = (tag: Tag) => {
    const has = ticketTags.some((t) => t.id === tag.id);
    const next = has
      ? ticketTags.filter((t) => t.id !== tag.id)
      : [...ticketTags, tag];
    syncTags(next);
  };

  const removeTag = (tag: Tag) => {
    syncTags(ticketTags.filter((t) => t.id !== tag.id));
  };

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide flex items-center gap-1">
          <TagsIcon className="w-3 h-3" />
          Tags
        </p>
        <Popover open={open} onOpenChange={openPopover}>
          <PopoverTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-5 w-5"
              title="Adicionar tag"
              disabled={saving}
            >
              <Plus className="w-3.5 h-3.5" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-52 p-1" align="end">
            {allTags.length === 0 && (
              <p className="px-2 py-1.5 text-xs text-muted-foreground">Nenhuma tag cadastrada</p>
            )}
            {allTags.map((tag) => (
              <label
                key={tag.id}
                className="flex items-center gap-2 rounded px-2 py-1.5 text-sm cursor-pointer hover:bg-accent"
              >
                <Checkbox
                  checked={ticketTags.some((t) => t.id === tag.id)}
                  onCheckedChange={() => toggleTag(tag)}
                  disabled={saving}
                />
                <span className="flex-1 truncate">{tag.name}</span>
              </label>
            ))}
          </PopoverContent>
        </Popover>
      </div>

      {ticketTags.length === 0 ? (
        <p className="text-xs text-muted-foreground">Nenhuma tag adicionada.</p>
      ) : (
        <div className="flex flex-wrap gap-1.5">
          {ticketTags.map((tag) => (
            <TagChip key={tag.id} tag={tag} size="small" onRemove={removeTag} />
          ))}
        </div>
      )}
    </div>
  );
};

export default TicketTagsSection;
