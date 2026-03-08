import { useState, useEffect } from 'react';
import { BarChart3, Users, Target, Shield, Award, Calendar, UserPlus, GraduationCap, ClipboardCheck, Heart, ClipboardList, MessageSquare } from 'lucide-react';
import { useWorkspaceStore } from '../stores/workspaceStore';
import { useAuthStore } from '../stores/authStore';
import { statsApi } from '../api/stats';
import type { PeopleStats } from '../api/stats';
import { DonutChart } from '../components/charts/DonutChart';
import { BarChart } from '../components/charts/BarChart';
import { ProgressRing } from '../components/charts/ProgressRing';
import { COLOURS, STATUS_COLOURS } from '../utils/colours';

export function ReportingPage() {
  const workspace = useWorkspaceStore((s) => s.currentWorkspace);
  const user = useAuthStore((s) => s.user);
  const [data, setData] = useState<PeopleStats | null>(null);
  const [loading, setLoading] = useState(true);

  const enabledModules = workspace?.enabled_modules;
  const defaults: Record<string, boolean> = {
    one_to_ones: true, objectives: true, compliance: true, competencies: true,
    leave: true, recruitment: false, development: true, reviews: false,
    wellbeing: false, onboarding: false,
  };
  const isEnabled = (key: string) => {
    if (enabledModules && key in enabledModules) return enabledModules[key];
    return defaults[key] ?? true;
  };

  useEffect(() => {
    if (!workspace) return;
    setLoading(true);
    statsApi.peopleDashboard(workspace.id)
      .then(r => setData(r.data))
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, [workspace]);

  if (!user) return null;

  const skeleton = (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {Array.from({ length: 8 }).map((_, i) => (
        <div key={i} className="rounded-xl p-5 animate-pulse" style={{ backgroundColor: 'var(--color-surface)' }}>
          <div className="h-4 rounded w-24 mb-3" style={{ backgroundColor: 'var(--color-border)' }} />
          <div className="h-8 rounded w-16" style={{ backgroundColor: 'var(--color-border)' }} />
        </div>
      ))}
    </div>
  );

  const summaryCards = data ? [
    { label: 'Team Members', value: data.people.total, icon: Users, colour: 'bg-blue-500' },
    { label: 'Active Objectives', value: data.objectives.total, icon: Target, colour: 'bg-purple-500' },
    { label: 'Pending Leave', value: data.leave.pending_requests, icon: Calendar, colour: 'bg-amber-500' },
    { label: 'Compliance Alerts', value: data.compliance.expiring_soon + data.compliance.expired, icon: Shield, colour: 'bg-red-500' },
    { label: 'Active Candidates', value: data.recruitment.active, icon: UserPlus, colour: 'bg-teal-500' },
    { label: 'Meeting Completion', value: `${data.meetings.completion_rate}%`, icon: MessageSquare, colour: 'bg-indigo-500' },
    { label: 'Skills Tracked', value: data.competencies.total_skills, icon: Award, colour: 'bg-cyan-500' },
    { label: 'Kudos (30 days)', value: data.wellbeing.recent_kudos, icon: Heart, colour: 'bg-pink-500' },
  ] : [];

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold" style={{ color: 'var(--color-text)' }}>People Dashboard</h1>
        <p className="text-sm mt-1" style={{ color: 'var(--color-text-secondary)' }}>
          Overview of your team's key metrics across all modules
        </p>
      </div>

      {loading ? skeleton : data && (
        <>
          {/* Summary cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {summaryCards.map(card => (
              <div key={card.label} className="rounded-xl p-5 shadow-sm border" style={{ backgroundColor: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm font-medium" style={{ color: 'var(--color-text-secondary)' }}>{card.label}</span>
                  <div className={`${card.colour} p-2 rounded-lg`}>
                    <card.icon size={16} className="text-white" />
                  </div>
                </div>
                <div className="text-2xl font-bold" style={{ color: 'var(--color-text)' }}>{card.value}</div>
              </div>
            ))}
          </div>

          {/* Module detail cards — 2-col grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* People by Department */}
            {Object.keys(data.people.by_department).length > 0 && (
              <Card title="People by Department" icon={Users}>
                <BarChart bars={Object.entries(data.people.by_department).map(([dept, count], i) => ({
                  label: dept,
                  value: count,
                  colour: [COLOURS.blue, COLOURS.purple, COLOURS.teal, COLOURS.amber, COLOURS.pink][i % 5],
                }))} />
              </Card>
            )}

            {/* Meetings */}
            {isEnabled('one_to_ones') && (
              <Card title="1:1 Meetings" icon={MessageSquare}>
                <div className="flex items-center gap-8">
                  <ProgressRing value={data.meetings.completion_rate} size={80} colour={COLOURS.indigo} label="Completion" />
                  <div className="space-y-2 text-sm">
                    <Metric label="This month" value={data.meetings.this_month} />
                    <Metric label="Completed" value={data.meetings.completed} />
                    <Metric label="Upcoming" value={data.meetings.upcoming} />
                  </div>
                </div>
              </Card>
            )}

            {/* Objectives */}
            {isEnabled('objectives') && (
              <Card title="Objectives" icon={Target}>
                <div className="flex items-center gap-6">
                  <DonutChart
                    segments={Object.entries(data.objectives.by_status).map(([status, count]) => ({
                      label: status.replace(/_/g, ' '),
                      value: count,
                      colour: STATUS_COLOURS[status] || COLOURS.slate,
                    }))}
                    size={100}
                    centerValue={data.objectives.total}
                    centerLabel="total"
                  />
                  <div className="space-y-1.5">
                    {Object.entries(data.objectives.by_status).map(([status, count]) => (
                      <div key={status} className="flex items-center gap-2 text-sm">
                        <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: STATUS_COLOURS[status] || COLOURS.slate }} />
                        <span style={{ color: 'var(--color-text-secondary)' }}>{status.replace(/_/g, ' ')}</span>
                        <span className="font-medium" style={{ color: 'var(--color-text)' }}>{count}</span>
                      </div>
                    ))}
                    <div className="text-xs mt-2" style={{ color: 'var(--color-text-secondary)' }}>
                      Avg progress: {data.objectives.average_progress}%
                    </div>
                  </div>
                </div>
              </Card>
            )}

            {/* Compliance */}
            {isEnabled('compliance') && (
              <Card title="Compliance" icon={Shield}>
                <div className="flex items-center gap-6">
                  <DonutChart
                    segments={[
                      { label: 'Valid', value: data.compliance.valid, colour: COLOURS.green },
                      { label: 'Expiring Soon', value: data.compliance.expiring_soon, colour: COLOURS.amber },
                      { label: 'Expired', value: data.compliance.expired, colour: COLOURS.red },
                    ]}
                    size={100}
                    centerValue={data.compliance.total}
                    centerLabel="items"
                  />
                  <div className="space-y-1.5">
                    <StatusRow colour={COLOURS.green} label="Valid" value={data.compliance.valid} />
                    <StatusRow colour={COLOURS.amber} label="Expiring soon" value={data.compliance.expiring_soon} />
                    <StatusRow colour={COLOURS.red} label="Expired" value={data.compliance.expired} />
                  </div>
                </div>
              </Card>
            )}

            {/* Competencies */}
            {isEnabled('competencies') && data.competencies.total_skills > 0 && (
              <Card title="Competencies" icon={Award}>
                <div className="flex items-center gap-6">
                  <BarChart bars={Object.entries(data.competencies.by_level).map(([level, count]) => ({
                    label: `Level ${level}`,
                    value: count,
                    colour: [COLOURS.red, COLOURS.amber, COLOURS.blue, COLOURS.purple, COLOURS.green][
                      Math.min(parseInt(level) - 1, 4)
                    ] || COLOURS.slate,
                  }))} height={140} />
                  <div className="space-y-2 text-sm">
                    <Metric label="Skills defined" value={data.competencies.total_skills} />
                    <Metric label="Assignments" value={data.competencies.total_assignments} />
                  </div>
                </div>
              </Card>
            )}

            {/* Leave */}
            {isEnabled('leave') && (
              <Card title="Leave" icon={Calendar}>
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div>
                    <div className="text-2xl font-bold" style={{ color: COLOURS.amber }}>{data.leave.pending_requests}</div>
                    <div className="text-xs mt-1" style={{ color: 'var(--color-text-secondary)' }}>Pending</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold" style={{ color: COLOURS.green }}>{data.leave.approved_this_month}</div>
                    <div className="text-xs mt-1" style={{ color: 'var(--color-text-secondary)' }}>Approved (month)</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold" style={{ color: COLOURS.blue }}>{data.leave.total_allowances}</div>
                    <div className="text-xs mt-1" style={{ color: 'var(--color-text-secondary)' }}>Allowances</div>
                  </div>
                </div>
              </Card>
            )}

            {/* Recruitment */}
            {isEnabled('recruitment') && (
              <Card title="Recruitment Pipeline" icon={UserPlus}>
                <BarChart bars={Object.entries(data.recruitment.by_stage).map(([stage, count]) => ({
                  label: stage,
                  value: count,
                  colour: STATUS_COLOURS[stage] || COLOURS.blue,
                }))} height={150} />
              </Card>
            )}

            {/* Development */}
            {isEnabled('development') && (
              <Card title="Development" icon={GraduationCap}>
                <div className="flex items-center gap-8">
                  <ProgressRing value={data.development.completion_rate} size={80} colour={COLOURS.purple} label="Goals" />
                  <div className="space-y-2 text-sm">
                    <Metric label="Active plans" value={data.development.active_plans} />
                    <Metric label="Total goals" value={data.development.total_goals} />
                    <Metric label="Completed" value={data.development.completed_goals} />
                  </div>
                </div>
              </Card>
            )}

            {/* Reviews */}
            {isEnabled('reviews') && (
              <Card title="Performance Reviews" icon={ClipboardCheck}>
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div>
                    <div className="text-2xl font-bold" style={{ color: COLOURS.purple }}>{data.reviews.total_cycles}</div>
                    <div className="text-xs mt-1" style={{ color: 'var(--color-text-secondary)' }}>Cycles</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold" style={{ color: COLOURS.blue }}>{data.reviews.completed}</div>
                    <div className="text-xs mt-1" style={{ color: 'var(--color-text-secondary)' }}>Completed</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold" style={{ color: COLOURS.amber }}>
                      {data.reviews.avg_rating !== null ? data.reviews.avg_rating.toFixed(1) : '—'}
                    </div>
                    <div className="text-xs mt-1" style={{ color: 'var(--color-text-secondary)' }}>Avg Rating</div>
                  </div>
                </div>
              </Card>
            )}

            {/* Wellbeing */}
            {isEnabled('wellbeing') && (
              <Card title="Wellbeing" icon={Heart}>
                <div className="flex items-center gap-6">
                  <div className="flex gap-3">
                    {data.wellbeing.avg_morale !== null && (
                      <ProgressRing value={(data.wellbeing.avg_morale / 5) * 100} size={64} colour={COLOURS.pink} label="Morale" />
                    )}
                    {data.wellbeing.avg_workload !== null && (
                      <ProgressRing value={(data.wellbeing.avg_workload / 5) * 100} size={64} colour={COLOURS.amber} label="Workload" />
                    )}
                    {data.wellbeing.avg_support !== null && (
                      <ProgressRing value={(data.wellbeing.avg_support / 5) * 100} size={64} colour={COLOURS.green} label="Support" />
                    )}
                  </div>
                  <div className="space-y-2 text-sm">
                    <Metric label="Total kudos" value={data.wellbeing.total_kudos} />
                    <Metric label="Last 30 days" value={data.wellbeing.recent_kudos} />
                  </div>
                </div>
              </Card>
            )}

            {/* Onboarding */}
            {isEnabled('onboarding') && (
              <Card title="Onboarding" icon={ClipboardList}>
                <div className="flex items-center gap-8">
                  <ProgressRing value={data.onboarding.avg_progress} size={80} colour={COLOURS.teal} label="Progress" />
                  <div className="space-y-2 text-sm">
                    <Metric label="Active checklists" value={data.onboarding.active_checklists} />
                  </div>
                </div>
              </Card>
            )}
          </div>
        </>
      )}

      {!loading && !data && (
        <div className="text-center py-12">
          <BarChart3 size={48} className="mx-auto mb-4" style={{ color: 'var(--color-text-secondary)' }} />
          <p style={{ color: 'var(--color-text-secondary)' }}>Unable to load dashboard data</p>
        </div>
      )}
    </div>
  );
}

function Card({ title, icon: Icon, children }: { title: string; icon: React.ComponentType<{ size: number }>; children: React.ReactNode }) {
  return (
    <div className="rounded-xl p-5 shadow-sm border" style={{ backgroundColor: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
      <div className="flex items-center gap-2 mb-4">
        <Icon size={18} />
        <h3 className="font-semibold" style={{ color: 'var(--color-text)' }}>{title}</h3>
      </div>
      {children}
    </div>
  );
}

function Metric({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <span style={{ color: 'var(--color-text-secondary)' }}>{label}</span>
      <span className="font-medium" style={{ color: 'var(--color-text)' }}>{value}</span>
    </div>
  );
}

function StatusRow({ colour, label, value }: { colour: string; label: string; value: number }) {
  return (
    <div className="flex items-center gap-2 text-sm">
      <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: colour }} />
      <span style={{ color: 'var(--color-text-secondary)' }}>{label}</span>
      <span className="font-medium" style={{ color: 'var(--color-text)' }}>{value}</span>
    </div>
  );
}
