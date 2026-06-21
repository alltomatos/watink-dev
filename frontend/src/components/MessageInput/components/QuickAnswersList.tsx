import React from "react";
import { QuickAnswer } from "../hooks/useMessageInput";

interface QuickAnswersListProps {
  answers: QuickAnswer[];
  onSelect: (message: string) => void;
}

const QuickAnswersList: React.FC<QuickAnswersListProps> = ({ answers, onSelect }) => {
  if (answers.length === 0) return null;
  return (
    <ul className="absolute bottom-full left-0 w-full bg-[var(--bg-surface)] border border-[var(--border-divider)] p-0.5 m-0 z-50 max-h-[200px] overflow-y-auto list-none">
      {answers.map((value, index) => (
        <li key={index}>
          <a
            href="#"
            className="block p-2 overflow-hidden text-ellipsis max-h-8 hover:bg-[var(--bg-surface-alt)] cursor-pointer text-sm"
            onClick={(e) => {
              e.preventDefault();
              onSelect(value.message);
            }}
          >
            {`${value.shortcut} - ${value.message}`}
          </a>
        </li>
      ))}
    </ul>
  );
};

export default QuickAnswersList;
