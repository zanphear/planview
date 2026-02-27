import { useEffect, useState } from 'react';
import { NavLink } from 'react-router-dom';
import {
  Clock, AlertTriangle, Users, FolderKanban,
  TrendingUp, Inbox, CalendarDays, Activity,
} from 'lucide-react';
import { useWorkspaceStore } from '../stores/workspaceStore';
import { useAuthStore } from '../stores/authStore';
import { statsApi, type WorkspaceStats } from '../api/stats';
import { activityApi, type Activity as ActivityType } from '../api/activity';
import { Avatar } from '../components/shared/Avatar';

function StatCard({
  label,
  value,
  icon,
  colour,
  sub,
}: {
  label: string;
  value: number;
  icon: React.ReactNode;
  colour: string;
  sub?: string;
}) {
  return (
    <div
      className="rounded-xl border p-4 flex items-start gap-3"
      style={{ backgroundColor: 'var(--color-surface)', borderColor: 'var(--color-border)' }}
    >
      <div
        className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0"
        style={{ backgroundColor: colour + '18', color: colour }}
      >
        {icon}
      </div>
      <div>
        <p className="text-2xl font-bold" style={{ color: 'var(--color-text)' }}>{value}</p>
        <p className="text-xs font-medium" style={{ color: 'var(--color-text-secondary)' }}>{label}</p>
        {sub && (
          <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-secondary)' }}>{sub}</p>
        )}
      </div>
    </div>
  );
}

function ProgressBar({ total, completed, colour }: { total: number; completed: number; colour: string }) {
  const pct = total > 0 ? Math.round((completed / total) * 100) : 0;
  return (
    <div className="flex items-center gap-2 flex-1">
      <div className="flex-1 h-2 rounded-full overflow-hidden" style={{ backgroundColor: 'var(--color-grey-2)' }}>
        <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: colour }} />
      </div>
      <span className="text-xs font-medium w-8 text-right" style={{ color: 'var(--color-text-secondary)' }}>
        {pct}%
      </span>
    </div>
  );
}

