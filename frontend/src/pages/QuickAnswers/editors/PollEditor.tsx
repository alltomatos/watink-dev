import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import type { QuickAnswerContentPoll } from "../quickAnswersTypes";

export const PollEditor = ({
  content,
  onChange,
  errors,
}: {
  content: QuickAnswerContentPoll;
  onChange: (c: QuickAnswerContentPoll) => void;
  errors: Record<string, string | undefined>;
}) => (
  <div className="space-y-4">
    <div className="space-y-1.5">
      <Label>Pergunta</Label>
      <Input
        placeholder="Qual é a sua pergunta?"
        value={content.question}
        onChange={(e) => onChange({ ...content, question: e.target.value })}
        aria-invalid={!!errors.question}
      />
      {errors.question && <p className="text-xs text-destructive">{errors.question}</p>}
    </div>
    <div className="space-y-2">
      <Label>Opções</Label>
      {content.options.map((opt, idx) => (
        <div key={idx} className="flex gap-2 items-center">
          <span className="text-xs text-muted-foreground w-5 shrink-0">{idx + 1}.</span>
          <Input
            placeholder={`Opção ${idx + 1}`}
            value={opt}
            onChange={(e) => {
              const options = content.options.map((o, i) => (i === idx ? e.target.value : o));
              onChange({ ...content, options });
            }}
          />
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="shrink-0 text-muted-foreground hover:text-destructive"
            onClick={() => onChange({ ...content, options: content.options.filter((_, i) => i !== idx) })}
            disabled={content.options.length <= 2}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      ))}
      {errors.options && <p className="text-xs text-destructive">{errors.options}</p>}
      {content.options.length < 10 && (
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => onChange({ ...content, options: [...content.options, ""] })}
        >
          <Plus className="h-4 w-4 mr-1" /> Opção
        </Button>
      )}
    </div>
    <div className="grid grid-cols-2 gap-3 items-end">
      <div className="space-y-1.5">
        <Label>Máx. seleções</Label>
        <Input
          type="number"
          min={1}
          max={content.options.length}
          value={content.max_selections}
          onChange={(e) => onChange({ ...content, max_selections: Number(e.target.value) })}
        />
      </div>
      <div className="flex items-center gap-2 pb-2">
        <Checkbox
          id="capture_results"
          checked={content.capture_results}
          onCheckedChange={(checked) => onChange({ ...content, capture_results: !!checked })}
        />
        <Label htmlFor="capture_results" className="cursor-pointer font-normal">
          Capturar resultados
        </Label>
      </div>
    </div>
  </div>
);
