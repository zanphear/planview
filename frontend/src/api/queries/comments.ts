import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { commentsApi, type Comment } from '../comments';

// ── Query key factory ────────────────────────────────────────────────────────
// ADR 0003. Scoped by taskId so each task-detail panel owns its own comment list:
//   commentKeys.all                          -> ['comments']
//   commentKeys.lists()                      -> ['comments', 'list']
//   commentKeys.byTask(wsId, taskId)         -> ['comments', 'list', wsId, taskId]
export const commentKeys = {
  all: ['comments'] as const,
  lists: () => [...commentKeys.all, 'list'] as const,
  byTask: (workspaceId: string, taskId: string) =>
    [...commentKeys.lists(), workspaceId, taskId] as const,
};

type CreateCommentInput = Parameters<typeof commentsApi.create>[2];
type UpdateCommentInput = Parameters<typeof commentsApi.update>[3];

interface RollbackContext {
  previous: Comment[] | undefined;
}

// ── Queries ──────────────────────────────────────────────────────────────────

/** Comments for a single task. */
export function useTaskComments(workspaceId: string | undefined, taskId: string | undefined) {
  return useQuery({
    queryKey: commentKeys.byTask(workspaceId ?? '', taskId ?? ''),
    queryFn: async (): Promise<Comment[]> => (await commentsApi.list(workspaceId!, taskId!)).data,
    enabled: !!workspaceId && !!taskId,
  });
}

// ── Mutations ────────────────────────────────────────────────────────────────

/** Add a comment; merge the server result into the cache, then revalidate. */
export function useCreateComment(workspaceId: string | undefined, taskId: string | undefined) {
  const qc = useQueryClient();
  const key = commentKeys.byTask(workspaceId ?? '', taskId ?? '');
  return useMutation({
    mutationFn: async (data: CreateCommentInput): Promise<Comment> =>
      (await commentsApi.create(workspaceId!, taskId!, data)).data,
    onSuccess: (created) => {
      qc.setQueryData<Comment[]>(key, (old) => {
        if (!old) return [created];
        if (old.some((c) => c.id === created.id)) return old;
        return [...old, created];
      });
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: key });
    },
  });
}

/** Edit a comment body; merge the updated comment into the cache. */
export function useUpdateComment(workspaceId: string | undefined, taskId: string | undefined) {
  const qc = useQueryClient();
  const key = commentKeys.byTask(workspaceId ?? '', taskId ?? '');
  return useMutation({
    mutationFn: async (vars: { commentId: string; data: UpdateCommentInput }): Promise<Comment> =>
      (await commentsApi.update(workspaceId!, taskId!, vars.commentId, vars.data)).data,
    onSuccess: (updated) => {
      qc.setQueryData<Comment[]>(key, (old) =>
        old ? old.map((c) => (c.id === updated.id ? updated : c)) : old,
      );
    },
  });
}

/** Delete a comment with an optimistic remove + rollback on error. */
export function useDeleteComment(workspaceId: string | undefined, taskId: string | undefined) {
  const qc = useQueryClient();
  const key = commentKeys.byTask(workspaceId ?? '', taskId ?? '');
  return useMutation({
    mutationFn: async (commentId: string) => {
      await commentsApi.delete(workspaceId!, taskId!, commentId);
      return commentId;
    },
    onMutate: async (commentId): Promise<RollbackContext> => {
      await qc.cancelQueries({ queryKey: key });
      const previous = qc.getQueryData<Comment[]>(key);
      qc.setQueryData<Comment[]>(key, (old) => (old ? old.filter((c) => c.id !== commentId) : old));
      return { previous };
    },
    onError: (_err, _commentId, ctx) => {
      if (ctx?.previous) qc.setQueryData(key, ctx.previous);
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: key });
    },
  });
}
