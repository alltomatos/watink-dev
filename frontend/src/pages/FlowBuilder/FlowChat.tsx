import React, { useState } from 'react';
import { Send, Monitor } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import api from '../../services/api';
import { toast } from 'react-toastify';
import { cn } from '@/lib/utils';

// ─── Types ────────────────────────────────────────────────────────────────────

interface ChatMessage {
  id: number;
  text: string;
  sender: 'user' | 'bot';
}

interface FlowChatProps {
  onFlowGenerated: (nodes: unknown[], edges: unknown[]) => void;
}

// ─── Component ────────────────────────────────────────────────────────────────

const FlowChat: React.FC<FlowChatProps> = ({ onFlowGenerated }) => {
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 1,
      text: 'Olá! Sou seu assistente de criação de fluxos. Descreva o fluxo que você gostaria de criar.',
      sender: 'bot',
    },
  ]);

  const handleSend = async () => {
    if (!input.trim()) return;

    const userMsg: ChatMessage = { id: Date.now(), text: input, sender: 'user' };
    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    try {
      const { data } = await api.post('/flows/ai', { prompt: userMsg.text });

      const botMsg: ChatMessage = {
        id: Date.now() + 1,
        text: data.message || 'Fluxo gerado com sucesso!',
        sender: 'bot',
      };
      setMessages((prev) => [...prev, botMsg]);

      if (data.nodes && data.edges) {
        onFlowGenerated(data.nodes, data.edges);
      }
    } catch (err) {
      const status = (err as { response?: { status?: number } })?.response?.status;
      const unavailable = status === 501;
      if (unavailable) {
        toast.info('Recurso indisponível no momento', { toastId: 'flow-ai-501' });
      } else {
        toast.error('Erro ao processar sua solicitação.');
      }
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now() + 1,
          text: unavailable
            ? 'O assistente de IA está indisponível no momento.'
            : 'Desculpe, tive um problema ao gerar o fluxo. Tente novamente.',
          sender: 'bot',
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="flex flex-col h-full bg-[var(--bg-surface)]">
      {/* Header */}
      <div className="px-4 py-3 bg-primary text-primary-foreground shadow-sm shrink-0">
        <div className="flex items-center gap-2 text-base font-semibold">
          <Monitor className="w-5 h-5" />
          Flow Assistant
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 bg-[var(--bg-default)] space-y-2">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={cn('flex', msg.sender === 'user' ? 'justify-end' : 'justify-start')}
          >
            <div
              className={cn(
                'max-w-[85%] px-3 py-2 rounded-xl text-sm shadow-sm',
                msg.sender === 'user'
                  ? 'bg-[var(--status-success-bg)] rounded-br-sm'
                  : 'bg-[var(--status-info-bg)] rounded-bl-sm',
              )}
            >
              {msg.text}
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex justify-start px-3">
            <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        )}
      </div>

      {/* Input */}
      <div className="flex items-center gap-2 p-3 border-t bg-[var(--bg-surface)] shrink-0">
        <Textarea
          className="flex-1 text-sm resize-none min-h-[36px] max-h-[80px]"
          placeholder="Ex: Crie um fluxo para agendar consultas..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={loading}
          rows={1}
        />
        <Button
          size="icon"
          className="h-9 w-9 shrink-0"
          onClick={handleSend}
          disabled={loading || !input.trim()}
        >
          <Send className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
};

export default FlowChat;
