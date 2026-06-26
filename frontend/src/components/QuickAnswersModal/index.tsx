import React, { useState, useEffect, useRef } from "react";
import { toast } from "react-toastify";
import { Loader2, Plus, Trash2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import api from "../../services/api";
import toastError from "../../errors/toastError";
import { i18n } from "../../translate/i18n";
import type {
  QuickAnswerType,
  QuickAnswerContentButtons,
  QuickAnswerContentList,
  QuickAnswerContentMedia,
  QuickAnswerContentPoll,
} from "../../pages/QuickAnswers/quickAnswersTypes";

// ─── helpers ────────────────────────────────────────────────────────────────

function genId(prefix: string, index: number): string {
  return `${prefix}_${Date.now()}_${index}`;
}

// ─── default content factories ──────────────────────────────────────────────

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
    {
      title: "",
      rows: [{ id: genId("row", 0), title: "", description: "" }],
    },
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

// ─── sub-editors ────────────────────────────────────────────────────────────

interface TextEditorProps {
  body: string;
  onChange: (body: string) => void;
  error?: string;
}

const TextEditor = ({ body, onChange, error }: TextEditorProps) => (
  <div className="space-y-1">
    <Label>Mensagem</Label>
    <Textarea
      rows={5}
      placeholder="Use *negrito*, _itálico_, ~tachado~"
      value={body}
      onChange={(e) => onChange(e.target.value)}
      aria-invalid={!!error}
      className="resize-none"
    />
    {error && <p className="text-xs text-destructive">{error}</p>}
  </div>
);

// ─── Buttons editor ─────────────────────────────────────────────────────────

interface ButtonsEditorProps {
  content: QuickAnswerContentButtons;
  onChange: (c: QuickAnswerContentButtons) => void;
  errors: Partial<Record<string, string>>;
}

const ButtonsEditor = ({ content, onChange, errors }: ButtonsEditorProps) => {
  const addButton = () => {
    if (content.buttons.length >= 3) return;
    onChange({
      ...content,
      buttons: [
        ...content.buttons,
        { id: genId("btn", content.buttons.length), label: "" },
      ],
    });
  };

  const removeButton = (idx: number) => {
    onChange({
      ...content,
      buttons: content.buttons.filter((_, i) => i !== idx),
    });
  };

  const updateButtonLabel = (idx: number, label: string) => {
    const buttons = content.buttons.map((b, i) =>
      i === idx ? { ...b, label } : b
    );
    onChange({ ...content, buttons });
  };

  return (
    <div className="space-y-3">
      <div className="space-y-1">
        <Label>Mensagem</Label>
        <Textarea
          rows={4}
          placeholder="Use *negrito*, _itálico_, ~tachado~"
          value={content.body}
          onChange={(e) => onChange({ ...content, body: e.target.value })}
          aria-invalid={!!errors.body}
          className="resize-none"
        />
        {errors.body && <p className="text-xs text-destructive">{errors.body}</p>}
      </div>

      <div className="space-y-1">
        <Label>Rodapé (opcional)</Label>
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
            <Input
              placeholder={`Botão ${idx + 1}`}
              value={btn.label}
              onChange={(e) => updateButtonLabel(idx, e.target.value)}
            />
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="shrink-0"
              onClick={() => removeButton(idx)}
              disabled={content.buttons.length <= 1}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        ))}
        {errors.buttons && (
          <p className="text-xs text-destructive">{errors.buttons}</p>
        )}
        {content.buttons.length < 3 && (
          <Button type="button" variant="outline" size="sm" onClick={addButton}>
            <Plus className="h-4 w-4 mr-1" /> Adicionar botão
          </Button>
        )}
      </div>
    </div>
  );
};

// ─── List editor ─────────────────────────────────────────────────────────────

interface ListEditorProps {
  content: QuickAnswerContentList;
  onChange: (c: QuickAnswerContentList) => void;
  errors: Partial<Record<string, string>>;
}

