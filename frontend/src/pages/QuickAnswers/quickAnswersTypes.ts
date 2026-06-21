export interface QuickAnswer {
  id: number;
  shortcut: string;
  message: string;
}

export type QuickAnswersAction =
  | { type: "LOAD_QUICK_ANSWERS"; payload: QuickAnswer[] }
  | { type: "UPDATE_QUICK_ANSWERS"; payload: QuickAnswer }
  | { type: "DELETE_QUICK_ANSWER"; payload: number }
  | { type: "RESET" };
