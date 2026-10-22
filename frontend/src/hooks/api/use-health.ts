import { useQuery } from "@tanstack/react-query";
import { getHealth } from "@/api/health";
import { queryKeys } from "./query-keys";

export function useHealth(enabled: boolean) {
  return useQuery({ queryKey: queryKeys.health, queryFn: getHealth, enabled });
}
