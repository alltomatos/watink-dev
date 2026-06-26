import { useState } from "react";
import api from "../../../services/api";
import { QuickAnswer } from "../../../pages/QuickAnswers/quickAnswersTypes";

export type { QuickAnswer };

export interface UseQuickAnswersReturn {
  quickAnswers: QuickAnswer[];
  typeBar: boolean;
  loadQuickAnswers: (value: string) => Promise<boolean>;
  handleQuickAnswersClick: (qa: QuickAnswer, setInput: (v: string) => void) => void;
  closeTypeBar: () => void;
}

export function useQuickAnswers(onDirectSend?: (qa: QuickAnswer) => void): UseQuickAnswersReturn {
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

  const handleQuickAnswersClick = (qa: QuickAnswer, setInput: (v: string) => void) => {
    if (!qa.type || qa.type === "text") {
      setInput(qa.message);
    } else {
      if (onDirectSend) {
        onDirectSend(qa);
      } else {
        console.warn("Direct send not yet implemented for type:", qa.type);
      }
    }
    setTypeBar(false);
  };

  const closeTypeBar = () => setTypeBar(false);

  return { quickAnswers, typeBar, loadQuickAnswers, handleQuickAnswersClick, closeTypeBar };
}
