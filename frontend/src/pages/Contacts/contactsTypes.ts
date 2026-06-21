export interface Contact {
  id: number;
  name: string;
  number: string;
  email: string;
  profilePicUrl?: string;
  isGroup?: boolean;
  lid?: string;
}

export type ContactsAction =
  | { type: "LOAD_CONTACTS"; payload: Contact[] }
  | { type: "UPDATE_CONTACTS"; payload: Contact }
  | { type: "DELETE_CONTACT"; payload: number }
  | { type: "RESET" };

export type ContactsView = "table" | "card";
