import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import {
  Type,
  Clock,
  Image,
  FileText,
  Mic,
  Video,
} from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────

type ContentType = 'text' | 'interval' | 'image' | 'file' | 'audio' | 'video';

interface ContentModalProps {
  open: boolean;
  onClose: () => void;
  onAdd: (type: ContentType) => void;
}

// ─── Option config ────────────────────────────────────────────────────────────

const OPTIONS: { type: ContentType; label: string; icon: React.ElementType; bg: string }[] = [
  { type: 'text', label: 'Texto', icon: Type, bg: 'bg-[var(--brand-blue,#007AFF)]' },
  { type: 'interval', label: 'Intervalo', icon: Clock, bg: 'bg-[var(--brand-green,#34C759)]' },
  { type: 'image', label: 'Imagem', icon: Image, bg: 'bg-[var(--brand-orange,#FF9500)]' },
  { type: 'file', label: 'Arquivo', icon: FileText, bg: 'bg-[var(--brand-indigo,#5856D6)]' },
  { type: 'audio', label: 'Audio', icon: Mic, bg: 'bg-[var(--brand-purple,#AF52DE)]' },
  { type: 'video', label: 'Video', icon: Video, bg: 'bg-[var(--status-error,#FF3B30)]' },
];

// ─── Variable docs ────────────────────────────────────────────────────────────

const VARIABLES: { code: string; desc: string }[] = [
  { code: '{{firstName}}', desc: 'Retorna o primeiro nome do contato relacionado ao ticket. Se não houver contato, retorna uma string vazia.' },
  { code: '{{name}}', desc: 'O nome completo do contato (ou uma string vazia se não houver contato).' },
  { code: '{{userName}}', desc: 'O nome do usuário associado ao ticket. Se não houver usuário, retorna uma string vazia.' },
  { code: '{{ms}}', desc: 'Retorna uma saudação com base no horário atual (Exemplo: "Bom Dia", "Boa Tarde").' },
  { code: '{{protocol}}', desc: 'Combinação de control() e o ID do ticket, criando um protocolo único.' },
  { code: '{{date}}', desc: 'Retorna a data atual no formato dd-mm-yyyy.' },
  { code: '{{hour}}', desc: 'Retorna a hora atual no formato hh:mm:ss.' },
  { code: '{{ticket_id}}', desc: 'O ID do ticket, se existir. Caso contrário, retorna uma string vazia.' },
  { code: '{{queue}}', desc: 'Retorna o nome da fila à qual o ticket está associado (caso exista).' },
  { code: '{{connection}}', desc: 'Retorna o nome da conexão de WhatsApp associada ao ticket.' },
];

// ─── Component ────────────────────────────────────────────────────────────────

const ContentModal: React.FC<ContentModalProps> = ({ open, onClose, onAdd }) => {
  const handleOptionClick = (type: ContentType) => {
    onAdd(type);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Adicionar conteúdo ao fluxo</DialogTitle>
        </DialogHeader>

        {/* Content type buttons */}
        <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
          {OPTIONS.map(({ type, label, icon: Icon, bg }) => (
            <button
              key={type}
              onClick={() => handleOptionClick(type)}
              className={`${bg} h-[50px] rounded-md flex items-center justify-start gap-2 px-3 text-white font-semibold text-sm shadow-sm hover:opacity-90 hover:-translate-y-px transition-all duration-150`}
            >
              <Icon className="w-4 h-4 shrink-0" />
              {label}
            </button>
          ))}
        </div>

        {/* Variables section */}
        <div className="mt-3 p-4 bg-muted/50 rounded-lg border border-border">
          <p className="font-bold text-sm mb-3">Variáveis</p>
          <div className="space-y-2">
            {VARIABLES.map(({ code, desc }) => (
              <p key={code} className="text-sm">
                <code className="font-mono bg-muted px-1 py-0.5 rounded text-xs">{code}</code>
                {': '}
                <span className="text-muted-foreground">{desc}</span>
              </p>
            ))}
          </div>
        </div>

        <DialogFooter>
          <Button variant="destructive" onClick={onClose}>Cancelar</Button>
          <Button onClick={onClose}>Adicionar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ContentModal;
