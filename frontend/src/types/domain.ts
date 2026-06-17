export interface User {
  id?: number | string;
  name?: string;
  email?: string;
  profile?: string;
  role?: string;
  permissions?: string[];
  profileImage?: string;
}

export interface Queue {
  id: number;
  name: string;
  color: string;
  greetingMessage?: string;
  distributionStrategy: string;
  prioritizeWallet: boolean;
}

/** Shape of a WhatsApp connection returned by GET /whatsapp/:id */
export interface WhatsAppConnection {
  id: number;
  name: string;
  status: string;
  isDefault: boolean;
  keepAlive: boolean;
  syncHistory: boolean;
  qrcode?: string;
  pairingCode?: string;
  retries?: number;
  updatedAt?: string;
  queues?: Queue[];
}

/** Form values managed by Formik inside WhatsAppModal */
export interface WhatsAppFormValues {
  name: string;
  isDefault: boolean;
  keepAlive: boolean;
  syncHistory: boolean;
}

/** Minimal group record returned by GET /groups */
export interface Group {
  id: number;
  name: string;
}

/** Minimal role record returned by GET /roles */
export interface Role {
  id: number;
  name: string;
}

/** Minimal queue stub embedded in user API responses */
export interface UserQueue {
  id: number;
  name: string;
}

/** Full user record returned by GET /users/:id */
export interface UserDetail {
  id: number;
  name: string;
  email: string;
  password?: string;
  whatsappId?: number | null;
  groupIds?: number[];
  groups?: Group[];
  roles?: Role[];
  queues?: UserQueue[];
}

/** Payload sent to POST /users and PUT /users/:id */
export interface UserSavePayload {
  name: string;
  email: string;
  password?: string;
  whatsappId: number | null;
  queueIds: number[];
  roleIds: number[];
  groupIds: number[];
}

export interface PipelineStage {
  id?: number;
  name: string;
  order?: number;
}

export type PipelineType = "kanban" | "funnel";

export interface Pipeline {
  id: number;
  name: string;
  description?: string;
  type: PipelineType;
  stages: PipelineStage[];
  createdAt?: string;
  updatedAt?: string;
}
