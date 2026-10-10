import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { leaveApi, type LeaveRequest, type LeaveAllowance } from '../leave';
import { membersApi, type User } from '../users';

// ── Query key factory ────────────────────────────────────────────────────────
// ADR 0003. Hierarchical so we can invalidate one filtered list, a whole domain
// (requests / allowances), or everything under 'leave':
//   leaveKeys.all                              -> ['leave']
//   leaveKeys.requestLists()                   -> ['leave', 'requests']
//   leaveKeys.requestList(wsId, params)        -> ['leave', 'requests', wsId, params]
//   leaveKeys.allowanceLists()                 -> ['leave', 'allowances']
//   leaveKeys.allowanceList(wsId, params)      -> ['leave', 'allowances', wsId, params]
//   leaveKeys.members(wsId)                     -> ['leave', 'members', wsId]
export const leaveKeys = {
  all: ['leave'] as const,
  requestLists: () => [...leaveKeys.all, 'requests'] as const,
  requestList: (workspaceId: string, params: { user_id?: string; status?: string }) =>
    [...leaveKeys.requestLists(), workspaceId, params] as const,
  allowanceLists: () => [...leaveKeys.all, 'allowances'] as const,
  allowanceList: (workspaceId: string, params: { user_id?: string; year?: number }) =>
    [...leaveKeys.allowanceLists(), workspaceId, params] as const,
  members: (workspaceId: string) => [...leaveKeys.all, 'members', workspaceId] as const,
};

type CreateRequestInput = Parameters<typeof leaveApi.createRequest>[1];
type CreateAllowanceInput = Parameters<typeof leaveApi.createAllowance>[1];
type UpdateRequestInput = Parameters<typeof leaveApi.updateRequest>[2];

// ── Queries ──────────────────────────────────────────────────────────────────

/** Leave requests for a workspace, optionally filtered by status / user. */
export function useLeaveRequests(
  workspaceId: string | undefined,
  params: { user_id?: string; status?: string } = {},
) {
  return useQuery({
    queryKey: leaveKeys.requestList(workspaceId ?? '', params),
    queryFn: async (): Promise<LeaveRequest[]> =>
      (await leaveApi.listRequests(workspaceId!, params)).data,
    enabled: !!workspaceId,
  });
}

/** Leave allowances for a workspace / year. */
export function useLeaveAllowances(
  workspaceId: string | undefined,
  params: { user_id?: string; year?: number } = {},
) {
  return useQuery({
    queryKey: leaveKeys.allowanceList(workspaceId ?? '', params),
    queryFn: async (): Promise<LeaveAllowance[]> =>
      (await leaveApi.listAllowances(workspaceId!, params)).data,
    enabled: !!workspaceId,
  });
}

/** Workspace members, used to resolve names/avatars on requests & allowances. */
export function useLeaveMembers(workspaceId: string | undefined) {
  return useQuery({
    queryKey: leaveKeys.members(workspaceId ?? ''),
    queryFn: async (): Promise<User[]> => (await membersApi.list(workspaceId!)).data,
    enabled: !!workspaceId,
  });
}

// ── Mutations ────────────────────────────────────────────────────────────────
// No optimistic UI on this page today (it reloaded everything after each write),
// so a plain invalidate is the faithful, correct translation.

/** Create a leave request, then revalidate request + allowance lists. */
export function useCreateLeaveRequest(workspaceId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: CreateRequestInput) =>
      (await leaveApi.createRequest(workspaceId!, data)).data,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: leaveKeys.requestLists() });
      qc.invalidateQueries({ queryKey: leaveKeys.allowanceLists() });
    },
  });
}

/**
 * Update a leave request (approve / reject / edit). Revalidates request lists
 * and allowance lists (a status change moves booked/used days).
 */
export function useUpdateLeaveRequest(workspaceId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (vars: { requestId: string; data: UpdateRequestInput }) =>
      (await leaveApi.updateRequest(workspaceId!, vars.requestId, vars.data)).data,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: leaveKeys.requestLists() });
      qc.invalidateQueries({ queryKey: leaveKeys.allowanceLists() });
    },
  });
}

/** Create / set an allowance, then revalidate allowance lists. */
export function useCreateLeaveAllowance(workspaceId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: CreateAllowanceInput) =>
      (await leaveApi.createAllowance(workspaceId!, data)).data,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: leaveKeys.allowanceLists() });
    },
  });
}
