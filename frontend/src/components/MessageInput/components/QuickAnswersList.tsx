import React from "react";
import { MessageSquare, LayoutList, List, Paperclip, BarChart2, Layers } from "lucide-react";
import { QuickAnswer } from "../hooks/useMessageInput";
import { QuickAnswerType, QuickAnswerContent } from "../../../pages/QuickAnswers/quickAnswersTypes";

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
};

function getPreview(qa: QuickAnswer): string {
  const type = qa.type;
  if (!type || type === "text") {
    return qa.message;
  }
  const content = qa.content as (QuickAnswerContent & { body?: string; question?: string; caption?: string }) | undefined;
  if (content) {
    if ("body" in content && typeof content.body === "string") return content.body;
    if ("question" in content && typeof content.question === "string") return content.question;
    if ("caption" in content && typeof content.caption === "string") return content.caption;
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
