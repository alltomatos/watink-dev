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
import { PIX_KEY_TYPES } from "../quickAnswersHelpers";
import type { QuickAnswerContentPix, PixKeyType } from "../quickAnswersTypes";

export const PixEditor = ({
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
