import React from "react";
import { CornerUpLeft, ExternalLink, Phone, Copy, List as ListIcon, QrCode } from "lucide-react";
import { parseData } from "../utils/messageHelpers";
import { Message } from "../types";

interface InteractiveButton {
  label?: string;
  id?: string;
  type?: string;
  url?: string;
  phone?: string;
}

interface InteractiveRow {
  id?: string;
  title?: string;
  description?: string;
}

interface InteractiveSection {
  title?: string;
  rows?: InteractiveRow[];
}

interface InteractiveCard {
  image?: string;
  title?: string;
  footer?: string;
  buttons?: InteractiveButton[];
}

interface InteractiveMeta {
  type?: string;
  buttons?: InteractiveButton[];
  footer?: string;
  buttonText?: string;
  sections?: InteractiveSection[];
  options?: string[];
  selectableCount?: number;
  cards?: InteractiveCard[];
  pixKey?: string;
  pixName?: string;
  pixType?: string;
}

// Ícone por tipo de botão (espelha os names NativeFlow: cta_url/cta_call/cta_copy/quick_reply).
const iconForButton = (type?: string): React.ReactNode => {
  switch (type) {
    case "url":
      return <ExternalLink className="h-3.5 w-3.5 shrink-0" />;
    case "call":
      return <Phone className="h-3.5 w-3.5 shrink-0" />;
    case "copy":
      return <Copy className="h-3.5 w-3.5 shrink-0" />;
    default:
      return <CornerUpLeft className="h-3.5 w-3.5 shrink-0" />;
  }
};

// Pílula de ação — fundo com tint suave da cor primária, sem bordas/linhas.
const ButtonPill: React.FC<{ button: InteractiveButton; compact?: boolean }> = ({
  button,
  compact,
}) => (
  <div
    className={[
      "flex items-center justify-center gap-1.5 rounded-lg font-medium",
      "text-[hsl(var(--action-primary))] bg-[hsl(var(--action-primary)/0.1)]",
      "cursor-default select-none",
      compact ? "py-1 text-xs" : "py-1.5 px-3 text-sm",
    ].join(" ")}
  >
    {iconForButton(button.type)}
    <span className="truncate">{button.label}</span>
  </div>
);

// Renderiza a representação visual de mensagens interativas (botões, lista, enquete,
// carousel) a partir de message.dataJson.interactive. Não-clicável — é o espelho do
// que foi enviado ao contato. O WhatsApp da Meta não renderiza, mas a UI é nossa.
const MessageInteractive: React.FC<{ message: Message }> = ({ message }) => {
  const meta = parseData(message.dataJson).interactive as InteractiveMeta | undefined;
  if (!meta || !meta.type) return null;

  if (meta.type === "buttons" && meta.buttons && meta.buttons.length > 0) {
    return (
      <div className="mt-1.5 flex flex-col gap-1">
        {meta.footer && (
          <div className="text-[11px] text-[var(--text-muted)] mb-0.5">{meta.footer}</div>
        )}
        {meta.buttons.slice(0, 3).map((b, i) => (
          <ButtonPill key={b.id ?? i} button={b} />
        ))}
      </div>
    );
  }

  if (meta.type === "list") {
    return (
      <div className="mt-1.5">
        {meta.footer && (
          <div className="text-[11px] text-[var(--text-muted)] mb-1">{meta.footer}</div>
        )}
        <div className="rounded-xl overflow-hidden bg-[hsl(var(--action-primary)/0.06)]">
          <div className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-[hsl(var(--action-primary))]">
            <ListIcon className="h-4 w-4 shrink-0" />
            <span>{meta.buttonText || "Ver opções"}</span>
          </div>
          {meta.sections && meta.sections.length > 0 && (
            <div className="px-3 pb-2 flex flex-col gap-2">
              {meta.sections.map((sec, si) => (
                <div key={si}>
                  {sec.title && (
                    <div className="text-[11px] font-semibold text-[var(--text-muted)] mb-1">
                      {sec.title}
                    </div>
                  )}
                  <div className="flex flex-col gap-1.5">
                    {sec.rows?.map((row, ri) => (
                      <div key={row.id ?? ri} className="leading-tight">
                        <div className="text-sm">{row.title}</div>
                        {row.description && (
                          <div className="text-[11px] text-[var(--text-muted)]">
                            {row.description}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  if (meta.type === "carousel" && meta.cards && meta.cards.length > 0) {
    return (
      <div className="mt-1.5 -mx-0.5">
        <div className="flex gap-2 overflow-x-auto px-0.5 pb-1">
          {meta.cards.map((card, ci) => (
            <div
              key={ci}
              className="shrink-0 w-44 rounded-xl overflow-hidden bg-[hsl(var(--message-left-bg))] shadow-[0px_2px_12px_rgba(0,0,0,0.1)]"
            >
              {card.image && (
                <img
                  src={card.image}
                  alt=""
                  className="w-full h-24 object-cover"
                  loading="lazy"
                />
              )}
              <div className="p-2 flex flex-col gap-1.5">
                {card.title && (
                  <div className="text-sm whitespace-pre-wrap leading-tight text-[hsl(var(--message-left-text))]">
                    {card.title}
                  </div>
                )}
                {card.footer && (
                  <div className="text-[11px] text-[var(--text-muted)]">{card.footer}</div>
                )}
                {card.buttons && card.buttons.length > 0 && (
                  <div className="flex flex-col gap-1">
                    {card.buttons.map((b, bi) => (
                      <ButtonPill key={b.id ?? bi} button={b} compact />
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (meta.type === "pix") {
    return (
      <div className="mt-1.5">
        <div className="flex items-center gap-2.5 rounded-xl bg-[hsl(var(--action-primary)/0.08)] p-2.5">
          <QrCode className="h-5 w-5 shrink-0 text-[hsl(var(--action-primary))]" />
          <div className="min-w-0">
            <div className="text-sm font-medium text-[hsl(var(--action-primary))]">
              Pagar com PIX
            </div>
            {meta.pixName && (
              <div className="text-[11px] text-[var(--text-muted)] truncate">{meta.pixName}</div>
            )}
            {meta.pixKey && (
              <div className="text-[11px] text-[var(--text-muted)] truncate">
                Chave: {meta.pixKey}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  if (meta.type === "poll" && meta.options && meta.options.length > 0) {
    return (
      <div className="mt-1.5 flex flex-col gap-2 pr-20">
        {meta.options.map((opt, i) => (
          <div key={i} className="flex items-center gap-2 text-sm">
            <span className="h-3.5 w-3.5 rounded-full border-2 border-[hsl(var(--action-primary)/0.5)] shrink-0" />
            <span>{opt}</span>
          </div>
        ))}
      </div>
    );
  }

  return null;
};

export default MessageInteractive;
