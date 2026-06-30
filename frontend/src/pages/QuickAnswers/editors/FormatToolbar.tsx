import React from "react";
import { Bold, Italic, Strikethrough, Code } from "lucide-react";

// Formatação WhatsApp: envolve a seleção do textarea com os marcadores.
const WA_FORMATS = [
  { icon: Bold, label: "Negrito", marker: "*" },
  { icon: Italic, label: "Itálico", marker: "_" },
  { icon: Strikethrough, label: "Tachado", marker: "~" },
  { icon: Code, label: "Monoespaçado", marker: "```" },
];

export function wrapSelection(
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

export const FormatToolbar = ({ onApply }: { onApply: (marker: string) => void }) => (
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
