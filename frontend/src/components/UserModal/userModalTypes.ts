import type { UserDetail, UserQueue, UserSavePayload } from "../../types/domain";

export type { UserDetail, UserQueue, UserSavePayload };

/** Local Formik form values — a subset of UserDetail. */
export type UserFormValues = Pick<UserDetail, "name" | "email" | "password">;

export interface UserModalProps {
  open: boolean;
  onClose: () => void;
  userId?: number | string;
}
