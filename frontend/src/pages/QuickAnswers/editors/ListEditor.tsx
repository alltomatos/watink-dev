import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { genId } from "../quickAnswersHelpers";
import type { QuickAnswerContentList } from "../quickAnswersTypes";

export const ListEditor = ({
  content,
  onChange,
  errors,
}: {
  content: QuickAnswerContentList;
  onChange: (c: QuickAnswerContentList) => void;
  errors: Record<string, string | undefined>;
}) => (
  <div className="space-y-4">
    <div className="space-y-1.5">
      <Label>Mensagem</Label>
      <Textarea
        rows={4}
        placeholder="Corpo da mensagem"
        value={content.body}
        onChange={(e) => onChange({ ...content, body: e.target.value })}
        className="resize-none"
        aria-invalid={!!errors.body}
      />
      {errors.body && <p className="text-xs text-destructive">{errors.body}</p>}
    </div>
    <div className="grid grid-cols-2 gap-3">
      <div className="space-y-1.5">
        <Label>Texto do botão lista</Label>
        <Input
          placeholder="Ver opções"
          value={content.button_text}
          onChange={(e) => onChange({ ...content, button_text: e.target.value })}
        />
      </div>
      <div className="space-y-1.5">
        <Label>Rodapé <span className="text-muted-foreground font-normal">(opcional)</span></Label>
        <Input
          placeholder="Rodapé"
          value={content.footer ?? ""}
          onChange={(e) => onChange({ ...content, footer: e.target.value })}
        />
      </div>
    </div>
    <div className="space-y-3">
      <Label>Seções</Label>
      {content.sections.map((section, si) => (
        <div key={si} className="rounded-lg border border-border p-3 space-y-2 bg-muted/30">
          <Input
            placeholder={`Título da seção ${si + 1}`}
            value={section.title}
            onChange={(e) => {
              const sections = content.sections.map((s, i) =>
                i === si ? { ...s, title: e.target.value } : s
              );
              onChange({ ...content, sections });
            }}
          />
          {section.rows.map((row, ri) => (
            <div key={row.id} className="flex gap-2 items-start pl-2">
              <div className="flex-1 space-y-1">
                <Input
                  placeholder="Título da opção"
                  value={row.title}
                  onChange={(e) => {
                    const sections = content.sections.map((s, i) => {
                      if (i !== si) return s;
                      const rows = s.rows.map((r, j) => j === ri ? { ...r, title: e.target.value } : r);
                      return { ...s, rows };
                    });
                    onChange({ ...content, sections });
                  }}
                />
                <Input
                  placeholder="Descrição (opcional)"
                  value={row.description ?? ""}
                  onChange={(e) => {
                    const sections = content.sections.map((s, i) => {
                      if (i !== si) return s;
                      const rows = s.rows.map((r, j) => j === ri ? { ...r, description: e.target.value } : r);
                      return { ...s, rows };
                    });
                    onChange({ ...content, sections });
                  }}
                />
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="shrink-0 mt-1 text-muted-foreground hover:text-destructive"
                onClick={() => {
                  const sections = content.sections.map((s, i) => {
                    if (i !== si) return s;
                    return { ...s, rows: s.rows.filter((_, j) => j !== ri) };
                  });
                  onChange({ ...content, sections });
                }}
                disabled={section.rows.length <= 1}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => {
              const sections = content.sections.map((s, i) => {
                if (i !== si) return s;
                return {
                  ...s,
                  rows: [...s.rows, { id: genId("row", si * 10 + s.rows.length), title: "", description: "" }],
                };
              });
              onChange({ ...content, sections });
            }}
          >
            <Plus className="h-4 w-4 mr-1" /> Linha
          </Button>
        </div>
      ))}
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() =>
          onChange({
            ...content,
            sections: [
              ...content.sections,
              { title: "", rows: [{ id: genId("row", content.sections.length * 10), title: "", description: "" }] },
            ],
          })
        }
      >
        <Plus className="h-4 w-4 mr-1" /> Seção
      </Button>
    </div>
  </div>
);
