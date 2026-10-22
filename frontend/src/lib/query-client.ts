import { QueryClient } from "@tanstack/react-query";
import { ApiError } from "@/api/client";

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      refetchOnWindowFocus: false,
      // Retrying a 404 or a validation error only delays the message.
      retry: (count, error) =>
        count < 2 && !(error instanceof ApiError && error.status >= 400 && error.status < 500),
    },
  },
});
