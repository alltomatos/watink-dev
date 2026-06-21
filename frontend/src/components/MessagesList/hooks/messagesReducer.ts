import { Message, MessagesAction } from "../types";

const sortByDate = (arr: Message[]): Message[] =>
  [...arr].sort(
    (a, b) =>
      new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
  );

export const messagesReducer = (
  state: Message[],
  action: MessagesAction
): Message[] => {
  if (action.type === "LOAD_MESSAGES") {
    const messages = action.payload || [];
    const merged = [...state];
    messages.forEach((message) => {
      const idx = merged.findIndex((m) => m.id === message.id);
      if (idx !== -1) merged[idx] = message;
      else merged.push(message);
    });
    return sortByDate(merged);
  }
  if (action.type === "ADD_MESSAGE") {
    const newMessage = action.payload;
    const idx = state.findIndex((m) => m.id === newMessage.id);
    const updated = [...state];
    if (idx !== -1) updated[idx] = newMessage;
    else updated.push(newMessage);
    return sortByDate(updated);
  }
  if (action.type === "UPDATE_MESSAGE") {
    const idx = state.findIndex((m) => m.id === action.payload.id);
    if (idx === -1) return state;
    const updated = [...state];
    updated[idx] = action.payload;
    return sortByDate(updated);
  }
  if (action.type === "RESET") return [];
  return state;
};
