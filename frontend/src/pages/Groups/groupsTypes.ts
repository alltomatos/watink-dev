export interface Group {
  id: number;
  name: string;
}

export type GroupsAction =
  | { type: "LOAD_GROUPS"; payload: Group[] }
  | { type: "UPDATE_GROUPS"; payload: Group }
  | { type: "DELETE_GROUP"; payload: number }
  | { type: "RESET" };
