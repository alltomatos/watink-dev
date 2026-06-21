export interface MarketplacePlugin {
  id: string | number;
  slug: string;
  name: string;
  description?: string;
  version?: string;
  type?: string;
  category?: string;
  price?: number;
  iconUrl: string;
  installed: boolean;
  active: boolean;
}

export interface MarketplaceEntitlements {
  plan_name?: string;
  [key: string]: unknown;
}

export type ViewMode = "grid" | "list";
