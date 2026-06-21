import type { Group, Role, UserDetail, UserQueue, UserSavePayload } from "../../types/domain";

export type { Group, Role, UserDetail, UserQueue, UserSavePayload };

/** Local Formik form values — a subset of UserDetail */
export type UserFormValues = Pick<UserDetail, "name" | "email" | "password" | "groupIds">;

export interface UserModalProps {
  open: boolean;
  onClose: () => void;
  userId?: number | string;
}
