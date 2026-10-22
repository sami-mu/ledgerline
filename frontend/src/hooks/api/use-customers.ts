import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { searchCustomers } from "@/api/customers";
import { queryKeys } from "./query-keys";

export function useCustomerSearch(q: string, enabled: boolean) {
  return useQuery({
    queryKey: queryKeys.customers(q),
    queryFn: ({ signal }) => searchCustomers(q, 6, signal),
    enabled,
    placeholderData: keepPreviousData,
    staleTime: 60_000,
  });
}
