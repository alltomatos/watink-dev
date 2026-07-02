export interface ContactInput {
  name: string;
  role: string;
  phone: string;
  email: string;
  isPrimary: boolean;
  contactId: string | null;
  isNew: boolean;
}

// AddressInput is the FORM-EDITING shape used by AddressesTab/useClientModal
// while the user types. It carries an optional `id` so the submit flow can
// tell "already exists on the backend" (PUT) apart from "new" (POST) —
// see ClientAddress below for the backend RESPONSE shape.
export interface AddressInput {
  id?: number;
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

// ClientAddress mirrors the real backend response for
// GET/POST/PUT /clients/:id/addresses (business/internal/controllers/client_address.go).
// Do not confuse with AddressInput (the write DTO the form assembles).
export interface ClientAddress {
  id?: number;
  clientId?: number;
  label: string;
  zipCode: string;
  street: string;
  number: string;
  complement: string;
  neighborhood: string;
  city: string;
  state: string;
  isPrimary: boolean;
  latitude?: number | null;
  longitude?: number | null;
}

export interface ClientContact {
  id?: string;
  name?: string;
  number?: string;
  email?: string;
}

// ClientRecord mirrors the real backend response for
// GET/POST/PUT /clients(/:id) (business/internal/controllers/client.go).
// Do not confuse with ClientFormData (the write DTO the form assembles).
export interface ClientRecord {
  id: number;
  type: "pf" | "pj";
  name: string;
  socialName?: string | null;
  document?: string;
  email?: string;
  phone?: string;
  notes?: string;
  tenantId?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface ClientFormData {
  type: "pf" | "pj";
  name: string;
  socialName: string;
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
