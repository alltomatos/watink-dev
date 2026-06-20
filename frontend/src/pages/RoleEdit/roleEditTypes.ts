import * as Yup from "yup";

export interface Permission {
  id: string;
  name: string;
  permissionId?: string;
}

export interface RoleFormValues {
  name: string;
  description: string;
  permissions?: Permission[];
  RolePermissions?: Permission[];
}

export const RoleSchema = Yup.object().shape({
  name: Yup.string()
    .min(2, "Nome muito curto!")
    .max(50, "Nome muito longo!")
    .required("Nome é obrigatório"),
  description: Yup.string().max(100, "Descrição muito longa!"),
});
