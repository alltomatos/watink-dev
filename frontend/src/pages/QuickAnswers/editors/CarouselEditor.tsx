import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { genId, CAROUSEL_BUTTON_TYPES } from "../quickAnswersHelpers";
import type {
  QuickAnswerContentCarousel,
  QuickAnswerCarouselButtonType,
} from "../quickAnswersTypes";

export const CarouselEditor = ({
  content,
  onChange,
  errors,
}: {
  content: QuickAnswerContentCarousel;
  onChange: (c: QuickAnswerContentCarousel) => void;
  errors: Record<string, string | undefined>;
}) => {
  const valuePlaceholder = (t?: QuickAnswerCarouselButtonType): string => {
    if (t === "url") return "https://...";
    if (t === "call") return "+5585999990000";
    if (t === "copy") return "Texto a copiar";
    return "ID da resposta (opcional)";
  };
  const setCard = (ci: number, patch: Partial<QuickAnswerContentCarousel["cards"][number]>) => {
    onChange({ ...content, cards: content.cards.map((c, i) => (i === ci ? { ...c, ...patch } : c)) });
  };
  return (
    <div className="space-y-4">
      <div className="space-y-1.5">
        <Label>Mensagem <span className="text-muted-foreground font-normal">(opcional, acima dos cards)</span></Label>
        <Textarea
          rows={2}
          placeholder="Texto introdutório do carousel"
          value={content.body}
          onChange={(e) => onChange({ ...content, body: e.target.value })}
          className="resize-none"
        />
      </div>
      {errors.cards && <p className="text-xs text-destructive">{errors.cards}</p>}
      <div className="space-y-3">
        <Label>Cards</Label>
        {content.cards.map((card, ci) => (
          <div key={ci} className="rounded-lg border border-border p-3 space-y-2 bg-muted/30">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-muted-foreground">Card {ci + 1}</span>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-muted-foreground hover:text-destructive"
                onClick={() => onChange({ ...content, cards: content.cards.filter((_, i) => i !== ci) })}
                disabled={content.cards.length <= 1}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
            <Input
              placeholder="URL da imagem (https://...)"
              value={card.image}
              onChange={(e) => setCard(ci, { image: e.target.value })}
            />
            <Textarea
              rows={2}
              placeholder="Texto do card"
              value={card.title}
              onChange={(e) => setCard(ci, { title: e.target.value })}
              className="resize-none"
            />
            <div className="space-y-2">
              <span className="text-xs text-muted-foreground">Botões</span>
              {card.buttons.map((btn, bi) => (
                <div key={btn.id} className="space-y-1.5 rounded-md border border-border/60 p-2">
                  <div className="flex gap-2 items-center">
                    <Select
                      value={btn.type ?? "quickreply"}
                      onValueChange={(v) => {
                        const buttons = card.buttons.map((b, j) =>
                          j === bi ? { ...b, type: v as QuickAnswerCarouselButtonType } : b
                        );
                        setCard(ci, { buttons });
                      }}
                    >
                      <SelectTrigger className="w-28 shrink-0"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {CAROUSEL_BUTTON_TYPES.map((t) => (
                          <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Input
                      placeholder={`Rótulo do botão ${bi + 1}`}
                      value={btn.label}
                      onChange={(e) => {
                        const buttons = card.buttons.map((b, j) => (j === bi ? { ...b, label: e.target.value } : b));
                        setCard(ci, { buttons });
                      }}
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="shrink-0 text-muted-foreground hover:text-destructive"
                      onClick={() => setCard(ci, { buttons: card.buttons.filter((_, j) => j !== bi) })}
                      disabled={card.buttons.length <= 1}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                  {btn.type && btn.type !== "quickreply" && (
                    <Input
                      placeholder={valuePlaceholder(btn.type)}
                      value={btn.type === "url" ? btn.url ?? "" : btn.type === "call" ? btn.phoneNumber ?? "" : btn.copyCode ?? ""}
                      onChange={(e) => {
                        const v = e.target.value;
                        const buttons = card.buttons.map((b, j) => {
                          if (j !== bi) return b;
                          if (b.type === "url") return { ...b, url: v };
                          if (b.type === "call") return { ...b, phoneNumber: v };
                          return { ...b, copyCode: v };
                        });
                        setCard(ci, { buttons });
                      }}
                    />
                  )}
                </div>
              ))}
              {card.buttons.length < 3 && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    setCard(ci, {
                      buttons: [...card.buttons, { id: genId("cbtn", ci * 10 + card.buttons.length), label: "", type: "quickreply" }],
                    })
                  }
                >
                  <Plus className="h-4 w-4 mr-1" /> Botão
                </Button>
              )}
            </div>
          </div>
        ))}
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() =>
            onChange({
              ...content,
              cards: [
                ...content.cards,
                { image: "", title: "", footer: "", buttons: [{ id: genId("cbtn", content.cards.length * 10), label: "", type: "quickreply" }] },
              ],
            })
          }
        >
          <Plus className="h-4 w-4 mr-1" /> Adicionar card
        </Button>
      </div>
    </div>
  );
};
