export interface Permission {
  id: string;
  name: string;
}

export interface GroupUser {
  id: string;
  name: string;
  email?: string;
}

export interface GroupFormValues {
  name: string;
  permissions?: Permission[];
  users?: GroupUser[];
}
