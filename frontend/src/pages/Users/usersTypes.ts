export interface User {
  id: number | string;
  name: string;
  email: string;
  profile: string;
  emailVerified?: boolean;
}

export type UsersAction =
  | { type: "LOAD_USERS"; payload: User[] }
  | { type: "UPDATE_USERS"; payload: User }
  | { type: "DELETE_USER"; payload: number | string }
  | { type: "RESET" };

export interface ProfileInfo {
  variant: "default" | "outline" | "secondary";
  label: string;
}
