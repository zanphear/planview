import { QueryClient } from '@tanstack/react-query';

// Single shared QueryClient (ADR 0003). Server state lives here, not in Zustand.
// Sane defaults: short stale window so collaborative data stays fresh, one retry,
// no refetch storm on window focus for a LAN tool.
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      gcTime: 5 * 60_000,
      retry: 1,
      refetchOnWindowFocus: false,
    },
    mutations: {
      retry: 0,
    },
  },
});
