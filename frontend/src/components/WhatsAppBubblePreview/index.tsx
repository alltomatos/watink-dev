import React from "react";
import {
  Image,
  Video,
  Music,
  FileText,
  List,
} from "lucide-react";
import type {
  QuickAnswerType,
  QuickAnswerContent,
  QuickAnswerContentText,
  QuickAnswerContentButtons,
  QuickAnswerContentList,
  QuickAnswerContentMedia,
  QuickAnswerContentPoll,
} from "@/pages/QuickAnswers/quickAnswersTypes";

interface WhatsAppBubblePreviewProps {
  type: QuickAnswerType | undefined;
  content: QuickAnswerContent | undefined;
  message?: string;
}

function formatWhatsAppText(text: string): React.ReactNode[] {
  const parts: React.ReactNode[] = [];
  const regex = /(\{\{[^}]+\}\})|(\*[^*]+\*)|(_[^_]+_)|(~[^~]+~)|(`[^`]+`)/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(text.slice(lastIndex, match.index));
    }

    const [full] = match;

    if (full.startsWith("{{")) {
      parts.push(
        <span
          key={match.index}
          className="bg-yellow-100 text-yellow-800 rounded px-0.5 text-sm font-mono"
        >
          {full}
        </span>
      );
    } else if (full.startsWith("*")) {
      parts.push(<strong key={match.index}>{full.slice(1, -1)}</strong>);
    } else if (full.startsWith("_")) {
      parts.push(<em key={match.index}>{full.slice(1, -1)}</em>);
    } else if (full.startsWith("~")) {
      parts.push(<s key={match.index}>{full.slice(1, -1)}</s>);
    } else if (full.startsWith("`")) {
      parts.push(
        <code
          key={match.index}
          className="bg-gray-100 rounded px-0.5 text-xs font-mono"
        >
          {full.slice(1, -1)}
        </code>
      );
    }

    lastIndex = match.index + full.length;
  }

  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex));
  }

  return parts;
}

function Timestamp() {
  return (
    <span className="text-[10px] text-gray-400 float-right ml-2 mt-1 select-none">
      14:32 ✓✓
    </span>
  );
}

function BubbleWrapper({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex justify-end">
      <div
        className="rounded-lg px-3 py-2 max-w-[85%] shadow-sm text-sm text-gray-900 bg-[var(--whatsapp-bubble-out,hsl(var(--accent)))]"
      >
        {children}
      </div>
    </div>
  );
}

function TextBubble({ body }: { body: string }) {
  return (
    <BubbleWrapper>
      <p className="whitespace-pre-wrap leading-snug">
        {formatWhatsAppText(body)}
      </p>
      <Timestamp />
    </BubbleWrapper>
  );
}

function ButtonsBubble({ content }: { content: QuickAnswerContentButtons }) {
  const buttons = content.buttons.slice(0, 3);
  return (
    <BubbleWrapper>
      <p className="whitespace-pre-wrap leading-snug mb-1">
        {formatWhatsAppText(content.body)}
      </p>
      {content.footer && (
        <p className="text-xs text-gray-500 mb-2">{content.footer}</p>
      )}
      <Timestamp />
      <div className="border-t border-gray-300 mt-2 pt-1 flex flex-col gap-1">
        {buttons.map((btn) => (
          <div
            key={btn.id}
            className="text-center text-blue-500 text-sm py-1 border-t border-gray-200 first:border-t-0 cursor-default select-none"
          >
            {btn.label}
          </div>
        ))}
      </div>
    </BubbleWrapper>
  );
}

function ListBubble({ content }: { content: QuickAnswerContentList }) {
  return (
    <BubbleWrapper>
      <p className="whitespace-pre-wrap leading-snug mb-1">
        {formatWhatsAppText(content.body)}
      </p>
      {content.footer && (
        <p className="text-xs text-gray-500 mb-2">{content.footer}</p>
      )}
      <Timestamp />
      <div className="border-t border-gray-300 mt-2 pt-1">
        <div className="flex items-center justify-center gap-1 text-blue-500 text-sm py-1 cursor-default select-none">
          <List size={14} />
          <span>{content.button_text || "Ver opções"}</span>
        </div>
      </div>
    </BubbleWrapper>
  );
}

function MediaBubble({ content }: { content: QuickAnswerContentMedia }) {
  const icons: Record<QuickAnswerContentMedia["media_type"], React.ReactNode> = {
    image: <Image size={32} className="text-gray-400" />,
    video: <Video size={32} className="text-gray-400" />,
    audio: <Music size={32} className="text-gray-400" />,
    document: <FileText size={32} className="text-gray-400" />,
  };

  return (
    <BubbleWrapper>
      <div className="bg-gray-200 rounded-md flex items-center justify-center w-full h-24 mb-1">
        {icons[content.media_type]}
      </div>
      {content.caption && (
        <p className="text-sm whitespace-pre-wrap leading-snug">
          {formatWhatsAppText(content.caption)}
        </p>
      )}
      <Timestamp />
    </BubbleWrapper>
  );
}

function PollBubble({ content }: { content: QuickAnswerContentPoll }) {
  return (
    <BubbleWrapper>
      <p className="font-semibold mb-2 leading-snug">
        {formatWhatsAppText(content.question)}
      </p>
      <div className="flex flex-col gap-1 mb-1">
        {content.options.map((option, idx) => (
          <div key={idx} className="flex items-center gap-2 text-sm">
            <div className="w-4 h-4 rounded-full border-2 border-gray-400 flex-shrink-0" />
            <span>{option}</span>
          </div>
        ))}
      </div>
      <Timestamp />
    </BubbleWrapper>
  );
}

export default function WhatsAppBubblePreview({
  type,
  content,
  message,
}: WhatsAppBubblePreviewProps) {
  function renderBubble() {
    if (!type || !content) {
      if (type === "text" && message) {
        return <TextBubble body={message} />;
      }
      return (
        <div className="text-sm text-gray-400 italic text-center py-4">
          Preencha os campos para ver o preview
        </div>
      );
    }

    switch (type) {
      case "text": {
        const c = content as QuickAnswerContentText;
        return <TextBubble body={c.body || message || ""} />;
      }
      case "interactive_buttons": {
        const c = content as QuickAnswerContentButtons;
        return <ButtonsBubble content={c} />;
      }
      case "list": {
        const c = content as QuickAnswerContentList;
        return <ListBubble content={c} />;
      }
      case "media": {
        const c = content as QuickAnswerContentMedia;
        return <MediaBubble content={c} />;
      }
      case "poll": {
        const c = content as QuickAnswerContentPoll;
        return <PollBubble content={c} />;
      }
      case "carousel":
        return (
          <div className="text-sm text-gray-400 italic text-center py-4">
            Preview de carousel não disponível
          </div>
        );
      default:
        return (
          <div className="text-sm text-gray-400 italic text-center py-4">
            Preencha os campos para ver o preview
          </div>
        );
    }
  }

  return (
    <div className="bg-[#ece5dd] rounded-lg p-4 min-h-[120px] flex flex-col justify-center">
      {renderBubble()}
    </div>
  );
}
