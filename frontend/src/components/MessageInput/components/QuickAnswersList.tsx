import React from "react";
import { MessageSquare, LayoutList, List, Paperclip, BarChart2, Layers, QrCode } from "lucide-react";
import { QuickAnswer } from "../hooks/useMessageInput";
import { QuickAnswerType } from "../../../pages/QuickAnswers/quickAnswersTypes";

interface QuickAnswersListProps {
  answers: QuickAnswer[];
  onSelect: (qa: QuickAnswer) => void;
}

interface TypeConfig {
  icon: React.ElementType;
  colorClass: string;
}

const TYPE_CONFIG: Record<QuickAnswerType, TypeConfig> = {
  text: { icon: MessageSquare, colorClass: "text-gray-400" },
  interactive_buttons: { icon: LayoutList, colorClass: "text-blue-500" },
  list: { icon: List, colorClass: "text-green-500" },
  media: { icon: Paperclip, colorClass: "text-orange-500" },
  poll: { icon: BarChart2, colorClass: "text-purple-500" },
  carousel: { icon: Layers, colorClass: "text-pink-500" },
  pix: { icon: QrCode, colorClass: "text-emerald-500" },
};

function getPreview(qa: QuickAnswer): string {
  if (qa.message) return qa.message;
  const type = qa.type;
  if (!type || type === "text") return qa.message ?? "";
  // qa.content vem como string JSON da API; pode também já ser objeto.
  let content: Record<string, unknown> | undefined;
  if (typeof qa.content === "string") {
    try {
      content = JSON.parse(qa.content) as Record<string, unknown>;
    } catch {
      content = undefined;
    }
  } else if (qa.content && typeof qa.content === "object") {
    content = qa.content as unknown as Record<string, unknown>;
  }
  if (content) {
    if (typeof content.body === "string") return content.body;
    if (typeof content.question === "string") return content.question;
    if (typeof content.caption === "string") return content.caption;
  }
  return `[${type}]`;
}

const QuickAnswersList: React.FC<QuickAnswersListProps> = ({ answers, onSelect }) => {
  if (answers.length === 0) return null;
  return (
    <ul className="absolute bottom-full left-0 w-full bg-[var(--bg-surface)] border border-[var(--border-divider)] p-0.5 m-0 z-50 max-h-[200px] overflow-y-auto list-none">
      {answers.map((value, index) => {
        const typeKey: QuickAnswerType = value.type ?? "text";
        const config = TYPE_CONFIG[typeKey] ?? TYPE_CONFIG.text;
        const Icon = config.icon;
        const preview = getPreview(value);
        return (
          <li key={index}>
            <a
              href="#"
              className="flex items-center gap-1.5 p-2 overflow-hidden text-ellipsis max-h-8 hover:bg-[var(--bg-surface-alt)] cursor-pointer text-sm"
              onClick={(e) => {
                e.preventDefault();
                onSelect(value);
              }}
            >
              <span className={`shrink-0 ${config.colorClass}`}>
                <Icon size={12} />
              </span>
              <span className="truncate">{`/${value.shortcut} - ${preview}`}</span>
            </a>
          </li>
        );
      })}
    </ul>
  );
};

export default QuickAnswersList;
