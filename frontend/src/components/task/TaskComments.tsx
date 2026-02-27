import { useEffect, useState, useCallback, useRef } from 'react';
import { Send, Trash2, Pencil, X, Check } from 'lucide-react';
import { commentsApi, type Comment } from '../../api/comments';
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
  const [comments, setComments] = useState<Comment[]>([]);
  const [body, setBody] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editBody, setEditBody] = useState('');
  const [loading, setLoading] = useState(false);

  const commentsEndRef = useRef<HTMLDivElement>(null);

  const fetchComments = useCallback(async () => {
    if (!workspace) return;
    const { data } = await commentsApi.list(workspace.id, taskId);
    setComments(data);
  }, [workspace, taskId]);

  useEffect(() => {
    fetchComments();
  }, [fetchComments]);

  // Real-time comment updates
  useWSEvent('comment.created', (data) => {
    if (data.task_id !== taskId) return;
    const comment = data.comment as Comment;
    setComments((prev) => {
      if (prev.some((c) => c.id === comment.id)) return prev;
      return [...prev, comment];
    });
    setTimeout(() => commentsEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 50);
  }, [taskId]);

  useWSEvent('comment.updated', (data) => {
    if (data.task_id !== taskId) return;
    const comment = data.comment as Comment;
    setComments((prev) => prev.map((c) => (c.id === comment.id ? comment : c)));
  }, [taskId]);

  useWSEvent('comment.deleted', (data) => {
    if (data.task_id !== taskId) return;
    setComments((prev) => prev.filter((c) => c.id !== data.comment_id));
  }, [taskId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!workspace || !body.trim()) return;
    setLoading(true);
    await commentsApi.create(workspace.id, taskId, { body: body.trim() });
    setBody('');
    setLoading(false);
    await fetchComments();
  };

  const handleDelete = async (commentId: string) => {
    if (!workspace) return;
    await commentsApi.delete(workspace.id, taskId, commentId);
    await fetchComments();
  };

  const handleEditSave = async (commentId: string) => {
    if (!workspace || !editBody.trim()) return;
    await commentsApi.update(workspace.id, taskId, commentId, { body: editBody.trim() });
    setEditingId(null);
    await fetchComments();
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
      <label className="block text-xs font-medium mb-2" style={{ color: 'var(--color-text-secondary)' }}>Comments</label>

      {/* Comment list */}
      <div className="space-y-3 mb-3">
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
                <span className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>{formatTime(comment.created_at)}</span>
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
                          onClick={() => { setEditingId(comment.id); setEditBody(comment.body); }}
                          className="p-0.5 hover:opacity-80"
                          style={{ color: 'var(--color-text-secondary)' }}
                        >
                          <Pencil size={14} />
                        </button>
                        <button
                          onClick={() => handleDelete(comment.id)}
                          className="p-0.5 hover:text-[var(--color-danger)]"
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
                  style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-surface)', color: 'var(--color-text)', '--tw-ring-color': 'var(--color-primary)' } as React.CSSProperties}
                  rows={2}
                />
              ) : (
                <p className="text-sm whitespace-pre-wrap mt-0.5" style={{ color: 'var(--color-text)' }}>{comment.body}</p>
              )}
            </div>
          </div>
        ))}
        {comments.length === 0 && (
          <p className="text-xs italic" style={{ color: 'var(--color-text-secondary)' }}>No comments yet</p>
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
          style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-surface)', color: 'var(--color-text)', '--tw-ring-color': 'var(--color-primary)' } as React.CSSProperties}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              handleSubmit(e);
            }
          }}
        />
        <button
          type="submit"
          disabled={!body.trim() || loading}
          className="p-2 text-white rounded-lg disabled:opacity-40 disabled:cursor-not-allowed hover:opacity-90"
          style={{ backgroundColor: 'var(--color-primary)' }}
        >
          <Send size={16} />
        </button>
      </form>
    </div>
  );
}
