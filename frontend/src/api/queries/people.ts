import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { peopleApi, type PersonProfile, type OrgChartNode } from '../people';
import { authApi, membersApi, type User } from '../users';

// ── Query key factory ────────────────────────────────────────────────────────
// ADR 0003. Hierarchical so we can invalidate one workspace's profile list, the
// whole 'profiles' domain, or everything under 'people':
//   peopleKeys.all                       -> ['people']
//   peopleKeys.profileLists()            -> ['people', 'profiles']
//   peopleKeys.profileList(wsId)         -> ['people', 'profiles', wsId]
//   peopleKeys.orgChart(wsId)            -> ['people', 'org-chart', wsId]
//   peopleKeys.members(wsId)             -> ['people', 'members', wsId]
//   peopleKeys.currentUser()             -> ['people', 'current-user']
export const peopleKeys = {
  all: ['people'] as const,
  profileLists: () => [...peopleKeys.all, 'profiles'] as const,
  profileList: (workspaceId: string) => [...peopleKeys.profileLists(), workspaceId] as const,
  orgChart: (workspaceId: string) => [...peopleKeys.all, 'org-chart', workspaceId] as const,
  members: (workspaceId: string) => [...peopleKeys.all, 'members', workspaceId] as const,
  currentUser: () => [...peopleKeys.all, 'current-user'] as const,
};

type UpdateProfileInput = Parameters<typeof peopleApi.update>[2];
type CreateProfileInput = Parameters<typeof peopleApi.create>[2];

// ── Queries ──────────────────────────────────────────────────────────────────

/** Every person profile in a workspace (the directory's primary server data). */
export function useProfiles(workspaceId: string | undefined) {
  return useQuery({
    queryKey: peopleKeys.profileList(workspaceId ?? ''),
    queryFn: async (): Promise<PersonProfile[]> => (await peopleApi.list(workspaceId!)).data,
    enabled: !!workspaceId,
  });
}

/** Reporting hierarchy for the org-chart view. */
export function useOrgChart(workspaceId: string | undefined) {
  return useQuery({
    queryKey: peopleKeys.orgChart(workspaceId ?? ''),
    queryFn: async (): Promise<OrgChartNode[]> => (await peopleApi.getOrgChart(workspaceId!)).data,
    enabled: !!workspaceId,
  });
}

/** Workspace members, used to offer profile creation for people without one. */
export function useWorkspaceMembers(workspaceId: string | undefined) {
  return useQuery({
    queryKey: peopleKeys.members(workspaceId ?? ''),
    queryFn: async (): Promise<User[]> => (await membersApi.list(workspaceId!)).data,
    enabled: !!workspaceId,
  });
}

/** The signed-in user, used to gate manager-only insights and edit rights. */
export function useCurrentUser() {
  return useQuery({
    queryKey: peopleKeys.currentUser(),
    queryFn: async (): Promise<User> => (await authApi.me()).data,
  });
}

// ── Mutations ────────────────────────────────────────────────────────────────
// The old store merged each server result back into its profile array. The
// faithful translation is to merge into the profile-list cache so the directory,
// stats and charts stay in sync. Each mutation returns the server profile so
// callers can keep their local detail copy in step.

function mergeProfile(
  qc: ReturnType<typeof useQueryClient>,
  workspaceId: string,
  profile: PersonProfile,
) {
  qc.setQueryData<PersonProfile[]>(peopleKeys.profileList(workspaceId), (old) =>
    old ? old.map((p) => (p.id === profile.id ? profile : p)) : old,
  );
}

/** Update a profile's details, merging the server result into the list cache. */
export function useUpdateProfile(workspaceId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (vars: { userId: string; data: UpdateProfileInput }) =>
      (await peopleApi.update(workspaceId!, vars.userId, vars.data)).data,
    onSuccess: (updated) => mergeProfile(qc, workspaceId ?? '', updated),
  });
}

/** Upload a new avatar, merging the returned profile into the list cache. */
export function useUploadProfileAvatar(workspaceId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (vars: { userId: string; file: File }) =>
      (await peopleApi.uploadAvatar(workspaceId!, vars.userId, vars.file)).data,
    onSuccess: (updated) => mergeProfile(qc, workspaceId ?? '', updated),
  });
}

/** Create a profile for a member, appending it to the list cache. */
export function useCreateProfile(workspaceId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (vars: { userId: string; data: CreateProfileInput }) =>
      (await peopleApi.create(workspaceId!, vars.userId, vars.data)).data,
    onSuccess: (created) => {
      qc.setQueryData<PersonProfile[]>(peopleKeys.profileList(workspaceId ?? ''), (old) =>
        old ? [...old, created] : [created],
      );
      qc.invalidateQueries({ queryKey: peopleKeys.orgChart(workspaceId ?? '') });
    },
  });
}
