import { Contact, ContactsAction } from "../contactsTypes";

export function contactsReducer(state: Contact[], action: ContactsAction): Contact[] {
  if (action.type === "LOAD_CONTACTS") {
    const incoming = action.payload ?? [];
    if (incoming.length === 0) return [];
    const next = [...state];
    incoming.forEach((contact) => {
      const idx = next.findIndex((c) => c.id === contact.id);
      if (idx !== -1) {
        next[idx] = contact;
      } else {
        next.push(contact);
      }
    });
    return next;
  }

  if (action.type === "UPDATE_CONTACTS") {
    const contact = action.payload;
    const idx = state.findIndex((c) => c.id === contact.id);
    if (idx !== -1) {
      const next = [...state];
      next[idx] = contact;
      return next;
    }
    return [contact, ...state];
  }

  if (action.type === "DELETE_CONTACT") {
    return state.filter((c) => c.id !== action.payload);
  }

  if (action.type === "RESET") {
    return [];
  }

  return state;
}
