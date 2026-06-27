import React, { useState, useEffect, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { toast } from "react-toastify";
import { ArrowLeft, Loader2, Plus, Trash2, Smartphone, Bold, Italic, Strikethrough, Code } from "lucide-react";
import { PageLayout, PageHeader, PageContent } from "@/components/ui/page-layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import api from "../../services/api";
import toastError from "../../errors/toastError";
import WhatsAppBubblePreview from "../../components/WhatsAppBubblePreview";
import type {
  QuickAnswerType,
  QuickAnswerContent,
  QuickAnswerContentButtons,
  QuickAnswerContentList,
  QuickAnswerContentMedia,
  QuickAnswerContentPoll,
  QuickAnswerContentCarousel,
  QuickAnswerCarouselButtonType,
  QuickAnswerContentPix,
  PixKeyType,
} from "./quickAnswersTypes";

// ─── helpers ────────────────────────────────────────────────────────────────

function genId(prefix: string, index: number): string {
  return `${prefix}_${Date.now()}_${index}`;
}

// Formatação WhatsApp: envolve a seleção do textarea com os marcadores.
const WA_FORMATS = [
  { icon: Bold, label: "Negrito", marker: "*" },
  { icon: Italic, label: "Itálico", marker: "_" },
  { icon: Strikethrough, label: "Tachado", marker: "~" },
  { icon: Code, label: "Monoespaçado", marker: "```" },
];

function wrapSelection(
  ref: React.RefObject<HTMLTextAreaElement | null>,
  value: string,
  onChange: (v: string) => void,
  marker: string
): void {
  const ta = ref.current;
  if (!ta) {
    onChange(`${value}${marker}texto${marker}`);
    return;
  }
  const start = ta.selectionStart ?? value.length;
  const end = ta.selectionEnd ?? value.length;
  const selected = value.slice(start, end) || "texto";
  const next = `${value.slice(0, start)}${marker}${selected}${marker}${value.slice(end)}`;
  onChange(next);
  requestAnimationFrame(() => {
    ta.focus();
    const selStart = start + marker.length;
    ta.setSelectionRange(selStart, selStart + selected.length);
  });
}

const FormatToolbar = ({ onApply }: { onApply: (marker: string) => void }) => (
  <div className="flex items-center gap-0.5">
    {WA_FORMATS.map((f) => (
      <button
        key={f.marker}
        type="button"
        title={f.label}
        aria-label={f.label}
        onMouseDown={(e) => {
          e.preventDefault();
          onApply(f.marker);
        }}
        className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
      >
        <f.icon className="h-4 w-4" />
      </button>
    ))}
  </div>
);

const PIX_KEY_TYPES: { value: PixKeyType; label: string }[] = [
  { value: "EVP", label: "Aleatória (EVP)" },
  { value: "CPF", label: "CPF" },
  { value: "CNPJ", label: "CNPJ" },
  { value: "PHONE", label: "Telefone" },
  { value: "EMAIL", label: "E-mail" },
];

const defaultPix = (): QuickAnswerContentPix => ({
  body: "",
  pixKey: "",
  pixType: "EVP",
  pixName: "",
});

const defaultButtons = (): QuickAnswerContentButtons => ({
  body: "",
  footer: "",
  buttons: [{ id: genId("btn", 0), label: "" }],
});

const defaultList = (): QuickAnswerContentList => ({
  body: "",
  button_text: "",
  footer: "",
  sections: [
    { title: "", rows: [{ id: genId("row", 0), title: "", description: "" }] },
  ],
});

const defaultMedia = (): QuickAnswerContentMedia => ({
  media_type: "image",
  url: "",
  caption: "",
});

const defaultPoll = (): QuickAnswerContentPoll => ({
  question: "",
  options: ["", ""],
  max_selections: 1,
  capture_results: false,
  on_answer: null,
});

const defaultCarousel = (): QuickAnswerContentCarousel => ({
  body: "",
  cards: [
    {
      image: "",
      title: "",
      footer: "",
      buttons: [{ id: genId("cbtn", 0), label: "", type: "quickreply" }],
    },
  ],
});

// ─── type config ─────────────────────────────────────────────────────────────

const TYPE_OPTIONS: { value: QuickAnswerType; label: string; description: string }[] = [
  { value: "text", label: "Texto", description: "Mensagem de texto simples com formatação" },
  { value: "interactive_buttons", label: "Botões interativos", description: "Mensagem com até 3 botões clicáveis" },
  { value: "list", label: "Lista", description: "Menu de opções em seções" },
  { value: "media", label: "Mídia", description: "Imagem, vídeo, áudio ou documento" },
  { value: "poll", label: "Enquete", description: "Votação com múltiplas opções" },
  { value: "carousel", label: "Carousel", description: "Cards com imagem, texto e botões" },
  { value: "pix", label: "PIX", description: "Botão de pagamento com chave PIX" },
];

const CAROUSEL_BUTTON_TYPES: { value: QuickAnswerCarouselButtonType; label: string }[] = [
  { value: "quickreply", label: "Resposta" },
  { value: "url", label: "Link" },
  { value: "call", label: "Ligar" },
  { value: "copy", label: "Copiar" },
];

// ─── sub-editors ─────────────────────────────────────────────────────────────

const SectionTitle = ({ children }: { children: React.ReactNode }) => (
  <h3 className="text-sm font-semibold text-foreground/70 uppercase tracking-wider mb-3">{children}</h3>
);

const TextEditor = ({
  body,
  onChange,
  error,
}: {
  body: string;
  onChange: (v: string) => void;
  error?: string;
}) => {
  const ref = useRef<HTMLTextAreaElement>(null);
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <Label>Mensagem</Label>
        <FormatToolbar onApply={(m) => wrapSelection(ref, body, onChange, m)} />
      </div>
      <Textarea
        ref={ref}
        rows={6}
        placeholder={"Escreva sua mensagem… selecione um trecho e use os botões de formatação.\nVariáveis: {{contact_name}}, {{ticket_id}}"}
        value={body}
        onChange={(e) => onChange(e.target.value)}
        aria-invalid={!!error}
        className="resize-none font-sans"
      />
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
};

const ButtonsEditor = ({
  content,
  onChange,
  errors,
}: {
  content: QuickAnswerContentButtons;
  onChange: (c: QuickAnswerContentButtons) => void;
  errors: Record<string, string | undefined>;
}) => (
  <div className="space-y-4">
    <div className="space-y-1.5">
      <Label>Mensagem</Label>
      <Textarea
        rows={4}
        placeholder="Use *negrito*, _itálico_, ~tachado~"
        value={content.body}
        onChange={(e) => onChange({ ...content, body: e.target.value })}
        className="resize-none"
        aria-invalid={!!errors.body}
      />
      {errors.body && <p className="text-xs text-destructive">{errors.body}</p>}
    </div>
    <div className="space-y-1.5">
      <Label>Rodapé <span className="text-muted-foreground font-normal">(opcional)</span></Label>
      <Input
        placeholder="Texto do rodapé"
        value={content.footer ?? ""}
        onChange={(e) => onChange({ ...content, footer: e.target.value })}
      />
    </div>
    <div className="space-y-2">
      <Label>Botões</Label>
      {content.buttons.map((btn, idx) => (
        <div key={btn.id} className="flex gap-2 items-center">
          <span className="text-xs text-muted-foreground w-5 shrink-0">{idx + 1}.</span>
          <Input
            placeholder={`Rótulo do botão ${idx + 1}`}
            value={btn.label}
            onChange={(e) => {
              const buttons = content.buttons.map((b, i) =>
                i === idx ? { ...b, label: e.target.value } : b
              );
              onChange({ ...content, buttons });
            }}
          />
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="shrink-0 text-muted-foreground hover:text-destructive"
            onClick={() => onChange({ ...content, buttons: content.buttons.filter((_, i) => i !== idx) })}
            disabled={content.buttons.length <= 1}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      ))}
      {errors.buttons && <p className="text-xs text-destructive">{errors.buttons}</p>}
      {content.buttons.length < 3 && (
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() =>
            onChange({
              ...content,
              buttons: [...content.buttons, { id: genId("btn", content.buttons.length), label: "" }],
            })
          }
        >
          <Plus className="h-4 w-4 mr-1" /> Adicionar botão
        </Button>
      )}
    </div>
  </div>
);

