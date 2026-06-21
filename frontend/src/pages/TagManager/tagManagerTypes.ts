export interface Tag {
  id: number;
  name: string;
  color?: string;
  archived?: boolean;
  group?: { name: string };
  description?: string;
  usageCount?: number;
}

export type TagAction =
  | { type: "LOAD_TAGS"; payload: Tag[] }
  | { type: "UPDATE_TAGS"; payload: Tag }
  | { type: "DELETE_TAG"; payload: number }
  | { type: "RESET" };
