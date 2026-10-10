import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { attachmentsApi, type Attachment } from '../attachments';

// ── Query key factory ────────────────────────────────────────────────────────
// ADR 0003. Scoped by taskId so each task-detail panel owns its own file list:
//   attachmentKeys.all                       -> ['attachments']
//   attachmentKeys.lists()                   -> ['attachments', 'list']
//   attachmentKeys.byTask(wsId, taskId)      -> ['attachments', 'list', wsId, taskId]
export const attachmentKeys = {
  all: ['attachments'] as const,
  lists: () => [...attachmentKeys.all, 'list'] as const,
  byTask: (workspaceId: string, taskId: string) =>
    [...attachmentKeys.lists(), workspaceId, taskId] as const,
};

interface RollbackContext {
  previous: Attachment[] | undefined;
}

// ── Queries ──────────────────────────────────────────────────────────────────

/** Attachments for a single task. */
export function useTaskAttachments(workspaceId: string | undefined, taskId: string | undefined) {
  return useQuery({
    queryKey: attachmentKeys.byTask(workspaceId ?? '', taskId ?? ''),
    queryFn: async (): Promise<Attachment[]> =>
      (await attachmentsApi.list(workspaceId!, taskId!)).data,
    enabled: !!workspaceId && !!taskId,
  });
}

// ── Mutations ────────────────────────────────────────────────────────────────

/** Upload one or more files (sequentially, as the panel did), then revalidate. */
export function useUploadAttachments(workspaceId: string | undefined, taskId: string | undefined) {
  const qc = useQueryClient();
  const key = attachmentKeys.byTask(workspaceId ?? '', taskId ?? '');
  return useMutation({
    mutationFn: async (files: File[]) => {
      for (const file of files) {
        await attachmentsApi.upload(workspaceId!, taskId!, file);
      }
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: key });
    },
  });
}

/** Delete an attachment with an optimistic remove + rollback on error. */
export function useDeleteAttachment(workspaceId: string | undefined, taskId: string | undefined) {
  const qc = useQueryClient();
  const key = attachmentKeys.byTask(workspaceId ?? '', taskId ?? '');
  return useMutation({
    mutationFn: async (attachmentId: string) => {
      await attachmentsApi.delete(workspaceId!, taskId!, attachmentId);
      return attachmentId;
    },
    onMutate: async (attachmentId): Promise<RollbackContext> => {
      await qc.cancelQueries({ queryKey: key });
      const previous = qc.getQueryData<Attachment[]>(key);
      qc.setQueryData<Attachment[]>(key, (old) =>
        old ? old.filter((a) => a.id !== attachmentId) : old,
      );
      return { previous };
    },
    onError: (_err, _attachmentId, ctx) => {
      if (ctx?.previous) qc.setQueryData(key, ctx.previous);
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: key });
    },
  });
}
