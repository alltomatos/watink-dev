export interface Tenant {
    id: number | string;
    name: string;
    status: string;
}

export interface Plan {
    id: number | string;
    name: string;
    pluginQuota: number;
    price: number;
    active: boolean;
}

export interface TenantForm {
    planName: string;
    pluginQuota: number;
    status: string;
    expiresAt: string;
}

export interface PlanForm {
    name: string;
    pluginQuota: number;
    price: number;
    active: boolean;
}