export function DashboardPage() {
  const workspace = useWorkspaceStore((s) => s.currentWorkspace);
  const user = useAuthStore((s) => s.user);
  const [stats, setStats] = useState<WorkspaceStats | null>(null);
  const [activities, setActivities] = useState<ActivityType[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!workspace) return;
    setLoading(true);
    Promise.all([
      statsApi.get(workspace.id),
      activityApi.list(workspace.id, { limit: 15 }),
    ]).then(([statsRes, actRes]) => {
      setStats(statsRes.data);
      setActivities(actRes.data);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [workspace]);

  if (loading || !stats) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-pulse text-sm" style={{ color: 'var(--color-text-secondary)' }}>
          Loading dashboard...
        </div>
      </div>
    );
  }

  const todo = stats.by_status['todo'] || 0;
  const inProgress = stats.by_status['in_progress'] || 0;
  const done = stats.by_status['done'] || 0;

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      {/* Greeting */}
      <div>
        <h2 className="text-2xl font-bold" style={{ color: 'var(--color-text)' }}>
          {getGreeting()}, {user?.name?.split(' ')[0] || 'there'}
        </h2>
        <p className="text-sm mt-1" style={{ color: 'var(--color-text-secondary)' }}>
          Here's what's happening across your workspace.
        </p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Total Tasks" value={stats.total_tasks} icon={<Inbox size={20} />} colour="var(--color-primary)" />
        <StatCard label="Overdue" value={stats.overdue} icon={<AlertTriangle size={20} />} colour="var(--color-danger)" sub={stats.overdue > 0 ? 'Needs attention' : 'All on track'} />
        <StatCard label="Due This Week" value={stats.due_this_week} icon={<CalendarDays size={20} />} colour="var(--color-warning)" />
        <StatCard label="Unassigned" value={stats.unassigned} icon={<Users size={20} />} colour="var(--color-teal)" />
      </div>

      {/* Status breakdown + activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Status breakdown */}
        <div
          className="rounded-xl border p-5"
          style={{ backgroundColor: 'var(--color-surface)', borderColor: 'var(--color-border)' }}
        >
          <h3 className="text-sm font-semibold mb-4 flex items-center gap-2" style={{ color: 'var(--color-text)' }}>
            <TrendingUp size={16} />
            Task Status
          </h3>
          <div className="space-y-3">
            <StatusRow label="To Do" count={todo} total={stats.total_tasks} colour="var(--color-text-secondary)" />
            <StatusRow label="In Progress" count={inProgress} total={stats.total_tasks} colour="var(--color-primary)" />
            <StatusRow label="Done" count={done} total={stats.total_tasks} colour="var(--color-success)" />
          </div>
        </div>

        {/* This week activity */}
        <div
          className="rounded-xl border p-5"
          style={{ backgroundColor: 'var(--color-surface)', borderColor: 'var(--color-border)' }}
        >
          <h3 className="text-sm font-semibold mb-4 flex items-center gap-2" style={{ color: 'var(--color-text)' }}>
            <Clock size={16} />
            This Week
          </h3>
          <div className="grid grid-cols-2 gap-4">
            <div className="text-center p-4 rounded-lg" style={{ backgroundColor: 'var(--color-grey-1)' }}>
              <p className="text-3xl font-bold" style={{ color: 'var(--color-primary)' }}>{stats.created_this_week}</p>
              <p className="text-xs mt-1" style={{ color: 'var(--color-text-secondary)' }}>Created</p>
            </div>
            <div className="text-center p-4 rounded-lg" style={{ backgroundColor: 'var(--color-grey-1)' }}>
              <p className="text-3xl font-bold" style={{ color: 'var(--color-success)' }}>{stats.completed_this_week}</p>
              <p className="text-xs mt-1" style={{ color: 'var(--color-text-secondary)' }}>Completed</p>
            </div>
          </div>
        </div>
      </div>

      {/* Projects */}
      {stats.projects.length > 0 && (
        <div
          className="rounded-xl border p-5"
          style={{ backgroundColor: 'var(--color-surface)', borderColor: 'var(--color-border)' }}
        >
          <h3 className="text-sm font-semibold mb-4 flex items-center gap-2" style={{ color: 'var(--color-text)' }}>
            <FolderKanban size={16} />
            Projects
          </h3>
          <div className="space-y-3">
            {stats.projects.map((p) => (
              <NavLink
                key={p.id}
                to={`/projects/${p.id}/board`}
                className="flex items-center gap-3 p-2 -mx-2 rounded-lg hover:bg-[var(--color-grey-1)] transition-colors"
              >
                <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: p.colour }} />
                <span className="text-sm font-medium flex-1 truncate" style={{ color: 'var(--color-text)' }}>
                  {p.name}
                </span>
                <span className="text-xs shrink-0" style={{ color: 'var(--color-text-secondary)' }}>
                  {p.completed}/{p.total} done
                </span>
                <ProgressBar total={p.total} completed={p.completed} colour={p.colour} />
              </NavLink>
            ))}
          </div>
        </div>
      )}

      {/* Team workload + Activity feed side by side */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {stats.workload.length > 0 && (
          <div
            className="rounded-xl border p-5"
            style={{ backgroundColor: 'var(--color-surface)', borderColor: 'var(--color-border)' }}
          >
            <h3 className="text-sm font-semibold mb-4 flex items-center gap-2" style={{ color: 'var(--color-text)' }}>
              <Users size={16} />
              Team Workload
            </h3>
            <div className="space-y-3">
              {stats.workload.map((w) => (
                <div key={w.id} className="flex items-center gap-3">
                  <div
                    className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-medium shrink-0"
                    style={{ backgroundColor: w.colour }}
                  >
                    {w.name.split(' ').map((n) => n[0]).join('').slice(0, 2)}
                  </div>
                  <span className="text-sm font-medium w-28 truncate" style={{ color: 'var(--color-text)' }}>
                    {w.name}
                  </span>
                  <ProgressBar total={w.total} completed={w.completed} colour={w.colour} />
                  <span className="text-xs shrink-0 w-16 text-right" style={{ color: 'var(--color-text-secondary)' }}>
                    {w.total} tasks
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Recent Activity */}
        <div
          className="rounded-xl border p-5"
          style={{ backgroundColor: 'var(--color-surface)', borderColor: 'var(--color-border)' }}
        >
          <h3 className="text-sm font-semibold mb-4 flex items-center gap-2" style={{ color: 'var(--color-text)' }}>
            <Activity size={16} />
            Recent Activity
          </h3>
          {activities.length === 0 ? (
            <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
              No activity yet. Start creating and updating tasks!
            </p>
          ) : (
            <div className="space-y-3 max-h-72 overflow-y-auto">
              {activities.map((a) => (
                <div key={a.id} className="flex items-start gap-2.5">
                  <Avatar
                    name={a.actor.name}
                    initials={a.actor.initials || undefined}
                    colour={a.actor.colour}
                    size={24}
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs" style={{ color: 'var(--color-text)' }}>
                      <span className="font-medium">{a.actor.name}</span>
                      {' '}{a.action}{' '}
                      {a.entity_type}
                      {a.entity_name && (
                        <span className="font-medium"> "{a.entity_name}"</span>
                      )}
                    </p>
                    <p className="text-[10px]" style={{ color: 'var(--color-text-secondary)' }}>
                      {formatRelativeTime(a.created_at)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function StatusRow({ label, count, total, colour }: { label: string; count: number; total: number; colour: string }) {
  const pct = total > 0 ? Math.round((count / total) * 100) : 0;
  return (
    <div className="flex items-center gap-3">
      <span className="text-sm w-24" style={{ color: 'var(--color-text)' }}>{label}</span>
      <div className="flex-1 h-2.5 rounded-full overflow-hidden" style={{ backgroundColor: 'var(--color-grey-2)' }}>
        <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: colour }} />
      </div>
      <span className="text-xs font-medium w-8 text-right" style={{ color: 'var(--color-text-secondary)' }}>{count}</span>
    </div>
  );
}

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

function formatRelativeTime(dateStr: string): string {
  const now = Date.now();
  const diff = now - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString();
}
