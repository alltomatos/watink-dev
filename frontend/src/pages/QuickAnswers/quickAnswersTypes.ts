export type QuickAnswerType =
  | "text"
  | "interactive_buttons"
  | "list"
  | "media"
  | "poll"
  | "carousel";

export interface QuickAnswerContentText {
  body: string;
}

export interface QuickAnswerContentButtons {
  body: string;
  footer?: string;
  buttons: Array<{ id: string; label: string }>;
}

export interface QuickAnswerContentList {
  body: string;
  button_text: string;
  footer?: string;
  sections: Array<{
    title: string;
    rows: Array<{ id: string; title: string; description?: string }>;
  }>;
}

export interface QuickAnswerContentMedia {
  media_type: "image" | "video" | "audio" | "document";
  url: string;
  caption?: string;
}

export interface QuickAnswerContentPoll {
  question: string;
  options: string[];
  max_selections: number;
  capture_results: boolean;
  on_answer: null | { type: string; [key: string]: unknown };
}

export type QuickAnswerContent =
  | QuickAnswerContentText
  | QuickAnswerContentButtons
  | QuickAnswerContentList
  | QuickAnswerContentMedia
  | QuickAnswerContentPoll;

export interface QuickAnswer {
  id: number;
  shortcut: string;
  message: string;
  type?: QuickAnswerType;
  content?: QuickAnswerContent;
}

export type QuickAnswersAction =
  | { type: "LOAD_QUICK_ANSWERS"; payload: QuickAnswer[] }
  | { type: "UPDATE_QUICK_ANSWERS"; payload: QuickAnswer }
  | { type: "DELETE_QUICK_ANSWER"; payload: number }
  | { type: "RESET" };