const ListEditor = ({
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

const MediaEditor = ({
  content,
  onChange,
  errors,
}: {
  content: QuickAnswerContentMedia;
  onChange: (c: QuickAnswerContentMedia) => void;
  errors: Record<string, string | undefined>;
}) => (
  <div className="space-y-4">
    <div className="space-y-1.5">
      <Label>Tipo de mídia</Label>
      <Select
        value={content.media_type}
        onValueChange={(v) => onChange({ ...content, media_type: v as QuickAnswerContentMedia["media_type"] })}
      >
        <SelectTrigger><SelectValue /></SelectTrigger>
        <SelectContent>
          <SelectItem value="image">Imagem</SelectItem>
          <SelectItem value="video">Vídeo</SelectItem>
          <SelectItem value="audio">Áudio</SelectItem>
          <SelectItem value="document">Documento</SelectItem>
        </SelectContent>
      </Select>
    </div>
    <div className="space-y-1.5">
      <Label>URL</Label>
      <Input
        placeholder="https://..."
        value={content.url}
        onChange={(e) => onChange({ ...content, url: e.target.value })}
        aria-invalid={!!errors.url}
      />
      {errors.url && <p className="text-xs text-destructive">{errors.url}</p>}
    </div>
    <div className="space-y-1.5">
      <Label>Legenda <span className="text-muted-foreground font-normal">(opcional)</span></Label>
      <Textarea
        rows={3}
        placeholder="Descrição do arquivo"
        value={content.caption ?? ""}
        onChange={(e) => onChange({ ...content, caption: e.target.value })}
        className="resize-none"
      />
    </div>
  </div>
);

const PollEditor = ({
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

const CarouselEditor = ({
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

const PixEditor = ({
  content,
  onChange,
  errors,
}: {
  content: QuickAnswerContentPix;
  onChange: (c: QuickAnswerContentPix) => void;
  errors: Record<string, string | undefined>;
}) => (
  <div className="space-y-4">
    <div className="space-y-1.5">
      <Label>Mensagem <span className="text-muted-foreground font-normal">(opcional, acima do botão)</span></Label>
      <Textarea
        rows={2}
        placeholder="Ex.: Finalize seu pedido pagando via PIX 👇"
        value={content.body ?? ""}
        onChange={(e) => onChange({ ...content, body: e.target.value })}
        className="resize-none"
      />
    </div>
    <div className="grid grid-cols-2 gap-3">
      <div className="space-y-1.5">
        <Label>Tipo da chave</Label>
        <Select
          value={content.pixType}
          onValueChange={(v) => onChange({ ...content, pixType: v as PixKeyType })}
        >
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            {PIX_KEY_TYPES.map((t) => (
              <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-1.5">
        <Label>Nome do recebedor <span className="text-muted-foreground font-normal">(opcional)</span></Label>
        <Input
          placeholder="Loja Exemplo"
          value={content.pixName ?? ""}
          onChange={(e) => onChange({ ...content, pixName: e.target.value })}
        />
      </div>
    </div>
    <div className="space-y-1.5">
      <Label>Chave PIX</Label>
      <Input
        placeholder="CPF/CNPJ, telefone, e-mail ou chave aleatória"
        value={content.pixKey}
        onChange={(e) => onChange({ ...content, pixKey: e.target.value })}
        aria-invalid={!!errors.pixKey}
      />
      {errors.pixKey && <p className="text-xs text-destructive">{errors.pixKey}</p>}
    </div>
  </div>
);

// ─── Phone mockup wrapper ────────────────────────────────────────────────────

function PhoneMockup({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-3">
      <div className="flex items-center gap-2 text-muted-foreground">
        <Smartphone className="h-4 w-4" />
        <span className="text-xs font-medium uppercase tracking-wider">Preview</span>
      </div>
      <div
        className="relative w-[280px] rounded-[2.5rem] border-[6px] border-foreground/10 bg-[#111] shadow-2xl overflow-hidden"
        style={{ minHeight: 480 }}
      >
        {/* status bar */}
        <div className="bg-[#075E54] px-4 pt-3 pb-2 flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center text-white text-xs font-bold">
            W
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-white text-sm font-semibold leading-tight">Watink</p>
            <p className="text-white/70 text-[10px]">online</p>
          </div>
        </div>
        {/* chat area */}
        <div
          className="p-3 flex flex-col justify-end min-h-[380px]"
          style={{
            backgroundImage: "url(\"data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23000000' fill-opacity='0.03'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E\")",
            backgroundColor: "hsl(var(--whatsapp-chat-bg, 37 28% 88%))",
          }}
        >
          {children}
        </div>
        {/* input bar */}
        <div className="bg-[#f0f0f0] px-2 py-2 flex items-center gap-1 border-t border-gray-200">
          <div className="flex-1 bg-white rounded-full px-3 py-1 text-xs text-gray-400">
            Mensagem
          </div>
          <div className="w-7 h-7 rounded-full bg-[#075E54] flex items-center justify-center">
            <svg className="w-3.5 h-3.5 text-white fill-current" viewBox="0 0 24 24">
              <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
            </svg>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── validation ───────────────────────────────────────────────────────────────

interface FormErrors {
  shortcut?: string;
  body?: string;
  question?: string;
  url?: string;
  buttons?: string;
  options?: string;
  [key: string]: string | undefined;
}

function validate(
  shortcut: string,
  type: QuickAnswerType,
  textBody: string,
  buttons: QuickAnswerContentButtons,
  list: QuickAnswerContentList,
  media: QuickAnswerContentMedia,
  poll: QuickAnswerContentPoll,
  carousel: QuickAnswerContentCarousel,
  pix: QuickAnswerContentPix
): FormErrors {
  const errors: FormErrors = {};
  if (!shortcut || shortcut.length < 2) errors.shortcut = "Atalho deve ter ao menos 2 caracteres";
  if (type === "text" && !textBody.trim()) errors.body = "Mensagem obrigatória";
  if (type === "interactive_buttons") {
    if (!buttons.body.trim()) errors.body = "Mensagem obrigatória";
    if (buttons.buttons.length < 1) errors.buttons = "Adicione ao menos 1 botão";
  }
  if (type === "list" && !list.body.trim()) errors.body = "Mensagem obrigatória";
  if (type === "media" && !media.url.trim()) errors.url = "URL obrigatória";
  if (type === "poll") {
    if (!poll.question.trim()) errors.question = "Pergunta obrigatória";
    if (poll.options.length < 2) errors.options = "Adicione ao menos 2 opções";
  }
  if (type === "carousel") {
    if (carousel.cards.length < 1) errors.cards = "Adicione ao menos 1 card";
    else if (carousel.cards.some((c) => !c.image.trim()))
      errors.cards = "Cada card precisa de uma imagem";
    else if (carousel.cards.some((c) => !c.title.trim()))
      errors.cards = "Cada card precisa de um texto";
  }
  if (type === "pix" && !pix.pixKey.trim()) errors.pixKey = "Chave PIX obrigatória";
  return errors;
}

// ─── main page ────────────────────────────────────────────────────────────────

const QuickAnswerEditor: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id?: string }>();
  const isEdit = !!id;
  const isMounted = useRef(true);
  const [loading, setLoading] = useState(isEdit);
  const [submitting, setSubmitting] = useState(false);
  const [formErrors, setFormErrors] = useState<FormErrors>({});

  const [shortcut, setShortcut] = useState("");
  const [slug, setSlug] = useState("");
  const [type, setType] = useState<QuickAnswerType>("text");
  const [textBody, setTextBody] = useState("");
  const [buttonsContent, setButtonsContent] = useState<QuickAnswerContentButtons>(defaultButtons());
  const [listContent, setListContent] = useState<QuickAnswerContentList>(defaultList());
  const [mediaContent, setMediaContent] = useState<QuickAnswerContentMedia>(defaultMedia());
  const [pollContent, setPollContent] = useState<QuickAnswerContentPoll>(defaultPoll());
  const [carouselContent, setCarouselContent] = useState<QuickAnswerContentCarousel>(defaultCarousel());
  const [pixContent, setPixContent] = useState<QuickAnswerContentPix>(defaultPix());

  useEffect(() => () => { isMounted.current = false; }, []);

  useEffect(() => {
    if (!isEdit) return;
    api
      .get(`/quickAnswers/${id}`)
      .then(({ data }) => {
        if (!isMounted.current) return;
        setShortcut(data.shortcut ?? "");
        setSlug(data.slug ?? "");
        const t: QuickAnswerType = data.type || "text";
        setType(t);
        if (data.content) {
          try {
            const parsed = JSON.parse(data.content);
            if (t === "text") setTextBody(parsed.body ?? data.message ?? "");
            if (t === "interactive_buttons") setButtonsContent(parsed);
            if (t === "list") setListContent(parsed);
            if (t === "media") setMediaContent(parsed);
            if (t === "poll") setPollContent(parsed);
            if (t === "carousel") setCarouselContent(parsed);
            if (t === "pix") setPixContent(parsed);
          } catch {
            setTextBody(data.message ?? "");
          }
        } else {
          setTextBody(data.message ?? "");
        }
      })
      .catch(toastError)
      .finally(() => { if (isMounted.current) setLoading(false); });
  }, [id, isEdit]);

  const buildPreviewContent = (): QuickAnswerContent | undefined => {
    switch (type) {
      case "text": return { body: textBody };
      case "interactive_buttons": return buttonsContent;
      case "list": return listContent;
      case "media": return mediaContent;
      case "poll": return pollContent;
      case "carousel": return carouselContent;
      case "pix": return pixContent;
      default: return undefined;
    }
  };

  const buildPayload = () => {
    let content: object;
    let message: string;
    switch (type) {
      case "interactive_buttons": content = buttonsContent; message = buttonsContent.body; break;
      case "list": content = listContent; message = listContent.body; break;
      case "media": content = mediaContent; message = mediaContent.caption ?? mediaContent.url; break;
      case "poll": content = pollContent; message = pollContent.question; break;
      case "carousel": content = carouselContent; message = carouselContent.body; break;
      case "pix": content = pixContent; message = pixContent.body || "Pagamento via PIX"; break;
      default: content = { body: textBody }; message = textBody;
    }
    return { shortcut, slug, type, message, content: JSON.stringify(content) };
  };

  const handleSave = async () => {
    const errors = validate(shortcut, type, textBody, buttonsContent, listContent, mediaContent, pollContent, carouselContent, pixContent);
    if (Object.keys(errors).length > 0) { setFormErrors(errors); return; }
    setSubmitting(true);
    try {
      const payload = buildPayload();
      if (isEdit) {
        await api.put(`/quickAnswers/${id}`, payload);
      } else {
        await api.post("/quickAnswers", payload);
      }
      toast.success(isEdit ? "Resposta rápida atualizada!" : "Resposta rápida criada!");
      navigate("/quick-answers");
    } catch (err) {
      toastError(err);
    } finally {
      if (isMounted.current) setSubmitting(false);
    }
  };

  const selectedType = TYPE_OPTIONS.find((o) => o.value === type);

  return (
    <PageLayout>
      <PageHeader
        title={isEdit ? "Editar resposta rápida" : "Nova resposta rápida"}
        description={isEdit ? "Atualize o template de mensagem" : "Crie um template para agilizar o atendimento"}
      >
        <div className="flex items-center gap-2">
          <Button variant="ghost" onClick={() => navigate("/quick-answers")}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Voltar
          </Button>
          <Button onClick={handleSave} disabled={submitting || loading}>
            {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isEdit ? "Salvar alterações" : "Criar resposta"}
          </Button>
        </div>
      </PageHeader>

      <PageContent>
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : (
          <div className="flex gap-8 items-start">
            {/* ── Form ── */}
            <div className="flex-1 min-w-0 space-y-6">

              {/* Identificação */}
              <Card className="rounded-2xl shadow-[0px_4px_20px_rgba(0,0,0,0.06)]">
                <CardContent className="p-5 space-y-4">
                  <SectionTitle>Identificação</SectionTitle>
                  <div className="space-y-1.5">
                    <Label htmlFor="qa-shortcut">
                      Atalho{" "}
                      <span className="text-muted-foreground font-normal">
                        — usado com / no chat
                      </span>
                    </Label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-mono text-sm select-none">
                        /
                      </span>
                      <Input
                        id="qa-shortcut"
                        autoFocus
                        placeholder="ola, contrato, preco..."
                        value={shortcut}
                        onChange={(e) => setShortcut(e.target.value.replace(/\s+/g, "-").toLowerCase())}
                        aria-invalid={!!formErrors.shortcut}
                        className="pl-6 font-mono"
                      />
                    </div>
                    {formErrors.shortcut && (
                      <p className="text-xs text-destructive">{formErrors.shortcut}</p>
                    )}
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="qa-slug">
                      Slug{" "}
                      <span className="text-muted-foreground font-normal">
                        — identificador para fluxos e integrações (opcional)
                      </span>
                    </Label>
                    <Input
                      id="qa-slug"
                      placeholder="ex: boas-vindas, menu-principal"
                      value={slug}
                      onChange={(e) =>
                        setSlug(
                          e.target.value
                            .toLowerCase()
                            .replace(/[^a-z0-9-_]+/g, "-")
                            .replace(/-+/g, "-")
                        )
                      }
                      className="font-mono"
                    />
                  </div>
                </CardContent>
              </Card>

              {/* Tipo */}
              <Card className="rounded-2xl shadow-[0px_4px_20px_rgba(0,0,0,0.06)]">
                <CardContent className="p-5 space-y-4">
                  <SectionTitle>Tipo de mensagem</SectionTitle>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {TYPE_OPTIONS.map((opt) => (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => { setType(opt.value); setFormErrors({}); }}
                        className={`rounded-xl border px-3 py-2.5 text-left transition-all ${
                          type === opt.value
                            ? "border-primary bg-primary/5 ring-1 ring-primary"
                            : "border-border hover:border-primary/40 hover:bg-muted/40"
                        }`}
                      >
                        <p className="text-sm font-semibold leading-tight">{opt.label}</p>
                        <p className="text-[11px] text-muted-foreground mt-0.5 leading-snug">{opt.description}</p>
                      </button>
                    ))}
                  </div>
                  {selectedType && (
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-xs">
                        {selectedType.label}
                      </Badge>
                      <span className="text-xs text-muted-foreground">{selectedType.description}</span>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Conteúdo */}
              <Card className="rounded-2xl shadow-[0px_4px_20px_rgba(0,0,0,0.06)]">
                <CardContent className="p-5 space-y-4">
                  <SectionTitle>Conteúdo</SectionTitle>
                  {type === "text" && (
                    <TextEditor body={textBody} onChange={setTextBody} error={formErrors.body} />
                  )}
                  {type === "interactive_buttons" && (
                    <ButtonsEditor content={buttonsContent} onChange={setButtonsContent} errors={formErrors} />
                  )}
                  {type === "list" && (
                    <ListEditor content={listContent} onChange={setListContent} errors={formErrors} />
                  )}
                  {type === "media" && (
                    <MediaEditor content={mediaContent} onChange={setMediaContent} errors={formErrors} />
                  )}
                  {type === "poll" && (
                    <PollEditor content={pollContent} onChange={setPollContent} errors={formErrors} />
                  )}
                  {type === "carousel" && (
                    <CarouselEditor content={carouselContent} onChange={setCarouselContent} errors={formErrors} />
                  )}
                  {type === "pix" && (
                    <PixEditor content={pixContent} onChange={setPixContent} errors={formErrors} />
                  )}
                </CardContent>
              </Card>

              {/* Variáveis disponíveis */}
              <Card className="rounded-2xl shadow-[0px_4px_20px_rgba(0,0,0,0.06)] border-dashed">
                <CardContent className="p-4">
                  <p className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wider">
                    Variáveis disponíveis
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {["{{contact_name}}", "{{ticket_id}}", "{{agent_name}}", "{{company_name}}"].map((v) => (
                      <code
                        key={v}
                        className="bg-yellow-100 text-yellow-800 rounded px-1.5 py-0.5 text-xs font-mono cursor-default select-all"
                      >
                        {v}
                      </code>
                    ))}
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">
                    Substituídas automaticamente no envio. No preview aparecem destacadas.
                  </p>
                </CardContent>
              </Card>

              {/* Footer actions */}
              <div className="flex items-center justify-end gap-2 pb-8">
                <Button variant="outline" onClick={() => navigate("/quick-answers")}>
                  Cancelar
                </Button>
                <Button onClick={handleSave} disabled={submitting}>
                  {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {isEdit ? "Salvar alterações" : "Criar resposta"}
                </Button>
              </div>
            </div>

            {/* ── Preview (sticky) ── */}
            <div className="hidden lg:block sticky top-6 w-[320px] shrink-0">
              <PhoneMockup>
                <WhatsAppBubblePreview
                  type={type}
                  content={buildPreviewContent()}
                  message={textBody}
                />
              </PhoneMockup>
            </div>
          </div>
        )}
      </PageContent>
    </PageLayout>
  );
};

export default QuickAnswerEditor;
