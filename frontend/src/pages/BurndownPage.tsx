import { useEffect, useState } from 'react';
import { TrendingDown } from 'lucide-react';
import { useWorkspaceStore } from '../stores/workspaceStore';
import { useProjectStore } from '../stores/projectStore';
import { statsApi, type BurndownPoint } from '../api/stats';
import { LoadingSpinner } from '../components/shared/LoadingSpinner';

export function BurndownPage() {
  const workspace = useWorkspaceStore((s) => s.currentWorkspace);
  const projects = useProjectStore((s) => s.projects);
  const [points, setPoints] = useState<BurndownPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [days, setDays] = useState(30);
  const [projectId, setProjectId] = useState<string>('');

  useEffect(() => {
    if (!workspace) return;
    setLoading(true);
    statsApi
      .burndown(workspace.id, days, projectId || undefined)
      .then((res) => setPoints(res.data.points))
      .catch(() => setPoints([]))
      .finally(() => setLoading(false));
  }, [workspace, days, projectId]);

  if (loading) return <LoadingSpinner />;

  const maxRemaining = Math.max(...points.map((p) => p.remaining), 1);

  return (
    <div className="p-4 sm:p-6 max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <h2 className="text-xl font-bold flex items-center gap-2" style={{ color: 'var(--color-text)' }}>
          <TrendingDown size={22} />
          Burndown Chart
        </h2>
        <div className="flex items-center gap-3">
          <select
            value={projectId}
            onChange={(e) => setProjectId(e.target.value)}
            className="text-sm rounded-lg border px-3 py-1.5"
            style={{
              backgroundColor: 'var(--color-surface)',
              borderColor: 'var(--color-border)',
              color: 'var(--color-text)',
            }}
          >
            <option value="">All Projects</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
          <select
            value={days}
            onChange={(e) => setDays(Number(e.target.value))}
            className="text-sm rounded-lg border px-3 py-1.5"
            style={{
              backgroundColor: 'var(--color-surface)',
              borderColor: 'var(--color-border)',
              color: 'var(--color-text)',
            }}
          >
            <option value={14}>14 days</option>
            <option value={30}>30 days</option>
            <option value={60}>60 days</option>
            <option value={90}>90 days</option>
          </select>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-4">
        <SummaryCard
          label="Total Created"
          value={points.reduce((s, p) => s + p.created, 0)}
          colour="var(--color-primary)"
        />
        <SummaryCard
          label="Total Completed"
          value={points.reduce((s, p) => s + p.completed, 0)}
          colour="var(--color-success)"
        />
        <SummaryCard
          label="Remaining"
          value={points.length > 0 ? points[points.length - 1].remaining : 0}
          colour="var(--color-warning)"
        />
      </div>

      {/* Chart */}
      <div
        className="rounded-xl border p-5"
        style={{ backgroundColor: 'var(--color-surface)', borderColor: 'var(--color-border)' }}
      >
        <div className="relative h-64">
          {/* Y-axis labels */}
          <div className="absolute left-0 top-0 bottom-6 w-10 flex flex-col justify-between text-right pr-2">
            <span className="text-[10px]" style={{ color: 'var(--color-text-secondary)' }}>{maxRemaining}</span>
            <span className="text-[10px]" style={{ color: 'var(--color-text-secondary)' }}>{Math.round(maxRemaining / 2)}</span>
            <span className="text-[10px]" style={{ color: 'var(--color-text-secondary)' }}>0</span>
          </div>

          {/* Chart area */}
          <div className="ml-12 h-full relative">
            <svg viewBox={`0 0 ${points.length} ${maxRemaining}`} className="w-full h-[calc(100%-24px)]" preserveAspectRatio="none">
              {/* Remaining line */}
              <polyline
                fill="none"
                stroke="var(--color-primary)"
                strokeWidth="0.5"
                points={points.map((p, i) => `${i},${maxRemaining - p.remaining}`).join(' ')}
              />
              {/* Remaining area */}
              <polygon
                fill="var(--color-primary)"
                fillOpacity="0.1"
                points={`0,${maxRemaining} ${points.map((p, i) => `${i},${maxRemaining - p.remaining}`).join(' ')} ${points.length - 1},${maxRemaining}`}
              />
              {/* Ideal line */}
              {points.length > 1 && (
                <line
                  x1="0"
                  y1={maxRemaining - (points[0]?.remaining || 0)}
                  x2={points.length - 1}
                  y2={maxRemaining}
                  stroke="var(--color-text-secondary)"
                  strokeWidth="0.3"
                  strokeDasharray="2,2"
                />
              )}
            </svg>

            {/* X-axis labels */}
            <div className="flex justify-between mt-1">
              {points.filter((_, i) => i % Math.ceil(points.length / 6) === 0 || i === points.length - 1).map((p) => (
                <span key={p.date} className="text-[10px]" style={{ color: 'var(--color-text-secondary)' }}>
                  {p.date.slice(5)}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* Legend */}
        <div className="flex items-center gap-6 mt-4 justify-center">
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-0.5 rounded" style={{ backgroundColor: 'var(--color-primary)' }} />
            <span className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>Remaining</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-0.5 rounded border-dashed border-t" style={{ borderColor: 'var(--color-text-secondary)' }} />
            <span className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>Ideal</span>
          </div>
        </div>
      </div>

      {/* Daily table */}
      <div
        className="rounded-xl border overflow-hidden"
        style={{ backgroundColor: 'var(--color-surface)', borderColor: 'var(--color-border)' }}
      >
        <div className="max-h-64 overflow-y-auto">
          <table className="w-full text-sm">
            <thead>
              <tr style={{ backgroundColor: 'var(--color-grey-1)' }}>
                <th className="text-left px-4 py-2 font-medium" style={{ color: 'var(--color-text-secondary)' }}>Date</th>
                <th className="text-right px-4 py-2 font-medium" style={{ color: 'var(--color-text-secondary)' }}>Created</th>
                <th className="text-right px-4 py-2 font-medium" style={{ color: 'var(--color-text-secondary)' }}>Completed</th>
                <th className="text-right px-4 py-2 font-medium" style={{ color: 'var(--color-text-secondary)' }}>Remaining</th>
              </tr>
            </thead>
            <tbody>
              {[...points].reverse().map((p) => (
                <tr key={p.date} className="border-t" style={{ borderColor: 'var(--color-border)' }}>
                  <td className="px-4 py-1.5" style={{ color: 'var(--color-text)' }}>{p.date}</td>
                  <td className="px-4 py-1.5 text-right" style={{ color: p.created > 0 ? 'var(--color-primary)' : 'var(--color-text-secondary)' }}>
                    {p.created > 0 ? `+${p.created}` : '—'}
                  </td>
                  <td className="px-4 py-1.5 text-right" style={{ color: p.completed > 0 ? 'var(--color-success)' : 'var(--color-text-secondary)' }}>
                    {p.completed > 0 ? `+${p.completed}` : '—'}
                  </td>
                  <td className="px-4 py-1.5 text-right font-medium" style={{ color: 'var(--color-text)' }}>{p.remaining}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function SummaryCard({ label, value, colour }: { label: string; value: number; colour: string }) {
  return (
    <div
      className="rounded-xl border p-4 text-center"
      style={{ backgroundColor: 'var(--color-surface)', borderColor: 'var(--color-border)' }}
    >
      <p className="text-2xl font-bold" style={{ color: colour }}>{value}</p>
      <p className="text-xs mt-1" style={{ color: 'var(--color-text-secondary)' }}>{label}</p>
    </div>
  );
}
