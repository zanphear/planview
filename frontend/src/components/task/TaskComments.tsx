import { useEffect, useState, useCallback } from 'react';
import { Send, Trash2, Pencil, X, Check } from 'lucide-react';
import { commentsApi, type Comment } from '../../api/comments';
import { useWorkspaceStore } from '../../stores/workspaceStore';
import { useAuthStore } from '../../stores/authStore';
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

  const fetchComments = useCallback(async () => {
    if (!workspace) return;
    const { data } = await commentsApi.list(workspace.id, taskId);
    setComments(data);
  }, [workspace, taskId]);

  useEffect(() => {
    fetchComments();
  }, [fetchComments]);

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
      <label className="block text-xs font-medium text-gray-500 mb-2">Comments</label>

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
                <span className="text-sm font-medium text-gray-800">
                  {comment.user?.name || 'Unknown'}
                </span>
                <span className="text-xs text-gray-400">{formatTime(comment.created_at)}</span>
                {comment.user_id === user?.id && (
                  <div className="hidden group-hover:flex items-center gap-1 ml-auto">
                    {editingId === comment.id ? (
                      <>
                        <button
                          onClick={() => handleEditSave(comment.id)}
                          className="p-0.5 text-green-500 hover:text-green-700"
                        >
                          <Check size={14} />
                        </button>
                        <button
                          onClick={() => setEditingId(null)}
                          className="p-0.5 text-gray-400 hover:text-gray-600"
                        >
                          <X size={14} />
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          onClick={() => { setEditingId(comment.id); setEditBody(comment.body); }}
                          className="p-0.5 text-gray-400 hover:text-gray-600"
                        >
                          <Pencil size={14} />
                        </button>
                        <button
                          onClick={() => handleDelete(comment.id)}
                          className="p-0.5 text-gray-400 hover:text-red-500"
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
                  className="w-full mt-1 px-2 py-1 text-sm border border-gray-200 rounded resize-none outline-none focus:ring-1 focus:ring-blue-500"
                  rows={2}
                />
              ) : (
                <p className="text-sm text-gray-700 whitespace-pre-wrap mt-0.5">{comment.body}</p>
              )}
            </div>
          </div>
        ))}
        {comments.length === 0 && (
          <p className="text-xs text-gray-400 italic">No comments yet</p>
        )}
      </div>

      {/* Add comment */}
      <form onSubmit={handleSubmit} className="flex gap-2">
        <input
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="Write a comment..."
          className="flex-1 px-3 py-1.5 text-sm border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500"
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
          className="p-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <Send size={16} />
        </button>
      </form>
    </div>
  );
}
