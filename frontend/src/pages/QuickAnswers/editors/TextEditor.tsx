import { useRef } from "react";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { FormatToolbar, wrapSelection } from "./FormatToolbar";

export const TextEditor = ({
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