const ListEditor = ({ content, onChange, errors }: ListEditorProps) => {
  const addSection = () => {
    onChange({
      ...content,
      sections: [
        ...content.sections,
        {
          title: "",
          rows: [
            {
              id: genId("row", content.sections.length * 10),
              title: "",
              description: "",
            },
          ],
        },
      ],
    });
  };

  const updateSectionTitle = (si: number, title: string) => {
    const sections = content.sections.map((s, i) =>
      i === si ? { ...s, title } : s
    );
    onChange({ ...content, sections });
  };

  const addRow = (si: number) => {
    const sections = content.sections.map((s, i) => {
      if (i !== si) return s;
      return {
        ...s,
        rows: [
          ...s.rows,
          { id: genId("row", si * 10 + s.rows.length), title: "", description: "" },
        ],
      };
    });
    onChange({ ...content, sections });
  };

  const removeRow = (si: number, ri: number) => {
    const sections = content.sections.map((s, i) => {
      if (i !== si) return s;
      return { ...s, rows: s.rows.filter((_, j) => j !== ri) };
    });
    onChange({ ...content, sections });
  };

  const updateRow = (
    si: number,
    ri: number,
    field: "title" | "description",
    value: string
  ) => {
    const sections = content.sections.map((s, i) => {
      if (i !== si) return s;
      const rows = s.rows.map((r, j) =>
        j === ri ? { ...r, [field]: value } : r
      );
      return { ...s, rows };
    });
    onChange({ ...content, sections });
  };

  return (
    <div className="space-y-3">
      <div className="space-y-1">
        <Label>Mensagem</Label>
        <Textarea
          rows={4}
          placeholder="Use *negrito*, _itálico_, ~tachado~"
          value={content.body}
          onChange={(e) => onChange({ ...content, body: e.target.value })}
          aria-invalid={!!errors.body}
          className="resize-none"
        />
        {errors.body && <p className="text-xs text-destructive">{errors.body}</p>}
      </div>

      <div className="space-y-1">
        <Label>Texto do botão "Ver opções"</Label>
        <Input
          placeholder="Ver opções"
          value={content.button_text}
          onChange={(e) => onChange({ ...content, button_text: e.target.value })}
        />
      </div>

      <div className="space-y-1">
        <Label>Rodapé (opcional)</Label>
        <Input
          placeholder="Texto do rodapé"
          value={content.footer ?? ""}
          onChange={(e) => onChange({ ...content, footer: e.target.value })}
        />
      </div>

      <div className="space-y-3">
        <Label>Seções</Label>
        {content.sections.map((section, si) => (
          <div
            key={si}
            className="rounded-md border border-border p-3 space-y-2"
          >
            <Input
              placeholder={`Título da seção ${si + 1}`}
              value={section.title}
              onChange={(e) => updateSectionTitle(si, e.target.value)}
            />
            {section.rows.map((row, ri) => (
              <div key={row.id} className="flex gap-2 items-start pl-2">
                <div className="flex-1 space-y-1">
                  <Input
                    placeholder="Título da linha"
                    value={row.title}
                    onChange={(e) => updateRow(si, ri, "title", e.target.value)}
                  />
                  <Input
                    placeholder="Descrição (opcional)"
                    value={row.description ?? ""}
                    onChange={(e) =>
                      updateRow(si, ri, "description", e.target.value)
                    }
                  />
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="shrink-0 mt-1"
                  onClick={() => removeRow(si, ri)}
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
              onClick={() => addRow(si)}
            >
              <Plus className="h-4 w-4 mr-1" /> Adicionar linha
            </Button>
          </div>
        ))}
        <Button type="button" variant="outline" size="sm" onClick={addSection}>
          <Plus className="h-4 w-4 mr-1" /> Adicionar seção
        </Button>
      </div>
    </div>
  );
};

// ─── Media editor ────────────────────────────────────────────────────────────

interface MediaEditorProps {
  content: QuickAnswerContentMedia;
  onChange: (c: QuickAnswerContentMedia) => void;
  errors: Partial<Record<string, string>>;
}

const MediaEditor = ({ content, onChange, errors }: MediaEditorProps) => (
  <div className="space-y-3">
    <div className="space-y-1">
      <Label>Tipo de mídia</Label>
      <Select
        value={content.media_type}
        onValueChange={(v) =>
          onChange({
            ...content,
            media_type: v as QuickAnswerContentMedia["media_type"],
          })
        }
      >
        <SelectTrigger>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="image">Imagem</SelectItem>
          <SelectItem value="video">Vídeo</SelectItem>
          <SelectItem value="audio">Áudio</SelectItem>
          <SelectItem value="document">Documento</SelectItem>
        </SelectContent>
      </Select>
    </div>

    <div className="space-y-1">
      <Label>URL</Label>
      <Input
        placeholder="https://..."
        value={content.url}
        onChange={(e) => onChange({ ...content, url: e.target.value })}
        aria-invalid={!!errors.url}
      />
      {errors.url && <p className="text-xs text-destructive">{errors.url}</p>}
    </div>

    <div className="space-y-1">
      <Label>Legenda (opcional)</Label>
      <Input
        placeholder="Descrição do arquivo"
        value={content.caption ?? ""}
        onChange={(e) => onChange({ ...content, caption: e.target.value })}
      />
    </div>
  </div>
);

// ─── Poll editor ─────────────────────────────────────────────────────────────

interface PollEditorProps {
  content: QuickAnswerContentPoll;
  onChange: (c: QuickAnswerContentPoll) => void;
  errors: Partial<Record<string, string>>;
}

const PollEditor = ({ content, onChange, errors }: PollEditorProps) => {
  const addOption = () => {
    if (content.options.length >= 10) return;
    onChange({ ...content, options: [...content.options, ""] });
  };

  const removeOption = (idx: number) => {
    onChange({
      ...content,
      options: content.options.filter((_, i) => i !== idx),
    });
  };

  const updateOption = (idx: number, value: string) => {
    const options = content.options.map((o, i) => (i === idx ? value : o));
    onChange({ ...content, options });
  };

  return (
    <div className="space-y-3">
      <div className="space-y-1">
        <Label>Pergunta</Label>
        <Input
          placeholder="Qual é a sua pergunta?"
          value={content.question}
          onChange={(e) => onChange({ ...content, question: e.target.value })}
          aria-invalid={!!errors.question}
        />
        {errors.question && (
          <p className="text-xs text-destructive">{errors.question}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label>Opções</Label>
        {content.options.map((opt, idx) => (
          <div key={idx} className="flex gap-2 items-center">
            <Input
              placeholder={`Opção ${idx + 1}`}
              value={opt}
              onChange={(e) => updateOption(idx, e.target.value)}
            />
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="shrink-0"
              onClick={() => removeOption(idx)}
              disabled={content.options.length <= 2}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        ))}
        {errors.options && (
          <p className="text-xs text-destructive">{errors.options}</p>
        )}
        {content.options.length < 10 && (
          <Button type="button" variant="outline" size="sm" onClick={addOption}>
            <Plus className="h-4 w-4 mr-1" /> Adicionar opção
          </Button>
        )}
      </div>

      <div className="space-y-1">
        <Label>Máximo de seleções</Label>
        <Input
          type="number"
          min={1}
          max={content.options.length}
          value={content.max_selections}
          onChange={(e) =>
            onChange({ ...content, max_selections: Number(e.target.value) })
          }
        />
      </div>

      <div className="flex items-center gap-2">
        <Checkbox
          id="capture_results"
          checked={content.capture_results}
          onCheckedChange={(checked) =>
            onChange({ ...content, capture_results: !!checked })
          }
        />
        <Label htmlFor="capture_results" className="cursor-pointer">
          Capturar resultados
        </Label>
      </div>
    </div>
  );
};

// ─── Validation ───────────────────────────────────────────────────────────────

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
  poll: QuickAnswerContentPoll
): FormErrors {
  const errors: FormErrors = {};

  if (!shortcut || shortcut.length < 2) {
    errors.shortcut = "Atalho deve ter ao menos 2 caracteres";
  }

  if (type === "text" && !textBody.trim()) {
    errors.body = "Mensagem obrigatória";
  }
  if (type === "interactive_buttons") {
    if (!buttons.body.trim()) errors.body = "Mensagem obrigatória";
    if (buttons.buttons.length < 1) errors.buttons = "Adicione ao menos 1 botão";
  }
  if (type === "list" && !list.body.trim()) {
    errors.body = "Mensagem obrigatória";
  }
  if (type === "media" && !media.url.trim()) {
    errors.url = "URL obrigatória";
  }
  if (type === "poll") {
    if (!poll.question.trim()) errors.question = "Pergunta obrigatória";
    if (poll.options.length < 2) errors.options = "Adicione ao menos 2 opções";
  }

  return errors;
}

// ─── Main modal ───────────────────────────────────────────────────────────────

interface QuickAnswerRecord {
  shortcut: string;
  message: string;
  type?: QuickAnswerType;
  content?: string;
}

interface QuickAnswersModalProps {
  open: boolean;
  onClose: () => void;
  quickAnswerId?: number | string;
  initialValues?: Partial<QuickAnswerRecord>;
  onSave?: (values: QuickAnswerRecord) => void;
}

const QuickAnswersModal = ({
  open,
  onClose,
  quickAnswerId,
  initialValues,
  onSave,
}: QuickAnswersModalProps) => {
  const isMounted = useRef(true);
  const [submitting, setSubmitting] = useState(false);
  const [formErrors, setFormErrors] = useState<FormErrors>({});

  const [shortcut, setShortcut] = useState("");
  const [type, setType] = useState<QuickAnswerType>("text");

  const [textBody, setTextBody] = useState("");
  const [buttonsContent, setButtonsContent] =
    useState<QuickAnswerContentButtons>(defaultButtons());
  const [listContent, setListContent] =
    useState<QuickAnswerContentList>(defaultList());
  const [mediaContent, setMediaContent] =
    useState<QuickAnswerContentMedia>(defaultMedia());
  const [pollContent, setPollContent] =
    useState<QuickAnswerContentPoll>(defaultPoll());

  useEffect(() => () => { isMounted.current = false; }, []);

  useEffect(() => {
    if (!open) return;

    const populate = (data: Partial<QuickAnswerRecord>) => {
      setShortcut(data.shortcut ?? "");
      const t: QuickAnswerType = (data.type as QuickAnswerType) || "text";
      setType(t);

      if (data.content) {
        try {
          const parsed = JSON.parse(data.content);
          if (t === "text") setTextBody((parsed as { body: string }).body ?? data.message ?? "");
          if (t === "interactive_buttons") setButtonsContent(parsed as QuickAnswerContentButtons);
          if (t === "list") setListContent(parsed as QuickAnswerContentList);
          if (t === "media") setMediaContent(parsed as QuickAnswerContentMedia);
          if (t === "poll") setPollContent(parsed as QuickAnswerContentPoll);
        } catch {
          setTextBody(data.message ?? "");
        }
      } else {
        setTextBody(data.message ?? "");
        setButtonsContent(defaultButtons());
        setListContent(defaultList());
        setMediaContent(defaultMedia());
        setPollContent(defaultPoll());
      }
    };

    if (initialValues) {
      populate(initialValues);
      return;
    }
    if (!quickAnswerId) {
      populate({});
      return;
    }
    api
      .get(`/quickAnswers/${quickAnswerId}`)
      .then(({ data }) => { if (isMounted.current) populate(data); })
      .catch(toastError);
  }, [quickAnswerId, initialValues, open]);

  const handleClose = () => {
    onClose();
    setFormErrors({});
  };

  const buildPayload = (): QuickAnswerRecord => {
    let content: object;
    let message: string;

    switch (type) {
      case "interactive_buttons":
        content = buttonsContent;
        message = buttonsContent.body;
        break;
      case "list":
        content = listContent;
        message = listContent.body;
        break;
      case "media":
        content = mediaContent;
        message = mediaContent.caption ?? mediaContent.url;
        break;
      case "poll":
        content = pollContent;
        message = pollContent.question;
        break;
      default:
        content = { body: textBody };
        message = textBody;
    }

    return {
      shortcut,
      type,
      message,
      content: JSON.stringify(content),
    };
  };

  const handleSave = async () => {
    const errors = validate(
      shortcut,
      type,
      textBody,
      buttonsContent,
      listContent,
      mediaContent,
      pollContent
    );

    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }

    setSubmitting(true);
    try {
      const payload = buildPayload();
      if (quickAnswerId) {
        await api.put(`/quickAnswers/${quickAnswerId}`, payload);
      } else {
        await api.post("/quickAnswers", payload);
      }
      onSave?.(payload);
      toast.success(i18n.t("quickAnswersModal.success"));
      handleClose();
    } catch (err) {
      toastError(err);
    } finally {
      if (isMounted.current) setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => { if (!isOpen) handleClose(); }}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {quickAnswerId
              ? i18n.t("quickAnswersModal.title.edit")
              : i18n.t("quickAnswersModal.title.add")}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-1">
            <Label htmlFor="qa-shortcut">
              {i18n.t("quickAnswersModal.form.shortcut")}
            </Label>
            <Input
              id="qa-shortcut"
              autoFocus
              value={shortcut}
              onChange={(e) => setShortcut(e.target.value)}
              aria-invalid={!!formErrors.shortcut}
            />
            {formErrors.shortcut && (
              <p className="text-xs text-destructive">{formErrors.shortcut}</p>
            )}
          </div>

          <div className="space-y-1">
            <Label>Tipo de mensagem</Label>
            <Select
              value={type}
              onValueChange={(v) => {
                setType(v as QuickAnswerType);
                setFormErrors({});
              }}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="text">Texto</SelectItem>
                <SelectItem value="interactive_buttons">
                  Botões interativos
                </SelectItem>
                <SelectItem value="list">Lista</SelectItem>
                <SelectItem value="media">Mídia + texto</SelectItem>
                <SelectItem value="poll">Enquete</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {type === "text" && (
            <TextEditor
              body={textBody}
              onChange={setTextBody}
              error={formErrors.body}
            />
          )}
          {type === "interactive_buttons" && (
            <ButtonsEditor
              content={buttonsContent}
              onChange={setButtonsContent}
              errors={formErrors}
            />
          )}
          {type === "list" && (
            <ListEditor
              content={listContent}
              onChange={setListContent}
              errors={formErrors}
            />
          )}
          {type === "media" && (
            <MediaEditor
              content={mediaContent}
              onChange={setMediaContent}
              errors={formErrors}
            />
          )}
          {type === "poll" && (
            <PollEditor
              content={pollContent}
              onChange={setPollContent}
              errors={formErrors}
            />
          )}
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={handleClose}>
            {i18n.t("quickAnswersModal.buttons.cancel")}
          </Button>
          <Button onClick={handleSave} disabled={submitting}>
            {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {i18n.t("quickAnswersModal.buttons.okAdd")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default QuickAnswersModal;
