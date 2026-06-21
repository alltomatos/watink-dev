import React from "react";
import { Participant } from "../hooks/useMessageInput";

interface MentionsListProps {
  mentions: Participant[];
  onSelect: (contact: Participant) => void;
}

const MentionsList: React.FC<MentionsListProps> = ({ mentions, onSelect }) => {
  if (mentions.length === 0) return null;
  return (
    <ul className="absolute bottom-full left-0 w-full bg-[var(--bg-surface)] border border-[var(--border-divider)] p-0.5 m-0 z-[9999] max-h-[200px] overflow-y-auto list-none">
      {mentions.map((contact, index) => (
        <li
          key={index}
          className="cursor-pointer hover:bg-[var(--bg-surface-alt)]"
          onClick={() => onSelect(contact)}
        >
          <a className="flex items-center p-2 overflow-hidden max-h-[45px] border-b border-[var(--border-default)]">
            {contact.profilePicUrl && (
              <img
                src={contact.profilePicUrl}
                alt={contact.name}
                className="w-7 h-7 rounded-full mr-2.5"
              />
            )}
            {contact.name || contact.number}
          </a>
        </li>
      ))}
    </ul>
  );
};

export default MentionsList;
