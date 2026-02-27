import { useEffect, useState, useCallback } from 'react';
import { Activity as ActivityIcon, RefreshCw } from 'lucide-react';
import { useWorkspaceStore } from '../stores/workspaceStore';
import { activityApi, type Activity } from '../api/activity';
import { Avatar } from '../components/shared/Avatar';
import { EmptyState } from '../components/shared/EmptyState';
import { SkeletonList } from '../components/shared/Skeleton';

export function ActivityPage() {
  const workspace = useWorkspaceStore((s) => s.currentWorkspace);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);

  const fetchActivities = useCallback(async (offset = 0) => {
    if (!workspace) return;
    const isInitial = offset === 0;
    if (isInitial) setLoading(true);
    else setLoadingMore(true);

    try {
      const { data } = await activityApi.list(workspace.id, { limit: 50, offset });
      if (isInitial) {
        setActivities(data);
      } else {
        setActivities((prev) => [...prev, ...data]);
      }
      setHasMore(data.length === 50);
    } catch {
      // ignore
    }
    setLoading(false);
    setLoadingMore(false);
  }, [workspace]);

  useEffect(() => {
    fetchActivities();
  }, [fetchActivities]);

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold flex items-center gap-2" style={{ color: 'var(--color-text)' }}>
          <ActivityIcon size={22} />
          Activity Feed
        </h2>
        <button
          onClick={() => fetchActivities()}
          className="p-2 rounded-lg hover:bg-[var(--color-grey-2)] transition-colors"
          style={{ color: 'var(--color-text-secondary)' }}
          title="Refresh"
        >
          <RefreshCw size={16} />
        </button>
      </div>

      <div
        className="rounded-xl border"
        style={{ backgroundColor: 'var(--color-surface)', borderColor: 'var(--color-border)' }}
      >
        {loading ? (
          <div className="p-5">
            <SkeletonList rows={8} />
          </div>
        ) : activities.length === 0 ? (
          <EmptyState
            icon={<ActivityIcon size={48} />}
            title="No activity yet"
            description="Actions like creating tasks, updating statuses, and adding comments will appear here."
          />
        ) : (
          <div className="divide-y" style={{ borderColor: 'var(--color-border)' }}>
            {activities.map((a) => (
              <div key={a.id} className="flex items-start gap-3 px-5 py-3.5 hover:bg-[var(--color-grey-1)] transition-colors">
                <Avatar
                  name={a.actor.name}
                  initials={a.actor.initials || undefined}
                  colour={a.actor.colour}
                  size={32}
                />
                <div className="flex-1 min-w-0">
                  <p className="text-sm" style={{ color: 'var(--color-text)' }}>
                    <span className="font-medium">{a.actor.name}</span>
                    {' '}{a.action}{' '}
                    <span className="opacity-70">{a.entity_type}</span>
                    {a.entity_name && (
                      <span className="font-medium"> "{a.entity_name}"</span>
                    )}
                  </p>
                  <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-secondary)' }}>
                    {formatTime(a.created_at)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}

        {hasMore && activities.length > 0 && (
          <div className="px-5 py-3 border-t text-center" style={{ borderColor: 'var(--color-border)' }}>
            <button
              onClick={() => fetchActivities(activities.length)}
              disabled={loadingMore}
              className="text-sm font-medium disabled:opacity-50"
              style={{ color: 'var(--color-primary)' }}
            >
              {loadingMore ? 'Loading...' : 'Load more'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function formatTime(dateStr: string): string {
  const d = new Date(dateStr);
  const now = Date.now();
  const diff = now - d.getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: d.getFullYear() !== new Date().getFullYear() ? 'numeric' : undefined });
}
