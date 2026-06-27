import { useEffect, useState } from 'react';
import { useWorkspaceStore } from '../stores/workspaceStore';
import { timeEntriesApi, type ResourceUtilisation } from '../api/timeEntries';
import { LoadingSpinner } from '../components/shared/LoadingSpinner';

export function ResourcePage() {
  const workspace = useWorkspaceStore((s) => s.currentWorkspace);
  const [resources, setResources] = useState<ResourceUtilisation[]>([]);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<'week' | 'month' | 'quarter'>('month');

  useEffect(() => {
    if (!workspace) return;
    const now = new Date();
    let since: string;
    if (period === 'week') {
      const d = new Date(now);
      d.setDate(d.getDate() - 7);
      since = d.toISOString().split('T')[0];
    } else if (period === 'month') {
      const d = new Date(now);
      d.setMonth(d.getMonth() - 1);
      since = d.toISOString().split('T')[0];
    } else {
      const d = new Date(now);
      d.setMonth(d.getMonth() - 3);
      since = d.toISOString().split('T')[0];
    }
    const until = now.toISOString().split('T')[0];

    setLoading(true);
    timeEntriesApi
      .resourceUtilisation(workspace.id, { since, until })
      .then(({ data }) => setResources(data))
      .catch(() => setResources([]))
      .finally(() => setLoading(false));
  }, [workspace, period]);

  const fmtDuration = (mins: number) => {
    if (mins === 0) return '0h';
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return m > 0 ? `${h}h ${m}m` : `${h}h`;
  };

  if (loading) return <LoadingSpinner />;

  const totalLogged = resources.reduce((s, r) => s + r.total_minutes_logged, 0);
  const totalEstimated = resources.reduce((s, r) => s + r.total_estimate_minutes, 0);
  const totalActiveTasks = resources.reduce((s, r) => s + r.active_tasks, 0);
  const totalOverdue = resources.reduce((s, r) => s + r.overdue_tasks, 0);

  return (
    <div className="p-4 sm:p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-bold" style={{ color: 'var(--color-text)' }}>
          Resource Utilisation
        </h1>
        <div
          className="flex items-center gap-1 p-0.5 rounded-lg border"
          style={{ borderColor: 'var(--color-border)' }}
        >
          {(['week', 'month', 'quarter'] as const).map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                period === p ? 'text-white' : ''
              }`}
              style={{
                backgroundColor: period === p ? 'var(--color-primary)' : 'transparent',
                color: period === p ? '#fff' : 'var(--color-text-secondary)',
              }}
            >
              {p === 'week' ? 'Week' : p === 'month' ? 'Month' : 'Quarter'}
            </button>
          ))}
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        <div
          className="p-4 rounded-lg border"
          style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-surface)' }}
        >
          <div
            className="text-xs font-medium mb-1"
            style={{ color: 'var(--color-text-secondary)' }}
          >
            Team Members
          </div>
          <div className="text-2xl font-bold" style={{ color: 'var(--color-text)' }}>
            {resources.length}
          </div>
        </div>
        <div
          className="p-4 rounded-lg border"
          style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-surface)' }}
        >
          <div
            className="text-xs font-medium mb-1"
            style={{ color: 'var(--color-text-secondary)' }}
          >
            Total Logged
          </div>
          <div className="text-2xl font-bold" style={{ color: 'var(--color-text)' }}>
            {fmtDuration(totalLogged)}
          </div>
          {totalEstimated > 0 && (
            <div className="text-xs mt-0.5" style={{ color: 'var(--color-text-secondary)' }}>
              of {fmtDuration(totalEstimated)} est.
            </div>
          )}
        </div>
        <div
          className="p-4 rounded-lg border"
          style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-surface)' }}
        >
          <div
            className="text-xs font-medium mb-1"
            style={{ color: 'var(--color-text-secondary)' }}
          >
            Active Tasks
          </div>
          <div className="text-2xl font-bold" style={{ color: 'var(--color-text)' }}>
            {totalActiveTasks}
          </div>
        </div>
        <div
          className="p-4 rounded-lg border"
          style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-surface)' }}
        >
          <div
            className="text-xs font-medium mb-1"
            style={{ color: 'var(--color-text-secondary)' }}
          >
            Overdue
          </div>
          <div
            className="text-2xl font-bold"
            style={{
              color: totalOverdue > 0 ? 'var(--color-danger, #ef4444)' : 'var(--color-text)',
            }}
          >
            {totalOverdue}
          </div>
        </div>
      </div>

      {/* Member table */}
      {resources.length > 0 ? (
        <div
          className="border rounded-lg overflow-hidden"
          style={{ borderColor: 'var(--color-border)' }}
        >
          <table className="w-full">
            <thead>
              <tr style={{ backgroundColor: 'var(--color-grey-1)' }}>
                <th
                  className="text-left text-xs font-medium px-4 py-3"
                  style={{ color: 'var(--color-text-secondary)' }}
                >
                  Member
                </th>
                <th
                  className="text-center text-xs font-medium px-4 py-3"
                  style={{ color: 'var(--color-text-secondary)' }}
                >
                  Active Tasks
                </th>
                <th
                  className="text-center text-xs font-medium px-4 py-3"
                  style={{ color: 'var(--color-text-secondary)' }}
                >
                  Overdue
                </th>
                <th
                  className="text-center text-xs font-medium px-4 py-3"
                  style={{ color: 'var(--color-text-secondary)' }}
                >
                  Time Logged
                </th>
                <th
                  className="text-center text-xs font-medium px-4 py-3"
                  style={{ color: 'var(--color-text-secondary)' }}
                >
                  Estimated
                </th>
                <th
                  className="text-left text-xs font-medium px-4 py-3 w-48"
                  style={{ color: 'var(--color-text-secondary)' }}
                >
                  Utilisation
                </th>
              </tr>
            </thead>
            <tbody>
              {resources.map((r) => {
                const pct =
                  r.total_estimate_minutes > 0
                    ? Math.round((r.total_minutes_logged / r.total_estimate_minutes) * 100)
                    : 0;
                const barPct = Math.min(100, pct);

                return (
                  <tr
                    key={r.user_id}
                    className="border-t"
                    style={{ borderColor: 'var(--color-border)' }}
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        {r.user_avatar_url ? (
                          <img
                            src={r.user_avatar_url}
                            alt=""
                            className="w-8 h-8 rounded-full object-cover"
                          />
                        ) : (
                          <div
                            className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium text-white"
                            style={{ backgroundColor: r.user_colour }}
                          >
                            {r.user_initials || r.user_name?.charAt(0)}
                          </div>
                        )}
                        <span
                          className="text-sm font-medium"
                          style={{ color: 'var(--color-text)' }}
                        >
                          {r.user_name}
                        </span>
                      </div>
                    </td>
                    <td
                      className="px-4 py-3 text-center text-sm"
                      style={{ color: 'var(--color-text)' }}
                    >
                      {r.active_tasks}
                    </td>
                    <td
                      className="px-4 py-3 text-center text-sm"
                      style={{
                        color:
                          r.overdue_tasks > 0
                            ? 'var(--color-danger, #ef4444)'
                            : 'var(--color-text)',
                      }}
                    >
                      {r.overdue_tasks}
                    </td>
                    <td
                      className="px-4 py-3 text-center text-sm"
                      style={{ color: 'var(--color-text)' }}
                    >
                      {fmtDuration(r.total_minutes_logged)}
                    </td>
                    <td
                      className="px-4 py-3 text-center text-sm"
                      style={{ color: 'var(--color-text-secondary)' }}
                    >
                      {fmtDuration(r.total_estimate_minutes)}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div
                          className="flex-1 h-2 rounded-full overflow-hidden"
                          style={{ backgroundColor: 'var(--color-grey-2)' }}
                        >
                          <div
                            className="h-full rounded-full transition-colors"
                            style={{
                              width: `${barPct}%`,
                              backgroundColor:
                                pct > 100
                                  ? 'var(--color-danger, #ef4444)'
                                  : pct > 80
                                    ? '#f59e0b'
                                    : 'var(--color-primary)',
                            }}
                          />
                        </div>
                        <span
                          className="text-xs font-medium w-10 text-right"
                          style={{ color: 'var(--color-text-secondary)' }}
                        >
                          {pct}%
                        </span>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="text-center py-12">
          <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
            No resource data for this period. Assign tasks and log time to see utilisation.
          </p>
        </div>
      )}
    </div>
  );
}
