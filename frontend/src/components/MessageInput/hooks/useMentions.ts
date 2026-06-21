import { useState } from "react";
import toastError from "../../../errors/toastError";
import api from "../../../services/api";

export interface Participant {
  number: string;
  name?: string;
  profilePicUrl?: string;
}

export interface UseMentionsReturn {
  mentions: Participant[];
  mentionOpen: boolean;
  handleMentionClick: (contact: Participant, currentInput: string, setInput: (v: string) => void, focusInput: () => void) => void;
  loadMentions: (ticketId: string | undefined, value: string) => Promise<boolean>;
  closeMentions: () => void;
}

export function useMentions(): UseMentionsReturn {
  const [mentions, setMentions] = useState<Participant[]>([]);
  const [mentionOpen, setMentionOpen] = useState(false);

  /**
   * Loads participants for mention suggestions when user types "@".
   * Returns true if mentions were loaded, false otherwise.
   */
  const loadMentions = async (ticketId: string | undefined, value: string): Promise<boolean> => {
    if (value && value.lastIndexOf("@") === value.length - 1) {
      try {
        const { data } = await api.get<Participant[]>(`/tickets/${ticketId}/participants`);
        setMentions(data);
        if (data.length > 0) setMentionOpen(true);
        return true;
      } catch (err) {
        toastError(err);
      }
    } else if (mentionOpen && value.lastIndexOf("@") === -1) {
      setMentionOpen(false);
    }
    return false;
  };

  const handleMentionClick = (
    contact: Participant,
    currentInput: string,
    setInput: (v: string) => void,
    focusInput: () => void
  ) => {
    const newValue =
      currentInput.substring(0, currentInput.lastIndexOf("@")) + `@${contact.name || contact.number} `;
    setInput(newValue);
    setMentionOpen(false);
    focusInput();
  };

  const closeMentions = () => setMentionOpen(false);

  return { mentions, mentionOpen, handleMentionClick, loadMentions, closeMentions };
}
