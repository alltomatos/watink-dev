export interface Tenant {
  id: string | number;
  name: string;
  status: string;
}

export type TenantsAction =
  | { type: "LOAD_TENANTS"; payload: Tenant[] }
  | { type: "UPDATE_TENANTS"; payload: Tenant }
  | { type: "DELETE_TENANT"; payload: string | number }
  | { type: "RESET" };
