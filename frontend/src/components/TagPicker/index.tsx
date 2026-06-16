import React, { useState, useEffect, useRef } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import { Loader2, Plus, Search, Tag as TagIcon } from "lucide-react";
import api from "../../services/api";
import TagChip from "../TagChip";
import { TAG_COLOR_OPTIONS } from "../../helpers/tagColors";
import { i18n } from "../../translate/i18n";
import { cn } from "@/lib/utils";

interface TagPickerProps {
  selectedTags?: number[];
  onChange?: (ids: number[]) => void;
  entityType?: string;
  entityId?: number;
  readOnly?: boolean;
  placeholder?: string;
}

const TagPicker = ({
  selectedTags = [],
  onChange,
  entityType,
  entityId,
  readOnly = false,
  placeholder,
}: TagPickerProps) => {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [tags, setTags] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedIds, setSelectedIds] = useState<number[]>(selectedTags);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { setSelectedIds(selectedTags); }, [selectedTags]);

  const fetchTags = async () => {
    setLoading(true);
    try {
      const { data } = await api.get("/tags");
      setTags(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchTags(); }, []);
  useEffect(() => { if (open) { fetchTags(); setTimeout(() => inputRef.current?.focus(), 100); } }, [open]);

  const handleToggle = async (tagId: number) => {
    const newIds = selectedIds.includes(tagId)
      ? selectedIds.filter((id) => id !== tagId)
      : [...selectedIds, tagId];

    setSelectedIds(newIds);
    if (onChange) onChange(newIds);

    if (entityType && entityId) {
      try {
        await api.put(`/entities/${entityType}/${entityId}/tags/sync`, { tagIds: newIds });
      } catch (err) {
        console.error("Erro ao sincronizar tags:", err);
      }
    }
  };

  const handleCreate = async () => {
    if (!search.trim()) return;
    try {
      const { data } = await api.post("/tags", {
        name: search.trim(),
        color: TAG_COLOR_OPTIONS[Math.floor(Math.random() * TAG_COLOR_OPTIONS.length)],
      });
      setTags([...tags, data]);
      setSelectedIds([...selectedIds, data.id]);
      setSearch("");
      if (onChange) onChange([...selectedIds, data.id]);
    } catch (err) {
      console.error("Erro ao criar tag:", err);
    }
  };

  const filteredTags = tags.filter((t) => t.name.toLowerCase().includes(search.toLowerCase()));
  const exactMatch = tags.some((t) => t.name.toLowerCase() === search.toLowerCase().trim());
  const selectedTagObjects = tags.filter((t) => selectedIds.includes(t.id));

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {selectedTagObjects.map((tag) => (
        <TagChip
          key={tag.id}
          tag={tag}
          size="small"
          onRemove={readOnly ? undefined : () => handleToggle(tag.id)}
        />
      ))}

      {!readOnly && (
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <div className="flex items-center gap-1 px-2 py-1 rounded border border-dashed border-border text-muted-foreground text-xs cursor-pointer hover:border-primary hover:text-primary transition-colors">
              <TagIcon className="h-3.5 w-3.5" />
              <span>{placeholder || i18n.t("tags.addTag") || "Adicionar tag"}</span>
            </div>
          </PopoverTrigger>
          <PopoverContent className="w-64 p-0" align="start">
            <div className="p-2 border-b relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                ref={inputRef}
                className="pl-8 h-8 text-sm"
                placeholder={i18n.t("tags.searchOrCreate") || "Buscar ou criar..."}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && search && !exactMatch) {
                    e.preventDefault();
                    handleCreate();
                  }
                }}
              />
            </div>

            <div className="max-h-60 overflow-y-auto p-1">
              {loading ? (
                <div className="flex justify-center p-4"><Loader2 className="h-4 w-4 animate-spin text-muted-foreground" /></div>
              ) : (
                <>
                  {filteredTags.length === 0 && !search && (
                    <p className="p-3 text-center text-xs text-muted-foreground">Nenhuma tag encontrada</p>
                  )}
                  {filteredTags.map((tag) => (
                    <label
                      key={tag.id}
                      className={cn(
                        "flex items-center gap-2 px-2 py-1.5 rounded-sm text-sm cursor-pointer hover:bg-accent",
                        selectedIds.includes(tag.id) && "bg-accent/50 font-medium"
                      )}
                    >
                      <Checkbox
                        checked={selectedIds.includes(tag.id)}
                        onCheckedChange={() => handleToggle(tag.id)}
                      />
                      {tag.color && (
                        <div className="h-2.5 w-2.5 rounded-full shrink-0" style={{ backgroundColor: tag.color }} />
                      )}
                      <span className="flex-1 truncate">{tag.name}</span>
                    </label>
                  ))}

                  {search && !exactMatch && (
                    <>
                      {filteredTags.length > 0 && <div className="h-px bg-border my-1 mx-2" />}
                      <div
                        className="flex items-center gap-2 px-2 py-1.5 rounded-sm text-sm cursor-pointer hover:bg-accent text-primary"
                        onClick={handleCreate}
                      >
                        <Plus className="h-4 w-4" />
                        <span>Criar "{search}"</span>
                      </div>
                    </>
                  )}
                </>
              )}
            </div>
          </PopoverContent>
        </Popover>
      )}
    </div>
  );
};

export default TagPicker;
