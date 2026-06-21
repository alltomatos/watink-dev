import React from "react";
import { Camera } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { TabsContent } from "@/components/ui/tabs";
import { ChecklistItem } from "../activityTypes";

interface ChecklistTabProps {
  items: ChecklistItem[];
  onItemChange: (item: ChecklistItem, field: string, value: unknown) => void;
  onFileUpload: (item: ChecklistItem, file: File) => void;
}

const ChecklistTab: React.FC<ChecklistTabProps> = ({ items, onItemChange, onFileUpload }) => (
  <TabsContent value="checklist" className="space-y-3">
    {items.length === 0 ? (
      <p className="text-center text-muted-foreground py-8">Nenhum item no checklist.</p>
    ) : (
      items.map((item) => (
        <div key={item.id} className="space-y-2 rounded-lg border border-border p-4">
          <div className="flex items-center justify-between gap-3">
            <span className={`text-sm font-medium ${item.isRequired ? "font-semibold" : ""}`}>
              {item.label}
              {item.isRequired && <span className="ml-1 text-destructive">*</span>}
            </span>
            <Checkbox
              checked={item.isDone}
              onCheckedChange={(v) => onItemChange(item, "isDone", v)}
            />
          </div>

          {item.inputType === "text" && (
            <Input
              value={item.value ?? ""}
              onChange={(e) => onItemChange(item, "value", e.target.value)}
              placeholder="Digite a resposta..."
            />
          )}

          {item.inputType === "number" && (
            <Input
              type="number"
              value={item.value ?? ""}
              onChange={(e) => onItemChange(item, "value", e.target.value)}
              placeholder="0"
            />
          )}

          {item.inputType === "photo" && (
            <div className="space-y-2">
              <label className="inline-flex cursor-pointer items-center gap-2 rounded-md border border-border px-3 py-1.5 text-sm hover:bg-muted transition-colors">
                <Camera className="h-4 w-4" />
                Tirar Foto
                <input
                  type="file"
                  accept="image/*"
                  capture="environment"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) onFileUpload(item, file);
                  }}
                />
              </label>
              {item.value && (
                <img src={item.value} alt="Preview" className="h-24 w-24 rounded-md border object-cover" />
              )}
            </div>
          )}
        </div>
      ))
    )}
  </TabsContent>
);

export default ChecklistTab;
