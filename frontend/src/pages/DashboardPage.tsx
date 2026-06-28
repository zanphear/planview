import { NavLink } from 'react-router-dom';
import {
  Clock,
  AlertTriangle,
  Users,
  FolderKanban,
  TrendingUp,
  Inbox,
  CalendarDays,
  Activity,
  Target,
  Shield,
  Award,
  Calendar,
  UserPlus,
  GraduationCap,
  ClipboardCheck,
  Heart,
  MessageSquare,
  ArrowRight,
} from 'lucide-react';
import { useWorkspaceStore } from '../stores/workspaceStore';
import { useAuthStore } from '../stores/authStore';
import { useWorkspaceStats, usePeopleStats } from '../api/queries/stats';
import { useActivityFeed } from '../api/queries/activity';
import { Avatar } from '../components/shared/Avatar';
import { DashboardSkeleton } from '../components/shared/Skeleton';
import { StatCard } from '../components/shared/StatCard';
import { DonutChart } from '../components/charts/DonutChart';
import { BarChart } from '../components/charts/BarChart';
import { ProgressRing } from '../components/charts/ProgressRing';
import { COLOURS, STATUS_COLOURS } from '../utils/colours';

function ProgressBar({
  total,
  completed,
  colour,
}: {
  total: number;
  completed: number;
  colour: string;
}) {
  const pct = total > 0 ? Math.round((completed / total) * 100) : 0;
  return (
    <div className="flex items-center gap-2 flex-1">
      <div
        className="flex-1 h-2 rounded-full overflow-hidden"
        style={{ backgroundColor: 'var(--color-grey-2)' }}
      >
        <div
          className="h-full rounded-full transition-colors"
          style={{ width: `${pct}%`, backgroundColor: colour }}
        />
      </div>
      <span
        className="text-xs font-medium w-8 text-right"
        style={{ color: 'var(--color-text-secondary)' }}
      >
        {pct}%
      </span>
    </div>
  );
}

function Card({
  title,
  icon: Icon,
  to,
  children,
}: {
  title: string;
  icon: React.ComponentType<{ size: number }>;
  to?: string;
  children: React.ReactNode;
}) {
  return (
    <div
      className="rounded-xl p-5 shadow-sm border"
      style={{ backgroundColor: 'var(--color-surface)', borderColor: 'var(--color-border)' }}
    >
      <div className="flex items-center gap-2 mb-4">
        <Icon size={18} />
        <h3 className="font-semibold text-sm" style={{ color: 'var(--color-text)' }}>
          {title}
        </h3>
        {to && (
          <NavLink
            to={to}
            className="ml-auto text-xs flex items-center gap-1 hover:underline"
            style={{ color: 'var(--color-primary)' }}
          >
            View <ArrowRight size={12} />
          </NavLink>
        )}
      </div>
      {children}
    </div>
  );
}

function Metric({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="flex items-center justify-between gap-4 text-sm">
      <span style={{ color: 'var(--color-text-secondary)' }}>{label}</span>
      <span className="font-medium" style={{ color: 'var(--color-text)' }}>
        {value}
      </span>
    </div>
  );
}

