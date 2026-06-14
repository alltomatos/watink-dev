import api from "../services/api";
import { useQuery, useQueryClient } from "@tanstack/react-query";

export const useWhatsAppsQuery = () => {
  return useQuery({
    queryKey: ["whatsapp"],
    queryFn: async () => {
      const { data } = await api.get("/whatsapp/");
      return data;
    },
  });
};
