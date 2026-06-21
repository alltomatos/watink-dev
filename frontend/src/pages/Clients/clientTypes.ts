export interface ContactInput {
  name: string;
  role: string;
  phone: string;
  email: string;
  isPrimary: boolean;
  contactId: string | null;
  isNew: boolean;
}

export interface AddressInput {
  label: string;
  zipCode: string;
  street: string;
  number: string;
  complement: string;
  neighborhood: string;
  city: string;
  state: string;
  isPrimary: boolean;
}

export interface ClientContact {
  id?: string;
  name?: string;
  number?: string;
  email?: string;
}

export interface ClientFormData {
  type: "pf" | "pj";
  name: string;
  document: string;
  email: string;
  phone: string;
  notes: string;
  contacts: ContactInput[];
  addresses: AddressInput[];
}

export const EMPTY_CONTACT = (): ContactInput => ({
  name: "",
  role: "",
  phone: "",
  email: "",
  isPrimary: false,
  contactId: null,
  isNew: true,
});

export const EMPTY_ADDRESS = (): AddressInput => ({
  label: "",
  zipCode: "",
  street: "",
  number: "",
  complement: "",
  neighborhood: "",
  city: "",
  state: "",
  isPrimary: false,
});
