export interface ChecklistItem {
  id: string;
  label: string;
  isRequired: boolean;
  isDone: boolean;
  inputType: "text" | "number" | "photo";
  value?: string;
}

export interface Material {
  id: string;
  materialName: string;
  quantity: number | string;
  unit: string;
  isBillable: boolean;
  notes?: string;
}

export interface Occurrence {
  id: string;
  description: string;
  type: "info" | "impediment" | "delay";
  timeImpact?: number;
}

export interface Activity {
  id: string;
  title: string;
  description?: string;
  protocolId?: string;
  items?: ChecklistItem[];
  materials?: Material[];
  occurrences?: Occurrence[];
  protocol?: { client?: { name?: string } };
}

export interface NewOccurrence {
  description: string;
  type: "info" | "impediment" | "delay";
  timeImpact: string;
}

export const OCCURRENCE_TYPE_LABELS: Record<string, string> = {
  info: "Informativo",
  impediment: "Impedimento",
  delay: "Atraso",
};
