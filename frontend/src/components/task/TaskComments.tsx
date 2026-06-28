import { useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Send, Trash2, Pencil, X, Check } from 'lucide-react';
import { type Comment } from '../../api/comments';
import {
  commentKeys,
  useTaskComments,
  useCreateComment,
  useUpdateComment,
  useDeleteComment,
} from '../../api/queries/comments';
import { useWorkspaceStore } from '../../stores/workspaceStore';
import { useAuthStore } from '../../stores/authStore';
import { useWSEvent } from '../../hooks/WebSocketContext';
import { Avatar } from '../shared/Avatar';

interface TaskCommentsProps {
  taskId: string;
}

export function TaskComments({ taskId }: TaskCommentsProps) {
  const workspace = useWorkspaceStore((s) => s.currentWorkspace);
  const user = useAuthStore((s) => s.user);
  const qc = useQueryClient();
  const [body, setBody] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editBody, setEditBody] = useState('');

  const commentsEndRef = useRef<HTMLDivElement>(null);

  const commentsQuery = useTaskComments(workspace?.id, taskId);
  const comments = commentsQuery.data ?? [];
  const createComment = useCreateComment(workspace?.id, taskId);
  const updateComment = useUpdateComment(workspace?.id, taskId);
  const deleteComment = useDeleteComment(workspace?.id, taskId);

  const cacheKey = commentKeys.byTask(workspace?.id ?? '', taskId);

  // Real-time comment updates — patch the query cache so all readers stay in sync.
  useWSEvent(
    'comment.created',
    (data) => {
      if (data.task_id !== taskId) return;
      const comment = data.comment as Comment;
      qc.setQueryData<Comment[]>(cacheKey, (prev) => {
        if (!prev) return [comment];
        if (prev.some((c) => c.id === comment.id)) return prev;
        return [...prev, comment];
      });
      setTimeout(() => commentsEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 50);
    },
    [taskId, cacheKey],
  );

  useWSEvent(
    'comment.updated',
    (data) => {
      if (data.task_id !== taskId) return;
      const comment = data.comment as Comment;
      qc.setQueryData<Comment[]>(cacheKey, (prev) =>
        prev ? prev.map((c) => (c.id === comment.id ? comment : c)) : prev,
      );
    },
    [taskId, cacheKey],
  );

  useWSEvent(
    'comment.deleted',
    (data) => {
      if (data.task_id !== taskId) return;
      qc.setQueryData<Comment[]>(cacheKey, (prev) =>
        prev ? prev.filter((c) => c.id !== data.comment_id) : prev,
      );
    },
    [taskId, cacheKey],
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!workspace || !body.trim()) return;
    const trimmed = body.trim();
    setBody('');
    try {
      await createComment.mutateAsync({ body: trimmed });
    } catch {
      setBody(trimmed);
    }
  };

  const handleDelete = (commentId: string) => {
    if (!workspace) return;
    deleteComment.mutate(commentId);
  };

  const handleEditSave = async (commentId: string) => {
    if (!workspace || !editBody.trim()) return;
    await updateComment.mutateAsync({ commentId, data: { body: editBody.trim() } });
    setEditingId(null);
  };

  const formatTime = (iso: string) => {
    const d = new Date(iso);
    const now = new Date();
    const diff = now.getTime() - d.getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'just now';
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    if (days < 7) return `${days}d ago`;
    return d.toLocaleDateString();
  };

  return (
    <div>
      <label
        className="block text-xs font-medium mb-2"
        style={{ color: 'var(--color-text-secondary)' }}
      >
        Comments
      </label>

      {/* Comment list */}
      <div className="space-y-3 mb-3">
        {commentsQuery.isPending ? (
          <p className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>
            Loading comments…
          </p>
        ) : commentsQuery.isError ? (
          <div className="flex items-center gap-2 text-xs" style={{ color: 'var(--color-danger)' }}>
            <span>Could not load comments.</span>
            <button
              onClick={() => commentsQuery.refetch()}
              className="underline"
              style={{ color: 'var(--color-primary)' }}
            >
              Retry
            </button>
          </div>
        ) : null}
        {comments.map((comment) => (
          <div key={comment.id} className="flex gap-2.5 group">
            <Avatar
              name={comment.user?.name || '?'}
              colour={comment.user?.colour || '#999'}
              size={28}
            />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium" style={{ color: 'var(--color-text)' }}>
                  {comment.user?.name || 'Unknown'}
                </span>
                <span className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>
                  {formatTime(comment.created_at)}
                </span>
                {comment.user_id === user?.id && (
                  <div className="hidden group-hover:flex items-center gap-1 ml-auto">
                    {editingId === comment.id ? (
                      <>
                        <button
                          onClick={() => handleEditSave(comment.id)}
                          className="p-0.5"
                          style={{ color: 'var(--color-success)' }}
                        >
                          <Check size={14} />
                        </button>
                        <button
                          onClick={() => setEditingId(null)}
                          className="p-0.5"
                          style={{ color: 'var(--color-text-secondary)' }}
                        >
                          <X size={14} />
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          onClick={() => {
                            setEditingId(comment.id);
                            setEditBody(comment.body);
                          }}
                          className="p-0.5 hover:opacity-80"
                          style={{ color: 'var(--color-text-secondary)' }}
                        >
                          <Pencil size={14} />
                        </button>
                        <button
                          onClick={() => handleDelete(comment.id)}
                          className="p-0.5 hover:text-destructive"
                          style={{ color: 'var(--color-text-secondary)' }}
                        >
                          <Trash2 size={14} />
                        </button>
                      </>
                    )}
                  </div>
                )}
              </div>
              {editingId === comment.id ? (
                <textarea
                  autoFocus
                  value={editBody}
                  onChange={(e) => setEditBody(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleEditSave(comment.id);
                    }
                    if (e.key === 'Escape') setEditingId(null);
                  }}
                  className="w-full mt-1 px-2 py-1 text-sm border rounded resize-none outline-none focus:ring-1"
                  style={
                    {
                      borderColor: 'var(--color-border)',
                      backgroundColor: 'var(--color-surface)',
                      color: 'var(--color-text)',
                      '--tw-ring-color': 'var(--color-primary)',
                    } as React.CSSProperties
                  }
                  rows={2}
                />
              ) : (
                <p
                  className="text-sm whitespace-pre-wrap mt-0.5"
                  style={{ color: 'var(--color-text)' }}
                >
                  {comment.body}
                </p>
              )}
            </div>
          </div>
        ))}
        {commentsQuery.isSuccess && comments.length === 0 && (
          <p className="text-xs italic" style={{ color: 'var(--color-text-secondary)' }}>
            No comments yet
          </p>
        )}
        <div ref={commentsEndRef} />
      </div>

      {/* Add comment */}
      <form onSubmit={handleSubmit} className="flex gap-2">
        <input
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="Write a comment..."
          className="flex-1 px-3 py-1.5 text-sm border rounded-lg outline-none focus:ring-2"
          style={
            {
              borderColor: 'var(--color-border)',
              backgroundColor: 'var(--color-surface)',
              color: 'var(--color-text)',
              '--tw-ring-color': 'var(--color-primary)',
            } as React.CSSProperties
          }
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              handleSubmit(e);
            }
          }}
        />
        <button
          type="submit"
          disabled={!body.trim() || createComment.isPending}
          className="p-2 text-white rounded-lg disabled:opacity-40 disabled:cursor-not-allowed hover:opacity-90"
          style={{ backgroundColor: 'var(--color-primary)' }}
        >
          <Send size={16} />
        </button>
      </form>
    </div>
  );
}
