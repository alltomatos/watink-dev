import { useQuery } from "@tanstack/react-query";
import api from "../../services/api";

export interface Queue {
  id: number;
  name: string;
  color: string;
}

export const useQueues = () => {
  return useQuery<Queue[]>({
    queryKey: ["queues"],
    queryFn: async () => {
      const { data } = await api.get("/queue");
      return data;
    },
  });
};

export default useQueues;
