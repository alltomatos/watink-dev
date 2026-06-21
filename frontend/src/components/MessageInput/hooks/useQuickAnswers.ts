import { useState } from "react";
import api from "../../../services/api";

export interface QuickAnswer {
  shortcut: string;
  message: string;
}

export interface UseQuickAnswersReturn {
  quickAnswers: QuickAnswer[];
  typeBar: boolean;
  loadQuickAnswers: (value: string) => Promise<boolean>;
  handleQuickAnswersClick: (value: string, setInput: (v: string) => void) => void;
  closeTypeBar: () => void;
}

export function useQuickAnswers(): UseQuickAnswersReturn {
  const [quickAnswers, setQuickAnswer] = useState<QuickAnswer[]>([]);
  const [typeBar, setTypeBar] = useState(false);

  /**
   * Loads quick answers when user types "/" at the start.
   * Returns true if quick answers bar is shown, false otherwise.
   */
  const loadQuickAnswers = async (value: string): Promise<boolean> => {
    if (value && value.indexOf("/") === 0) {
      try {
        const { data } = await api.get("/quickAnswers/", {
          params: { searchParam: value.substring(1) },
        });
        setQuickAnswer(data.quickAnswers);
        setTypeBar(data.quickAnswers.length > 0);
        return data.quickAnswers.length > 0;
      } catch {
        setTypeBar(false);
      }
    } else {
      setTypeBar(false);
    }
    return false;
  };

  const handleQuickAnswersClick = (value: string, setInput: (v: string) => void) => {
    setInput(value);
    setTypeBar(false);
  };

  const closeTypeBar = () => setTypeBar(false);

  return { quickAnswers, typeBar, loadQuickAnswers, handleQuickAnswersClick, closeTypeBar };
}
