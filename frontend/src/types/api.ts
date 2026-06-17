import { Contact } from "./Ticket";

export interface WhatsAppSession {
  id: number | string;
  qrcode?: string;
  pairingCode?: string;
  status?: string;
}

export interface WhatsAppSessionSocketEvent {
  action: string;
  session: WhatsAppSession;
}

export interface SocketMessageEvent<T> {
  action: 'create' | 'update' | 'delete';
  message: T;
  ticketId?: number | string;
}

export interface SettingPayload {
  key: string;
  value: string;
}

export interface SettingSocketEvent {
  action: "update" | "delete";
  setting: SettingPayload;
}

export interface PluginsPayload {
  active: string[];
}

export interface PaginatedContacts {
  contacts: Contact[];
  count: number;
  hasMore: boolean;
}

export interface TicketCreatePayload {
  contactId: number | string;
  userId: number | string;
  status: "open" | "pending" | "closed";
}

/** Shape of a single plugin entry returned by /plugins/catalog */
export interface CatalogPlugin {
  id: string | number;
  slug: string;
  name: string;
  description: string;
  version: string;
  type: "free" | "business";
  price: number;
  category: string;
  iconUrl?: string;
}

/** Response shape of GET /plugins/catalog */
export interface PluginCatalogResponse {
  plugins: CatalogPlugin[];
  /** Present when the manager is unreachable and returns stale cache */
  offline?: boolean;
}

/** Entitlement info bundled in the installed response */
export interface PluginEntitlements {
  plan_name?: string;
  [key: string]: string | number | boolean | undefined;
}

/** Response shape of GET /plugins/installed */
export interface PluginInstalledResponse {
  active: string[];
  entitlements?: PluginEntitlements;
}
