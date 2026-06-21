import React from "react";
import { Bot, Loader2, Send } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import type { ChatMessage } from "../pipelineCreatorTypes";

interface PipelineAIChatProps {
    messages: ChatMessage[];
    input: string;
    aiLoading: boolean;
    messagesEndRef: React.RefObject<HTMLDivElement>;
    onInputChange: (value: string) => void;
    onSend: () => void;
    onKeyDown: (e: React.KeyboardEvent<HTMLInputElement>) => void;
}

const PipelineAIChat: React.FC<PipelineAIChatProps> = ({
    messages,
    input,
    aiLoading,
    messagesEndRef,
    onInputChange,
    onSend,
    onKeyDown,
}) => (
    <Card className="flex-1 flex flex-col overflow-hidden bg-card">
        <div className="p-3 border-b flex items-center gap-2 bg-muted/30">
            <Bot className="h-5 w-5 text-primary" />
            <span className="font-semibold text-sm">IA Assistant</span>
        </div>

        <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4">
            {messages.map((msg, i) => (
                <div
                    key={i}
                    className={cn(
                        "p-3 rounded-xl max-w-[90%] break-words text-sm",
                        msg.role === "user"
                            ? "self-end bg-primary text-primary-foreground rounded-br-none"
                            : "self-start bg-muted text-foreground rounded-bl-none"
                    )}
                >
                    <span className="whitespace-pre-wrap">{msg.content}</span>
                </div>
            ))}
            {aiLoading && (
                <div className="self-start bg-muted p-3 rounded-xl rounded-bl-none flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                    <span className="text-xs text-muted-foreground">Pensando...</span>
                </div>
            )}
            <div ref={messagesEndRef} />
        </div>

        <div className="p-3 border-t bg-muted/30">
            <div className="relative">
                <Input
                    placeholder="Descreva seu processo..."
                    value={input}
                    onChange={(e) => onInputChange(e.target.value)}
                    onKeyDown={onKeyDown}
                    disabled={aiLoading}
                    className="pr-10"
                />
                <Button
                    variant="ghost"
                    size="icon"
                    className="absolute right-1 top-1 h-8 w-8"
                    disabled={!input.trim() || aiLoading}
                    onClick={onSend}
                >
                    <Send className="h-4 w-4 text-primary" />
                </Button>
            </div>
            <span className="text-[10px] text-muted-foreground block text-center mt-2">
                A IA atualizará as etapas automaticamente.
            </span>
        </div>
    </Card>
);

export default PipelineAIChat;
