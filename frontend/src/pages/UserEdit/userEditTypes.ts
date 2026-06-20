export interface UserFormValues {
  name: string;
  email: string;
  password: string;
  profile: string;
  roleId: string;
}

export interface Role {
  id: string;
  name: string;
}

export interface Permission {
  id: string;
  name: string;
  description?: string;
}

export interface WhatsApp {
  id: number;
  name: string;
}
