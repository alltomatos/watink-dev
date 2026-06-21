export interface UserProfileFormValues {
  name: string;
  email: string;
  password: string;
  confirmPassword: string;
  signature: string;
}

export interface UserProfileUpdatePayload {
  name: string;
  email: string;
  signature: string;
  password?: string;
}