export function DashboardPage() {
  const workspace = useWorkspaceStore((s) => s.currentWorkspace);
  const user = useAuthStore((s) => s.user);

  const statsQuery = useWorkspaceStats(workspace?.id);
  // People stats are optional context, a failure here must not break the
  // task-focused dashboard, so we tolerate it rather than gate on it.
  const peopleStats = usePeopleStats(workspace?.id).data ?? null;
  const activityQuery = useActivityFeed(workspace?.id);
  const activities = (activityQuery.data?.pages.flat() ?? []).slice(0, 10);

  const enabledModules = workspace?.enabled_modules;
  const defaults: Record<string, boolean> = {
    one_to_ones: true,
    objectives: true,
    compliance: true,
    competencies: true,
    leave: true,
    recruitment: false,
    development: true,
    reviews: false,
    ai_assistant: true,
    wellbeing: false,
    onboarding: false,
    reporting: true,
    guide: true,
  };
  const isEnabled = (key: string) => {
    if (enabledModules && key in enabledModules) return enabledModules[key];
    return defaults[key] ?? true;
  };

  // ── Four states ─────────────────────────────────────────────────────────
  if (statsQuery.isPending) {
    return <DashboardSkeleton />;
  }

  if (statsQuery.isError) {
    return (
      <div className="p-4 sm:p-6 max-w-7xl mx-auto">
        <div
          className="rounded-xl border p-10 text-center"
          style={{ backgroundColor: 'var(--color-surface)', borderColor: 'var(--color-border)' }}
        >
          <AlertTriangle
            size={40}
            className="mx-auto mb-3"
            style={{ color: 'var(--color-danger)' }}
          />
          <p className="text-sm mb-4" style={{ color: 'var(--color-text-secondary)' }}>
            Couldn't load your dashboard.
          </p>
          <button
            onClick={() => statsQuery.refetch()}
            className="text-sm font-medium rounded-lg px-4 py-2"
            style={{ backgroundColor: 'var(--color-primary)', color: '#fff' }}
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  const stats = statsQuery.data;

  if (stats.total_tasks === 0 && stats.projects.length === 0) {
    return (
      <div className="p-4 sm:p-6 max-w-7xl mx-auto">
        <div
          className="rounded-xl border p-10 text-center"
          style={{ backgroundColor: 'var(--color-surface)', borderColor: 'var(--color-border)' }}
        >
          <Inbox
            size={40}
            className="mx-auto mb-3"
            style={{ color: 'var(--color-text-secondary)' }}
          />
          <p className="text-sm font-medium mb-1" style={{ color: 'var(--color-text)' }}>
            Nothing here yet
          </p>
          <p className="text-sm mb-4" style={{ color: 'var(--color-text-secondary)' }}>
            Create your first project and tasks to get the dashboard going.
          </p>
          <NavLink
            to="/projects"
            className="inline-block text-sm font-medium rounded-lg px-4 py-2"
            style={{ backgroundColor: 'var(--color-primary)', color: '#fff' }}
          >
            Create a project
          </NavLink>
        </div>
      </div>
    );
  }

  const todo = stats.by_status['todo'] || 0;
  const inProgress = stats.by_status['in_progress'] || 0;
  const done = stats.by_status['done'] || 0;
  const p = peopleStats;

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-6">
      {/* Greeting */}
      <div>
        <h2 className="text-2xl font-bold" style={{ color: 'var(--color-text)' }}>
          {getGreeting()}, {user?.name?.split(' ')[0] || 'there'}
        </h2>
        <p className="text-sm mt-1" style={{ color: 'var(--color-text-secondary)' }}>
          Here's what's happening across your workspace.
        </p>
      </div>

      {/* Top stat cards, task stats + key people stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Total Tasks"
          value={stats.total_tasks}
          icon={<Inbox size={20} />}
          colour="var(--color-primary)"
        />
        <StatCard
          label="Overdue"
          value={stats.overdue}
          icon={<AlertTriangle size={20} />}
          colour="var(--color-danger)"
          sub={stats.overdue > 0 ? 'Needs attention' : 'All on track'}
        />
        {p ? (
          <StatCard
            label="Team Members"
            value={p.people.total}
            icon={<Users size={20} />}
            colour={COLOURS.blue}
          />
        ) : (
          <StatCard
            label="Due This Week"
            value={stats.due_this_week}
            icon={<CalendarDays size={20} />}
            colour="var(--color-warning)"
          />
        )}
        {p ? (
          <StatCard
            label="Compliance Alerts"
            value={p.compliance.expiring_soon + p.compliance.expired}
            icon={<Shield size={20} />}
            colour={COLOURS.red}
            sub={
              p.compliance.expiring_soon + p.compliance.expired > 0
                ? 'Requires review'
                : 'All clear'
            }
          />
        ) : (
          <StatCard
            label="Unassigned"
            value={stats.unassigned}
            icon={<Users size={20} />}
            colour="var(--color-teal)"
          />
        )}
      </div>

      {/* Second row of stat cards if people data */}
      {p && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            label="Due This Week"
            value={stats.due_this_week}
            icon={<CalendarDays size={20} />}
            colour="var(--color-warning)"
          />
          <StatCard
            label="Unassigned"
            value={stats.unassigned}
            icon={<Users size={20} />}
            colour="var(--color-teal)"
          />
          <StatCard
            label="Pending Leave"
            value={p.leave.pending_requests}
            icon={<Calendar size={20} />}
            colour={COLOURS.amber}
          />
          <StatCard
            label="Active Candidates"
            value={p.recruitment.active}
            icon={<UserPlus size={20} />}
            colour={COLOURS.teal}
          />
        </div>
      )}

      {/* Task Status + This Week side by side */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div
          className="rounded-xl border p-5"
          style={{ backgroundColor: 'var(--color-surface)', borderColor: 'var(--color-border)' }}
        >
          <h3
            className="text-sm font-semibold mb-4 flex items-center gap-2"
            style={{ color: 'var(--color-text)' }}
          >
            <TrendingUp size={16} />
            Task Status
          </h3>
          <div className="space-y-3">
            <StatusRow
              label="To Do"
              count={todo}
              total={stats.total_tasks}
              colour="var(--color-text-secondary)"
            />
            <StatusRow
              label="In Progress"
              count={inProgress}
              total={stats.total_tasks}
              colour="var(--color-primary)"
            />
            <StatusRow
              label="Done"
              count={done}
              total={stats.total_tasks}
              colour="var(--color-success)"
            />
          </div>
        </div>

        <div
          className="rounded-xl border p-5"
          style={{ backgroundColor: 'var(--color-surface)', borderColor: 'var(--color-border)' }}
        >
          <h3
            className="text-sm font-semibold mb-4 flex items-center gap-2"
            style={{ color: 'var(--color-text)' }}
          >
            <Clock size={16} />
            This Week
          </h3>
          <div className="grid grid-cols-2 gap-4">
            <div
              className="text-center p-4 rounded-lg"
              style={{ backgroundColor: 'var(--color-grey-1)' }}
            >
              <p className="text-3xl font-bold" style={{ color: 'var(--color-primary)' }}>
                {stats.created_this_week}
              </p>
              <p className="text-xs mt-1" style={{ color: 'var(--color-text-secondary)' }}>
                Created
              </p>
            </div>
            <div
              className="text-center p-4 rounded-lg"
              style={{ backgroundColor: 'var(--color-grey-1)' }}
            >
              <p className="text-3xl font-bold" style={{ color: 'var(--color-success)' }}>
                {stats.completed_this_week}
              </p>
              <p className="text-xs mt-1" style={{ color: 'var(--color-text-secondary)' }}>
                Completed
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* People management charts, 2-col grid */}
      {p && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Objectives */}
          {isEnabled('objectives') && p.objectives.total > 0 && (
            <Card title="Objectives" icon={Target} to="/objectives">
              <div className="flex items-center gap-6">
                <DonutChart
                  segments={Object.entries(p.objectives.by_status).map(([status, count]) => ({
                    label: status.replace(/_/g, ' '),
                    value: count,
                    colour: STATUS_COLOURS[status] || COLOURS.slate,
                  }))}
                  size={90}
                  centerValue={p.objectives.total}
                  centerLabel="total"
                />
                <div className="space-y-1.5 flex-1">
                  {Object.entries(p.objectives.by_status).map(([status, count]) => (
                    <div key={status} className="flex items-center gap-2 text-sm">
                      <span
                        className="w-2.5 h-2.5 rounded-full shrink-0"
                        style={{ backgroundColor: STATUS_COLOURS[status] || COLOURS.slate }}
                      />
                      <span className="capitalize" style={{ color: 'var(--color-text-secondary)' }}>
                        {status.replace(/_/g, ' ')}
                      </span>
                      <span className="font-medium ml-auto" style={{ color: 'var(--color-text)' }}>
                        {count}
                      </span>
                    </div>
                  ))}
                  <div className="text-xs pt-1" style={{ color: 'var(--color-text-secondary)' }}>
                    Avg progress: {p.objectives.average_progress}%
                  </div>
                </div>
              </div>
            </Card>
          )}

          {/* Compliance */}
          {isEnabled('compliance') && p.compliance.total > 0 && (
            <Card title="Compliance" icon={Shield} to="/compliance">
              <div className="flex items-center gap-6">
                <DonutChart
                  segments={[
                    { label: 'Valid', value: p.compliance.valid, colour: COLOURS.green },
                    { label: 'Expiring', value: p.compliance.expiring_soon, colour: COLOURS.amber },
                    { label: 'Expired', value: p.compliance.expired, colour: COLOURS.red },
                  ]}
                  size={90}
                  centerValue={p.compliance.total}
                  centerLabel="items"
                />
                <div className="space-y-2 flex-1">
                  <ChipRow colour={COLOURS.green} label="Valid" value={p.compliance.valid} />
                  <ChipRow
                    colour={COLOURS.amber}
                    label="Expiring soon"
                    value={p.compliance.expiring_soon}
                  />
                  <ChipRow colour={COLOURS.red} label="Expired" value={p.compliance.expired} />
                </div>
              </div>
            </Card>
          )}

          {/* 1:1 Meetings */}
          {isEnabled('one_to_ones') && (
            <Card title="1:1 Meetings" icon={MessageSquare} to="/one-to-ones">
              <div className="flex items-center gap-8">
                <ProgressRing
                  value={p.meetings.completion_rate}
                  size={80}
                  colour={COLOURS.indigo}
                  label="Completion"
                />
                <div className="space-y-2 flex-1">
                  <Metric label="This month" value={p.meetings.this_month} />
                  <Metric label="Completed" value={p.meetings.completed} />
                  <Metric label="Upcoming" value={p.meetings.upcoming} />
                </div>
              </div>
            </Card>
          )}

          {/* Competencies */}
          {isEnabled('competencies') && p.competencies.total_skills > 0 && (
            <Card title="Skills Matrix" icon={Award} to="/competencies">
              <div className="flex items-center gap-6">
                <BarChart
                  bars={Object.entries(p.competencies.by_level).map(([level, count]) => ({
                    label: `Level ${level}`,
                    value: count,
                    colour:
                      [COLOURS.red, COLOURS.amber, COLOURS.blue, COLOURS.purple, COLOURS.green][
                        Math.min(parseInt(level) - 1, 4)
                      ] || COLOURS.slate,
                  }))}
                  height={120}
                />
                <div className="space-y-2 flex-1">
                  <Metric label="Skills defined" value={p.competencies.total_skills} />
                  <Metric label="Assignments" value={p.competencies.total_assignments} />
                </div>
              </div>
            </Card>
          )}

          {/* Leave */}
          {isEnabled('leave') && (
            <Card title="Leave" icon={Calendar} to="/leave">
              <div className="grid grid-cols-3 gap-4 text-center">
                <div>
                  <div className="text-2xl font-bold" style={{ color: COLOURS.amber }}>
                    {p.leave.pending_requests}
                  </div>
                  <div className="text-xs mt-1" style={{ color: 'var(--color-text-secondary)' }}>
                    Pending
                  </div>
                </div>
                <div>
                  <div className="text-2xl font-bold" style={{ color: COLOURS.green }}>
                    {p.leave.approved_this_month}
                  </div>
                  <div className="text-xs mt-1" style={{ color: 'var(--color-text-secondary)' }}>
                    Approved
                  </div>
                </div>
                <div>
                  <div className="text-2xl font-bold" style={{ color: COLOURS.blue }}>
                    {p.leave.total_allowances}
                  </div>
                  <div className="text-xs mt-1" style={{ color: 'var(--color-text-secondary)' }}>
                    Allowances
                  </div>
                </div>
              </div>
            </Card>
          )}

          {/* Recruitment */}
          {isEnabled('recruitment') && p.recruitment.total > 0 && (
            <Card title="Recruitment Pipeline" icon={UserPlus} to="/recruitment">
              <BarChart
                bars={Object.entries(p.recruitment.by_stage).map(([stage, count]) => ({
                  label: stage,
                  value: count,
                  colour: STATUS_COLOURS[stage] || COLOURS.blue,
                }))}
                height={130}
              />
            </Card>
          )}

          {/* Development */}
          {isEnabled('development') && (
            <Card title="Development" icon={GraduationCap} to="/development">
              <div className="flex items-center gap-8">
                <ProgressRing
                  value={p.development.completion_rate}
                  size={80}
                  colour={COLOURS.purple}
                  label="Goals"
                />
                <div className="space-y-2 flex-1">
                  <Metric label="Active plans" value={p.development.active_plans} />
                  <Metric label="Total goals" value={p.development.total_goals} />
                  <Metric label="Completed" value={p.development.completed_goals} />
                </div>
              </div>
            </Card>
          )}

          {/* Reviews */}
          {isEnabled('reviews') && (
            <Card title="Performance Reviews" icon={ClipboardCheck} to="/reviews">
              <div className="grid grid-cols-3 gap-4 text-center">
                <div>
                  <div className="text-2xl font-bold" style={{ color: COLOURS.purple }}>
                    {p.reviews.total_cycles}
                  </div>
                  <div className="text-xs mt-1" style={{ color: 'var(--color-text-secondary)' }}>
                    Cycles
                  </div>
                </div>
                <div>
                  <div className="text-2xl font-bold" style={{ color: COLOURS.blue }}>
                    {p.reviews.completed}
                  </div>
                  <div className="text-xs mt-1" style={{ color: 'var(--color-text-secondary)' }}>
                    Completed
                  </div>
                </div>
                <div>
                  <div className="text-2xl font-bold" style={{ color: COLOURS.amber }}>
                    {p.reviews.avg_rating !== null ? p.reviews.avg_rating.toFixed(1) : ', '}
                  </div>
                  <div className="text-xs mt-1" style={{ color: 'var(--color-text-secondary)' }}>
                    Avg Rating
                  </div>
                </div>
              </div>
            </Card>
          )}

          {/* Wellbeing */}
          {isEnabled('wellbeing') && (
            <Card title="Wellbeing" icon={Heart} to="/wellbeing">
              <div className="flex items-center gap-6">
                <div className="flex gap-3">
                  {p.wellbeing.avg_morale !== null && (
                    <ProgressRing
                      value={(p.wellbeing.avg_morale / 5) * 100}
                      size={60}
                      colour={COLOURS.pink}
                      label="Morale"
                    />
                  )}
                  {p.wellbeing.avg_workload !== null && (
                    <ProgressRing
                      value={(p.wellbeing.avg_workload / 5) * 100}
                      size={60}
                      colour={COLOURS.amber}
                      label="Workload"
                    />
                  )}
                  {p.wellbeing.avg_support !== null && (
                    <ProgressRing
                      value={(p.wellbeing.avg_support / 5) * 100}
                      size={60}
                      colour={COLOURS.green}
                      label="Support"
                    />
                  )}
                </div>
                <div className="space-y-2 flex-1">
                  <Metric label="Total kudos" value={p.wellbeing.total_kudos} />
                  <Metric label="Last 30 days" value={p.wellbeing.recent_kudos} />
                </div>
              </div>
            </Card>
          )}

          {/* People by Department */}
          {Object.keys(p.people.by_department).length > 0 && (
            <Card title="People by Department" icon={Users} to="/people">
              <BarChart
                bars={Object.entries(p.people.by_department).map(([dept, count], i) => ({
                  label: dept,
                  value: count,
                  colour: [COLOURS.blue, COLOURS.purple, COLOURS.teal, COLOURS.amber, COLOURS.pink][
                    i % 5
                  ],
                }))}
                height={130}
              />
            </Card>
          )}
        </div>
      )}

      {/* Projects */}
      {stats.projects.length > 0 && (
        <div
          className="rounded-xl border p-5"
          style={{ backgroundColor: 'var(--color-surface)', borderColor: 'var(--color-border)' }}
        >
          <h3
            className="text-sm font-semibold mb-4 flex items-center gap-2"
            style={{ color: 'var(--color-text)' }}
          >
            <FolderKanban size={16} />
            Projects
          </h3>
          <div className="space-y-3">
            {stats.projects.map((proj) => (
              <NavLink
                key={proj.id}
                to={`/projects/${proj.id}/board`}
                className="flex items-center gap-3 p-2 -mx-2 rounded-lg hover:bg-subtle transition-colors"
              >
                <div
                  className="w-3 h-3 rounded-full shrink-0"
                  style={{ backgroundColor: proj.colour }}
                />
                <span
                  className="text-sm font-medium flex-1 truncate"
                  style={{ color: 'var(--color-text)' }}
                >
                  {proj.name}
                </span>
                <span className="text-xs shrink-0" style={{ color: 'var(--color-text-secondary)' }}>
                  {proj.completed}/{proj.total} done
                </span>
                <ProgressBar total={proj.total} completed={proj.completed} colour={proj.colour} />
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
            <h3
              className="text-sm font-semibold mb-4 flex items-center gap-2"
              style={{ color: 'var(--color-text)' }}
            >
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
                    {w.name
                      .split(' ')
                      .map((n) => n[0])
                      .join('')
                      .slice(0, 2)}
                  </div>
                  <span
                    className="text-sm font-medium w-28 truncate"
                    style={{ color: 'var(--color-text)' }}
                  >
                    {w.name}
                  </span>
                  <ProgressBar total={w.total} completed={w.completed} colour={w.colour} />
                  <span
                    className="text-xs shrink-0 w-16 text-right"
                    style={{ color: 'var(--color-text-secondary)' }}
                  >
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
          <h3
            className="text-sm font-semibold mb-4 flex items-center gap-2"
            style={{ color: 'var(--color-text)' }}
          >
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
                      <span className="font-medium">{a.actor.name}</span> {a.action} {a.entity_type}
                      {a.entity_name && <span className="font-medium"> "{a.entity_name}"</span>}
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

function StatusRow({
  label,
  count,
  total,
  colour,
}: {
  label: string;
  count: number;
  total: number;
  colour: string;
}) {
  const pct = total > 0 ? Math.round((count / total) * 100) : 0;
  return (
    <div className="flex items-center gap-3">
      <span className="text-sm w-24" style={{ color: 'var(--color-text)' }}>
        {label}
      </span>
      <div
        className="flex-1 h-2.5 rounded-full overflow-hidden"
        style={{ backgroundColor: 'var(--color-grey-2)' }}
      >
        <div
          className="h-full rounded-full transition-colors"
          style={{ width: `${pct}%`, backgroundColor: colour }}
        />
      </div>
      <span
        className="text-xs font-medium w-8 text-right"
        style={{ color: 'var(--color-text-secondary)' }}
      >
        {count}
      </span>
    </div>
  );
}

function ChipRow({ colour, label, value }: { colour: string; label: string; value: number }) {
  return (
    <div className="flex items-center gap-2 text-sm">
      <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: colour }} />
      <span style={{ color: 'var(--color-text-secondary)' }}>{label}</span>
      <span className="font-medium ml-auto" style={{ color: 'var(--color-text)' }}>
        {value}
      </span>
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
