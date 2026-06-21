import React from "react";
import { Send } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { ChatMessage } from "../contactAIInsightsTypes";

interface ChatSectionProps {
  chatHistory: ChatMessage[];
  asking: boolean;
  question: string;
  messagesEndRef: React.RefObject<HTMLDivElement>;
  onQuestionChange: (value: string) => void;
  onAsk: () => void;
  onKeyDown: (e: React.KeyboardEvent<HTMLInputElement>) => void;
}

const ChatSection = ({
  chatHistory,
  asking,
  question,
  messagesEndRef,
  onQuestionChange,
  onAsk,
  onKeyDown,
}: ChatSectionProps) => (
  <div className="border-t border-[var(--border-divider)] p-3 bg-[var(--bg-surface)]">
    <p className="text-xs text-[var(--text-muted)] mb-2">
      Pergunte sobre este contato:
    </p>

    {chatHistory.length > 0 && (
      <div className="max-h-[200px] overflow-y-auto mb-2 space-y-1.5">
        {chatHistory.map((msg, i) => (
          <div
            key={i}
            className={cn(
              "px-3 py-2 rounded-xl text-sm whitespace-pre-wrap max-w-[80%]",
              msg.role === "user"
                ? "bg-primary text-primary-foreground rounded-br-none ml-auto"
                : "bg-[var(--border-default)] rounded-bl-none"
            )}
          >
            {msg.content}
          </div>
        ))}
        {asking && (
          <div className="px-3 py-2 rounded-xl text-sm bg-[var(--border-default)] rounded-bl-none max-w-[80%] flex items-center gap-2">
            <Skeleton className="w-3 h-3 rounded-full" />
            <span className="text-xs">Pensando...</span>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>
    )}

    <div className="flex gap-2">
      <Input
        className="flex-1 h-8 text-sm"
        placeholder="Ex: Qual foi o último problema reportado?"
        value={question}
        onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
          onQuestionChange(e.target.value)
        }
        onKeyDown={onKeyDown}
        disabled={asking}
      />
      <Button
        size="sm"
        variant="default"
        onClick={onAsk}
        disabled={!question.trim() || asking}
        className="h-8 px-3"
      >
        <Send className="w-3.5 h-3.5" />
      </Button>
    </div>
  </div>
);

export default ChatSection;
