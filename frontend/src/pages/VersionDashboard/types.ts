export interface QueueItem {
  name: string;
  messages?: number;
  consumers?: number;
  error?: string;
}

export interface QueueAlert {
  level: "ok" | "warning" | "error";
  label: string;
}

export interface SystemStats {
  cpuUsage?: number;
  memoryUsed?: number;
  memoryTotal?: number;
  uptime?: number;
  timestamp?: number;
  process?: {
    cpuUsage?: number;
    memoryUsed?: number;
    numGoroutine?: number;
  };
  rabbitmq?: {
    connected?: boolean;
    queues?: QueueItem[];
  };
  tenantConsumption?: {
    tenantId: string;
    tenantName: string;
    users: number;
    contacts: number;
    tickets: number;
    openTickets: number;
    whatsapps: number;
  }[];
}

export interface ReleaseMeta {
  breaking: boolean;
  minCompatibleFrom: string;
  migrationNotes: string;
}
