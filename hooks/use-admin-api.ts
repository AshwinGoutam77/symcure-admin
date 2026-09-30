"use client";

import {
  useMutation,
  useQuery,
  useQueryClient,
  type QueryKey,
  type UseMutationOptions,
  type UseQueryOptions,
} from "@tanstack/react-query";
import { ApiError } from "@/lib/api/client";

export function useAdminQuery<TData = unknown, TError = ApiError | Error>(
  queryFn: () => Promise<TData>,
  queryKey: QueryKey,
  enabled = true,
  options?: Omit<UseQueryOptions<TData, TError>, "queryKey" | "queryFn" | "enabled">,
) {
  return useQuery<TData, TError>({
    queryKey,
    queryFn,
    enabled,
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
    refetchOnWindowFocus: false,
    retry: 1,
    ...options,
  });
}

export function useAdminMutation<TArgs = void, TResult = unknown>(
  mutationFn: (args: TArgs) => Promise<TResult>,
  options?: Omit<UseMutationOptions<TResult, ApiError | Error, TArgs>, "mutationFn">,
) {
  const queryClient = useQueryClient();

  return useMutation<TResult, ApiError | Error, TArgs>({
    mutationFn,
    ...options,
    onSuccess: async (data, variables, onMutateResult, context) => {
      await options?.onSuccess?.(data, variables, onMutateResult, context);
      // Admin mutations can change dashboard/list/detail data. Invalidate the
      // admin cache so every screen stays consistent without manual refetches.
      await queryClient.invalidateQueries({ queryKey: ["admin"] });
    },
  });
}
