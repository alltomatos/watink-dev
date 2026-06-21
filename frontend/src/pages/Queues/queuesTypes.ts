export interface Queue {
  id: number;
  name: string;
  color: string | null;
  greetingMessage: string | null;
}

export type QueuesAction =
  | { type: "LOAD_QUEUES"; payload: Queue[] }
  | { type: "UPDATE_QUEUES"; payload: Queue }
  | { type: "DELETE_QUEUE"; payload: number };
