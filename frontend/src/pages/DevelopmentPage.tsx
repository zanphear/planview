import { useState, useEffect } from 'react';
import {
  GraduationCap, Plus, Target, BookOpen, ChevronDown, ChevronUp, Edit2, Check,
  Calendar, TrendingUp, Milestone, ClipboardCheck, Route, Trash2, AlertTriangle,
  DollarSign, X,
} from 'lucide-react';
import { useWorkspaceStore } from '../stores/workspaceStore';
import { useAuthStore } from '../stores/authStore';
import { developmentApi } from '../api/development';
import type { DevelopmentPlan, DevelopmentMilestone, CareerPathway } from '../api/development';
import { membersApi } from '../api/users';
import type { User } from '../api/users';
import { ProgressRing } from '../components/charts/ProgressRing';
import { BarChart } from '../components/charts/BarChart';

type PlanStatus = 'draft' | 'active' | 'completed';
type GoalStatus = 'not_started' | 'in_progress' | 'completed';
type GoalType = 'skill' | 'knowledge' | 'experience' | 'qualification' | 'certification';
type TopTab = 'plans' | 'pathways';
type PlanTab = 'goals' | 'milestones' | 'checkpoints';

const PLAN_STATUS_COLOURS: Record<PlanStatus, { bg: string; text: string; label: string }> = {
  draft: { bg: '#f3f4f6', text: '#6b7280', label: 'Draft' },
  active: { bg: '#dbeafe', text: '#2563eb', label: 'Active' },
  completed: { bg: '#dcfce7', text: '#16a34a', label: 'Completed' },
};

const GOAL_STATUS_COLOURS: Record<GoalStatus, { bg: string; text: string; border: string; label: string }> = {
  not_started: { bg: '#f3f4f6', text: '#6b7280', border: '#d1d5db', label: 'Not Started' },
  in_progress: { bg: '#fef3c7', text: '#d97706', border: '#f59e0b', label: 'In Progress' },
  completed: { bg: '#dcfce7', text: '#16a34a', border: '#22c55e', label: 'Completed' },
};

const GOAL_TYPE_COLOURS: Record<GoalType, { bg: string; text: string }> = {
  skill: { bg: '#ede9fe', text: '#7c3aed' },
  knowledge: { bg: '#dbeafe', text: '#2563eb' },
  experience: { bg: '#fce7f3', text: '#db2777' },
  qualification: { bg: '#fef3c7', text: '#d97706' },
  certification: { bg: '#dcfce7', text: '#16a34a' },
};

const MILESTONE_STATUS_COLOURS: Record<string, { bg: string; text: string; label: string }> = {
  pending: { bg: '#f3f4f6', text: '#6b7280', label: 'Pending' },
  in_progress: { bg: '#dbeafe', text: '#2563eb', label: 'In Progress' },
  completed: { bg: '#dcfce7', text: '#16a34a', label: 'Completed' },
  overdue: { bg: '#fee2e2', text: '#dc2626', label: 'Overdue' },
};

const ASSESSMENT_COLOURS: Record<string, { bg: string; text: string; label: string }> = {
  on_track: { bg: '#dcfce7', text: '#16a34a', label: 'On Track' },
  needs_attention: { bg: '#fef3c7', text: '#d97706', label: 'Needs Attention' },
  at_risk: { bg: '#fee2e2', text: '#dc2626', label: 'At Risk' },
  exceeded: { bg: '#dbeafe', text: '#2563eb', label: 'Exceeded' },
};

const NEXT_PLAN_STATUS: Record<string, PlanStatus | null> = {
  draft: 'active', active: 'completed', completed: null,
};

function getInitials(name: string): string {
  return name.split(' ').map(p => p[0]).join('').toUpperCase().slice(0, 2);
}

function UserAvatar({ name, initials, colour, size = 36 }: {
  name: string; initials: string | null; colour: string; size?: number;
}) {
  const display = initials || getInitials(name);
  return (
    <div
      style={{
        width: size, height: size, borderRadius: '50%', backgroundColor: colour,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        color: '#fff', fontWeight: 600, fontSize: size * 0.38, flexShrink: 0,
      }}
    >
      {display}
    </div>
  );
}

function StatusBadge({ status, map }: { status: string; map: Record<string, { bg: string; text: string; label: string }> }) {
  const s = map[status] || { bg: '#f3f4f6', text: '#6b7280', label: status };
  return (
    <span style={{ backgroundColor: s.bg, color: s.text }} className="px-2 py-0.5 rounded-full text-xs font-medium">
      {s.label}
    </span>
  );
}

function GoalTypePill({ type }: { type: string }) {
  const t = GOAL_TYPE_COLOURS[type as GoalType] || { bg: '#f3f4f6', text: '#6b7280' };
  return (
    <span style={{ backgroundColor: t.bg, color: t.text }} className="px-2 py-0.5 rounded-full text-xs font-medium capitalize">
      {type}
    </span>
  );
}

// ─────────────────────────────────────────────────────────────
// Main Component
// ─────────────────────────────────────────────────────────────

export function DevelopmentPage() {
  const workspace = useWorkspaceStore((s) => s.currentWorkspace);
  const user = useAuthStore((s) => s.user);

  const [topTab, setTopTab] = useState<TopTab>('plans');
  const [plans, setPlans] = useState<DevelopmentPlan[]>([]);
  const [pathways, setPathways] = useState<CareerPathway[]>([]);
  const [members, setMembers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterUserId, setFilterUserId] = useState<string>('');
  const [expandedPlanId, setExpandedPlanId] = useState<string | null>(null);
  const [planTab, setPlanTab] = useState<PlanTab>('goals');

  // Goal editing
  const [editingGoalId, setEditingGoalId] = useState<string | null>(null);
  const [editGoalStatus, setEditGoalStatus] = useState<GoalStatus>('not_started');
  const [editGoalEvidence, setEditGoalEvidence] = useState('');
  const [editGoalProgress, setEditGoalProgress] = useState(0);

  // Add goal
  const [addingGoalToPlanId, setAddingGoalToPlanId] = useState<string | null>(null);
  const [addGoalForm, setAddGoalForm] = useState({ title: '', description: '', goal_type: 'skill' as GoalType, target_date: '', cost_estimate: '', priority: 'medium', year: '' });

  // Add milestone
  const [addingMilestone, setAddingMilestone] = useState(false);
  const [milestoneForm, setMilestoneForm] = useState({ title: '', description: '', target_date: '', year: '1' });

  // Add checkpoint
  const [addingCheckpoint, setAddingCheckpoint] = useState(false);
  const [checkpointForm, setCheckpointForm] = useState({ checkpoint_date: '', notes: '', overall_assessment: 'on_track' });

  // Create plan modal
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createForm, setCreateForm] = useState({
    user_id: '', career_aspiration: '', horizon_years: '3', start_date: '', end_date: '',
    career_pathway_id: '', total_budget: '',
  });

  // Create pathway modal
  const [showPathwayModal, setShowPathwayModal] = useState(false);
  const [pathwayForm, setPathwayForm] = useState({ name: '', description: '' });

  const loadData = async () => {
    if (!workspace) return;
    setLoading(true);
    try {
      const params = filterUserId ? { user_id: filterUserId } : undefined;
      const [plansRes, membersRes, pathwaysRes] = await Promise.all([
        developmentApi.list(workspace.id, params),
        membersApi.list(workspace.id),
        developmentApi.listPathways(workspace.id),
      ]);
      setPlans(plansRes.data);
      setMembers(membersRes.data);
      setPathways(pathwaysRes.data);
    } catch (err) {
      console.error('Failed to load development data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(); }, [workspace, filterUserId]);

  const getMember = (userId: string): User | undefined => members.find(u => u.id === userId);

  // ─── Plan actions ────────────────────────────────────────

  const handleCreatePlan = async () => {
    if (!workspace) return;
    try {
      await developmentApi.create(workspace.id, {
        user_id: createForm.user_id,
        career_aspiration: createForm.career_aspiration || undefined,
        horizon_years: parseInt(createForm.horizon_years) || 3,
        start_date: createForm.start_date || undefined,
        end_date: createForm.end_date || undefined,
        career_pathway_id: createForm.career_pathway_id || undefined,
        total_budget: createForm.total_budget ? parseFloat(createForm.total_budget) : undefined,
      });
      setShowCreateModal(false);
      await loadData();
    } catch (err) {
      console.error('Failed to create plan:', err);
    }
  };

  const handleUpdatePlanStatus = async (plan: DevelopmentPlan) => {
    if (!workspace) return;
    const next = NEXT_PLAN_STATUS[plan.status];
    if (!next) return;
    try {
      await developmentApi.update(workspace.id, plan.id, { status: next });
      await loadData();
    } catch (err) {
      console.error('Failed to update plan:', err);
    }
  };

  // ─── Goal actions ────────────────────────────────────────

  const handleAddGoal = async (planId: string) => {
    if (!workspace) return;
    try {
      await developmentApi.addGoal(workspace.id, planId, {
        title: addGoalForm.title,
        description: addGoalForm.description || null,
        goal_type: addGoalForm.goal_type,
        target_date: addGoalForm.target_date || null,
        cost_estimate: addGoalForm.cost_estimate ? parseFloat(addGoalForm.cost_estimate) : null,
        priority: addGoalForm.priority,
        year: addGoalForm.year ? parseInt(addGoalForm.year) : null,
      });
      setAddingGoalToPlanId(null);
      await loadData();
    } catch (err) {
      console.error('Failed to add goal:', err);
    }
  };

  const handleUpdateGoal = async (planId: string, goalId: string) => {
    if (!workspace) return;
    try {
      await developmentApi.updateGoal(workspace.id, planId, goalId, {
        status: editGoalStatus,
        evidence: editGoalEvidence || null,
        progress: editGoalProgress,
      });
      setEditingGoalId(null);
      await loadData();
    } catch (err) {
      console.error('Failed to update goal:', err);
    }
  };

  // ─── Milestone actions ───────────────────────────────────

  const handleAddMilestone = async (planId: string) => {
    if (!workspace) return;
    try {
      await developmentApi.addMilestone(workspace.id, planId, {
        title: milestoneForm.title,
        description: milestoneForm.description || null,
        target_date: milestoneForm.target_date,
        year: parseInt(milestoneForm.year) || 1,
      });
      setAddingMilestone(false);
      setMilestoneForm({ title: '', description: '', target_date: '', year: '1' });
      await loadData();
    } catch (err) {
      console.error('Failed to add milestone:', err);
    }
  };

  const handleUpdateMilestoneStatus = async (planId: string, milestoneId: string, status: string) => {
    if (!workspace) return;
    try {
      const completed_date = status === 'completed' ? new Date().toISOString().split('T')[0] : null;
      await developmentApi.updateMilestone(workspace.id, planId, milestoneId, {
        status, completed_date,
      } as Partial<DevelopmentMilestone>);
      await loadData();
    } catch (err) {
      console.error('Failed to update milestone:', err);
    }
  };

  const handleDeleteMilestone = async (planId: string, milestoneId: string) => {
    if (!workspace) return;
    try {
      await developmentApi.deleteMilestone(workspace.id, planId, milestoneId);
      await loadData();
    } catch (err) {
      console.error('Failed to delete milestone:', err);
    }
  };

  // ─── Checkpoint actions ──────────────────────────────────

  const handleAddCheckpoint = async (planId: string) => {
    if (!workspace) return;
    try {
      await developmentApi.addCheckpoint(workspace.id, planId, {
        checkpoint_date: checkpointForm.checkpoint_date,
        notes: checkpointForm.notes || null,
        overall_assessment: checkpointForm.overall_assessment,
      });
      setAddingCheckpoint(false);
      setCheckpointForm({ checkpoint_date: '', notes: '', overall_assessment: 'on_track' });
      await loadData();
    } catch (err) {
      console.error('Failed to add checkpoint:', err);
    }
  };

  // ─── Pathway actions ─────────────────────────────────────

  const handleCreatePathway = async () => {
    if (!workspace) return;
    try {
      await developmentApi.createPathway(workspace.id, {
        name: pathwayForm.name,
        description: pathwayForm.description || undefined,
      } as Partial<CareerPathway>);
      setShowPathwayModal(false);
      setPathwayForm({ name: '', description: '' });
      await loadData();
    } catch (err) {
      console.error('Failed to create pathway:', err);
    }
  };

  const handleDeletePathway = async (pathwayId: string) => {
    if (!workspace) return;
    try {
      await developmentApi.deletePathway(workspace.id, pathwayId);
      await loadData();
    } catch (err) {
      console.error('Failed to delete pathway:', err);
    }
  };

  // ─── Computed stats ──────────────────────────────────────

  const activePlans = plans.filter(p => p.status === 'active');
  const avgProgress = activePlans.length > 0
    ? Math.round(activePlans.reduce((s, p) => s + p.overall_progress, 0) / activePlans.length)
    : 0;
  const totalBudget = plans.reduce((s, p) => s + (p.total_budget || 0), 0);
  const totalSpent = plans.reduce((s, p) => s + p.goals.reduce((gs, g) => gs + (g.actual_cost || 0), 0), 0);
  const allMilestones = plans.flatMap(p => p.milestones || []);
  const overdueMilestones = allMilestones.filter(m =>
    m.status !== 'completed' && m.target_date && new Date(m.target_date) < new Date()
  );

  if (loading && plans.length === 0) {
    return (
      <div className="p-6 flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2" style={{ borderColor: 'var(--color-primary)' }} />
      </div>
    );
  }

  const inputStyle: React.CSSProperties = {
    backgroundColor: 'var(--color-surface)', borderColor: 'var(--color-border)', color: 'var(--color-text)',
  };

  return (
    <div className="p-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold flex items-center gap-2" style={{ color: 'var(--color-text)' }}>
          <GraduationCap size={22} />
          Development Plans
        </h2>
        <div className="flex items-center gap-3">
          {topTab === 'plans' && (
            <>
              <select
                value={filterUserId}
                onChange={(e) => setFilterUserId(e.target.value)}
                className="px-3 py-1.5 rounded-lg border text-sm"
                style={inputStyle}
              >
                <option value="">All members</option>
                {members.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
              </select>
              <button
                onClick={() => {
                  setCreateForm({
                    user_id: user?.id || '', career_aspiration: '', horizon_years: '3',
                    start_date: '', end_date: '', career_pathway_id: '', total_budget: '',
                  });
                  setShowCreateModal(true);
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium text-white"
                style={{ backgroundColor: 'var(--color-primary)' }}
              >
                <Plus size={16} /> New Plan
              </button>
            </>
          )}
          {topTab === 'pathways' && (
            <button
              onClick={() => { setPathwayForm({ name: '', description: '' }); setShowPathwayModal(true); }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium text-white"
              style={{ backgroundColor: 'var(--color-primary)' }}
            >
              <Plus size={16} /> New Pathway
            </button>
          )}
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <div className="rounded-xl border p-4" style={{ backgroundColor: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
          <div className="flex items-center gap-2 mb-2">
            <Target size={16} style={{ color: 'var(--color-primary)' }} />
            <span className="text-xs font-medium" style={{ color: 'var(--color-text-secondary)' }}>Active Plans</span>
          </div>
          <p className="text-2xl font-bold" style={{ color: 'var(--color-text)' }}>{activePlans.length}</p>
        </div>
        <div className="rounded-xl border p-4" style={{ backgroundColor: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp size={16} style={{ color: '#16a34a' }} />
            <span className="text-xs font-medium" style={{ color: 'var(--color-text-secondary)' }}>Avg Progress</span>
          </div>
          <p className="text-2xl font-bold" style={{ color: 'var(--color-text)' }}>{avgProgress}%</p>
        </div>
        <div className="rounded-xl border p-4" style={{ backgroundColor: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
          <div className="flex items-center gap-2 mb-2">
            <DollarSign size={16} style={{ color: '#d97706' }} />
            <span className="text-xs font-medium" style={{ color: 'var(--color-text-secondary)' }}>Budget</span>
          </div>
          <p className="text-lg font-bold" style={{ color: 'var(--color-text)' }}>
            {'\u00A3'}{totalSpent.toLocaleString()} <span className="text-sm font-normal" style={{ color: 'var(--color-text-secondary)' }}>/ {'\u00A3'}{totalBudget.toLocaleString()}</span>
          </p>
        </div>
        <div className="rounded-xl border p-4" style={{ backgroundColor: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle size={16} style={{ color: overdueMilestones.length > 0 ? '#dc2626' : '#6b7280' }} />
            <span className="text-xs font-medium" style={{ color: 'var(--color-text-secondary)' }}>Overdue Milestones</span>
          </div>
          <p className="text-2xl font-bold" style={{ color: overdueMilestones.length > 0 ? '#dc2626' : 'var(--color-text)' }}>
            {overdueMilestones.length}
          </p>
        </div>
      </div>

      {/* Top tabs */}
      <div className="flex gap-1 mb-5 border-b" style={{ borderColor: 'var(--color-border)' }}>
        {([['plans', 'Plans', Target], ['pathways', 'Career Pathways', Route]] as const).map(([key, label, Icon]) => (
          <button
            key={key}
            onClick={() => setTopTab(key)}
            className="flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors"
            style={{
              borderColor: topTab === key ? 'var(--color-primary)' : 'transparent',
              color: topTab === key ? 'var(--color-primary)' : 'var(--color-text-secondary)',
            }}
          >
            <Icon size={15} /> {label}
          </button>
        ))}
      </div>

      {/* ─── Plans Tab ────────────────────────────────────── */}
      {topTab === 'plans' && (
        <>
          {plans.length === 0 ? (
            <div className="text-center py-16" style={{ color: 'var(--color-text-secondary)' }}>
              <Target size={48} className="mx-auto mb-3 opacity-40" />
              <p className="text-lg font-medium mb-1">No development plans yet</p>
              <p className="text-sm">Create a plan to start tracking goals and career growth.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {plans.map(plan => {
                const member = getMember(plan.user_id);
                const isExpanded = expandedPlanId === plan.id;
                const nextStatus = NEXT_PLAN_STATUS[plan.status];
                const pathway = pathways.find(p => p.id === plan.career_pathway_id);
                const completedGoals = plan.goals.filter(g => g.status === 'completed').length;
                const completedMilestones = (plan.milestones || []).filter(m => m.status === 'completed').length;

                return (
                  <div
                    key={plan.id}
                    className="rounded-xl border overflow-hidden"
                    style={{ backgroundColor: 'var(--color-surface)', borderColor: 'var(--color-border)' }}
                  >
                    {/* Plan Header */}
                    <button
                      onClick={() => {
                        setExpandedPlanId(isExpanded ? null : plan.id);
                        setPlanTab('goals');
                      }}
                      className="w-full flex items-center gap-3 p-4 text-left hover:bg-[var(--color-grey-2)] transition-colors"
                    >
                      <UserAvatar
                        name={member?.name || 'Unknown'}
                        initials={member?.initials || null}
                        colour={member?.colour || '#6b7280'}
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                          <span className="font-medium text-sm" style={{ color: 'var(--color-text)' }}>
                            {member?.name || 'Unknown'}
                          </span>
                          <StatusBadge status={plan.status} map={PLAN_STATUS_COLOURS} />
                          {plan.horizon_years && (
                            <span className="px-2 py-0.5 rounded-full text-xs font-medium" style={{ backgroundColor: '#ede9fe', color: '#7c3aed' }}>
                              {plan.horizon_years}yr plan
                            </span>
                          )}
                          {pathway && (
                            <span className="px-2 py-0.5 rounded-full text-xs font-medium" style={{ backgroundColor: '#fce7f3', color: '#db2777' }}>
                              {pathway.name}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-3 text-xs" style={{ color: 'var(--color-text-secondary)' }}>
                          {plan.career_aspiration && (
                            <span className="truncate max-w-[200px]">{plan.career_aspiration}</span>
                          )}
                          {plan.start_date && plan.end_date && (
                            <span className="flex items-center gap-1 shrink-0">
                              <Calendar size={11} />
                              {new Date(plan.start_date).toLocaleDateString()} - {new Date(plan.end_date).toLocaleDateString()}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <ProgressRing value={plan.overall_progress} size={42} strokeWidth={4} />
                        <div className="text-right text-xs" style={{ color: 'var(--color-text-secondary)' }}>
                          <div>{completedGoals}/{plan.goals.length} goals</div>
                          <div>{completedMilestones}/{(plan.milestones || []).length} milestones</div>
                        </div>
                        {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                      </div>
                    </button>

                    {/* Expanded Content */}
                    {isExpanded && (
                      <div className="border-t" style={{ borderColor: 'var(--color-border)' }}>
                        {/* Plan sub-tabs + actions */}
                        <div className="flex items-center justify-between px-4 pt-2">
                          <div className="flex gap-1">
                            {([
                              ['goals', 'Goals', Target],
                              ['milestones', 'Milestones', Milestone],
                              ['checkpoints', 'Reviews', ClipboardCheck],
                            ] as const).map(([key, label, Icon]) => (
                              <button
                                key={key}
                                onClick={() => setPlanTab(key)}
                                className="flex items-center gap-1 px-3 py-2 text-xs font-medium rounded-t-lg transition-colors"
                                style={{
                                  backgroundColor: planTab === key ? 'var(--color-bg)' : 'transparent',
                                  color: planTab === key ? 'var(--color-primary)' : 'var(--color-text-secondary)',
                                }}
                              >
                                <Icon size={13} /> {label}
                              </button>
                            ))}
                          </div>
                          <div className="flex items-center gap-2">
                            {nextStatus && (
                              <button
                                onClick={() => handleUpdatePlanStatus(plan)}
                                className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium"
                                style={{ backgroundColor: PLAN_STATUS_COLOURS[nextStatus].bg, color: PLAN_STATUS_COLOURS[nextStatus].text }}
                              >
                                <Check size={12} /> Move to {PLAN_STATUS_COLOURS[nextStatus].label}
                              </button>
                            )}
                            {plan.total_budget != null && plan.total_budget > 0 && (
                              <span className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>
                                Budget: {'\u00A3'}{plan.goals.reduce((s, g) => s + (g.actual_cost || 0), 0).toLocaleString()} / {'\u00A3'}{plan.total_budget.toLocaleString()}
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="px-4 pb-4">
                          {/* ─── Goals sub-tab ─── */}
                          {planTab === 'goals' && (
                            <>
                              <div className="flex justify-end mb-2">
                                <button
                                  onClick={() => {
                                    setAddingGoalToPlanId(plan.id);
                                    setAddGoalForm({ title: '', description: '', goal_type: 'skill', target_date: '', cost_estimate: '', priority: 'medium', year: '' });
                                  }}
                                  className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium hover:bg-[var(--color-grey-2)]"
                                  style={{ color: 'var(--color-text-secondary)' }}
                                >
                                  <Plus size={12} /> Add Goal
                                </button>
                              </div>

                              {plan.goals.length === 0 ? (
                                <p className="text-sm py-4 text-center" style={{ color: 'var(--color-text-secondary)' }}>No goals added yet.</p>
                              ) : (
                                <div className="space-y-2">
                                  {plan.goals.map(goal => {
                                    const statusInfo = GOAL_STATUS_COLOURS[goal.status as GoalStatus] || GOAL_STATUS_COLOURS.not_started;
                                    const isEditing = editingGoalId === goal.id;
                                    return (
                                      <div
                                        key={goal.id}
                                        className="rounded-lg border-l-4 border p-3"
                                        style={{ borderLeftColor: statusInfo.border, borderColor: 'var(--color-border)', backgroundColor: 'var(--color-bg)' }}
                                      >
                                        <div className="flex items-start justify-between gap-2">
                                          <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2 flex-wrap">
                                              <span className="font-medium text-sm" style={{ color: 'var(--color-text)' }}>{goal.title}</span>
                                              <GoalTypePill type={goal.goal_type} />
                                              <StatusBadge status={goal.status} map={GOAL_STATUS_COLOURS} />
                                              {goal.priority && goal.priority !== 'medium' && (
                                                <span className="text-xs px-1.5 py-0.5 rounded" style={{
                                                  backgroundColor: goal.priority === 'high' ? '#fee2e2' : '#f3f4f6',
                                                  color: goal.priority === 'high' ? '#dc2626' : '#6b7280',
                                                }}>
                                                  {goal.priority}
                                                </span>
                                              )}
                                              {goal.year && (
                                                <span className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>Yr {goal.year}</span>
                                              )}
                                            </div>
                                            <div className="flex items-center gap-3 mt-1 text-xs" style={{ color: 'var(--color-text-secondary)' }}>
                                              {goal.target_date && (
                                                <span><BookOpen size={11} className="inline mr-1" />Target: {new Date(goal.target_date).toLocaleDateString()}</span>
                                              )}
                                              {goal.cost_estimate != null && (
                                                <span>Est: {'\u00A3'}{goal.cost_estimate.toLocaleString()}</span>
                                              )}
                                              {goal.actual_cost != null && goal.actual_cost > 0 && (
                                                <span>Spent: {'\u00A3'}{goal.actual_cost.toLocaleString()}</span>
                                              )}
                                            </div>
                                            {/* Progress bar */}
                                            {goal.progress > 0 && (
                                              <div className="mt-2 flex items-center gap-2">
                                                <div className="flex-1 h-1.5 rounded-full" style={{ backgroundColor: 'var(--color-border)' }}>
                                                  <div className="h-full rounded-full transition-all" style={{ width: `${goal.progress}%`, backgroundColor: goal.progress === 100 ? '#16a34a' : 'var(--color-primary)' }} />
                                                </div>
                                                <span className="text-xs font-medium" style={{ color: 'var(--color-text-secondary)' }}>{goal.progress}%</span>
                                              </div>
                                            )}
                                          </div>
                                          <button
                                            onClick={() => {
                                              if (isEditing) {
                                                setEditingGoalId(null);
                                              } else {
                                                setEditingGoalId(goal.id);
                                                setEditGoalStatus(goal.status as GoalStatus);
                                                setEditGoalEvidence(goal.evidence || '');
                                                setEditGoalProgress(goal.progress);
                                              }
                                            }}
                                            className="p-1 rounded hover:bg-[var(--color-grey-2)]"
                                            title="Edit goal"
                                          >
                                            <Edit2 size={13} style={{ color: 'var(--color-text-secondary)' }} />
                                          </button>
                                        </div>

                                        {isEditing && (
                                          <div className="mt-3 pt-3 border-t space-y-2" style={{ borderColor: 'var(--color-border)' }}>
                                            <div className="grid grid-cols-2 gap-2">
                                              <div>
                                                <label className="text-xs font-medium mb-1 block" style={{ color: 'var(--color-text-secondary)' }}>Status</label>
                                                <select value={editGoalStatus} onChange={(e) => setEditGoalStatus(e.target.value as GoalStatus)} className="w-full px-2 py-1 rounded border text-sm" style={inputStyle}>
                                                  <option value="not_started">Not Started</option>
                                                  <option value="in_progress">In Progress</option>
                                                  <option value="completed">Completed</option>
                                                </select>
                                              </div>
                                              <div>
                                                <label className="text-xs font-medium mb-1 block" style={{ color: 'var(--color-text-secondary)' }}>Progress %</label>
                                                <input type="number" min={0} max={100} value={editGoalProgress} onChange={(e) => setEditGoalProgress(parseInt(e.target.value) || 0)} className="w-full px-2 py-1 rounded border text-sm" style={inputStyle} />
                                              </div>
                                            </div>
                                            <div>
                                              <label className="text-xs font-medium mb-1 block" style={{ color: 'var(--color-text-secondary)' }}>Evidence / Notes</label>
                                              <textarea value={editGoalEvidence} onChange={(e) => setEditGoalEvidence(e.target.value)} rows={2} className="w-full px-2 py-1 rounded border text-sm resize-none" style={inputStyle} placeholder="Add evidence or notes..." />
                                            </div>
                                            <div className="flex gap-2">
                                              <button onClick={() => handleUpdateGoal(plan.id, goal.id)} className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium text-white" style={{ backgroundColor: 'var(--color-primary)' }}>
                                                <Check size={12} /> Save
                                              </button>
                                              <button onClick={() => setEditingGoalId(null)} className="px-2.5 py-1 rounded-lg text-xs font-medium hover:bg-[var(--color-grey-2)]" style={{ color: 'var(--color-text-secondary)' }}>Cancel</button>
                                            </div>
                                          </div>
                                        )}

                                        {!isEditing && goal.evidence && (
                                          <p className="mt-2 text-xs" style={{ color: 'var(--color-text-secondary)' }}>
                                            <span className="font-medium">Evidence:</span> {goal.evidence}
                                          </p>
                                        )}
                                      </div>
                                    );
                                  })}
                                </div>
                              )}

                              {/* Add goal inline form */}
                              {addingGoalToPlanId === plan.id && (
                                <div className="mt-3 p-3 rounded-lg border space-y-2" style={{ backgroundColor: 'var(--color-bg)', borderColor: 'var(--color-border)' }}>
                                  <p className="text-sm font-medium" style={{ color: 'var(--color-text)' }}>Add Goal</p>
                                  <input type="text" value={addGoalForm.title} onChange={(e) => setAddGoalForm(f => ({ ...f, title: e.target.value }))} placeholder="Goal title" className="w-full px-2 py-1.5 rounded border text-sm" style={inputStyle} />
                                  <textarea value={addGoalForm.description} onChange={(e) => setAddGoalForm(f => ({ ...f, description: e.target.value }))} placeholder="Description (optional)" rows={2} className="w-full px-2 py-1.5 rounded border text-sm resize-none" style={inputStyle} />
                                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                                    <select value={addGoalForm.goal_type} onChange={(e) => setAddGoalForm(f => ({ ...f, goal_type: e.target.value as GoalType }))} className="px-2 py-1.5 rounded border text-sm" style={inputStyle}>
                                      <option value="skill">Skill</option>
                                      <option value="knowledge">Knowledge</option>
                                      <option value="experience">Experience</option>
                                      <option value="qualification">Qualification</option>
                                      <option value="certification">Certification</option>
                                    </select>
                                    <select value={addGoalForm.priority} onChange={(e) => setAddGoalForm(f => ({ ...f, priority: e.target.value }))} className="px-2 py-1.5 rounded border text-sm" style={inputStyle}>
                                      <option value="low">Low</option>
                                      <option value="medium">Medium</option>
                                      <option value="high">High</option>
                                    </select>
                                    <input type="date" value={addGoalForm.target_date} onChange={(e) => setAddGoalForm(f => ({ ...f, target_date: e.target.value }))} className="px-2 py-1.5 rounded border text-sm" style={inputStyle} />
                                    <input type="number" value={addGoalForm.year} onChange={(e) => setAddGoalForm(f => ({ ...f, year: e.target.value }))} placeholder="Year (1-5)" min={1} max={5} className="px-2 py-1.5 rounded border text-sm" style={inputStyle} />
                                  </div>
                                  <input type="number" value={addGoalForm.cost_estimate} onChange={(e) => setAddGoalForm(f => ({ ...f, cost_estimate: e.target.value }))} placeholder="Cost estimate (optional)" className="w-full px-2 py-1.5 rounded border text-sm" style={inputStyle} />
                                  <div className="flex gap-2 pt-1">
                                    <button onClick={() => handleAddGoal(plan.id)} disabled={!addGoalForm.title.trim()} className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium text-white disabled:opacity-50" style={{ backgroundColor: 'var(--color-primary)' }}>
                                      <Plus size={12} /> Add
                                    </button>
                                    <button onClick={() => setAddingGoalToPlanId(null)} className="px-3 py-1.5 rounded-lg text-xs font-medium hover:bg-[var(--color-grey-2)]" style={{ color: 'var(--color-text-secondary)' }}>Cancel</button>
                                  </div>
                                </div>
                              )}

                              {/* Goals by year chart */}
                              {plan.goals.length > 0 && plan.horizon_years && plan.horizon_years > 1 && (
                                <div className="mt-4 p-3 rounded-lg border" style={{ backgroundColor: 'var(--color-bg)', borderColor: 'var(--color-border)' }}>
                                  <p className="text-xs font-medium mb-2" style={{ color: 'var(--color-text-secondary)' }}>Goals by Year</p>
                                  <BarChart
                                    height={120}
                                    bars={Array.from({ length: plan.horizon_years }, (_, i) => {
                                      const yr = i + 1;
                                      const count = plan.goals.filter(g => g.year === yr).length;
                                      return { label: `Yr ${yr}`, value: count, colour: count > 0 ? 'var(--color-primary)' : 'var(--color-border)' };
                                    })}
                                  />
                                </div>
                              )}
                            </>
                          )}

                          {/* ─── Milestones sub-tab ─── */}
                          {planTab === 'milestones' && (
                            <>
                              <div className="flex justify-end mb-2">
                                <button
                                  onClick={() => setAddingMilestone(true)}
                                  className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium hover:bg-[var(--color-grey-2)]"
                                  style={{ color: 'var(--color-text-secondary)' }}
                                >
                                  <Plus size={12} /> Add Milestone
                                </button>
                              </div>

                              {(plan.milestones || []).length === 0 ? (
                                <p className="text-sm py-4 text-center" style={{ color: 'var(--color-text-secondary)' }}>No milestones set.</p>
                              ) : (
                                <div className="space-y-2">
                                  {[...(plan.milestones || [])].sort((a, b) => a.year - b.year || a.sort_order - b.sort_order).map(ms => {
                                    const isOverdue = ms.status !== 'completed' && ms.target_date && new Date(ms.target_date) < new Date();
                                    const displayStatus = isOverdue ? 'overdue' : ms.status;
                                    return (
                                      <div
                                        key={ms.id}
                                        className="rounded-lg border p-3 flex items-start gap-3"
                                        style={{ backgroundColor: 'var(--color-bg)', borderColor: 'var(--color-border)' }}
                                      >
                                        <div className="mt-0.5">
                                          <Milestone size={16} style={{ color: MILESTONE_STATUS_COLOURS[displayStatus]?.text || '#6b7280' }} />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                          <div className="flex items-center gap-2 flex-wrap">
                                            <span className="font-medium text-sm" style={{ color: 'var(--color-text)' }}>{ms.title}</span>
                                            <StatusBadge status={displayStatus} map={MILESTONE_STATUS_COLOURS} />
                                            <span className="text-xs px-1.5 py-0.5 rounded" style={{ backgroundColor: '#ede9fe', color: '#7c3aed' }}>Yr {ms.year}</span>
                                          </div>
                                          {ms.description && (
                                            <p className="text-xs mt-1" style={{ color: 'var(--color-text-secondary)' }}>{ms.description}</p>
                                          )}
                                          <div className="flex items-center gap-3 mt-1 text-xs" style={{ color: 'var(--color-text-secondary)' }}>
                                            {ms.target_date && <span>Target: {new Date(ms.target_date).toLocaleDateString()}</span>}
                                            {ms.completed_date && <span>Completed: {new Date(ms.completed_date).toLocaleDateString()}</span>}
                                          </div>
                                        </div>
                                        <div className="flex items-center gap-1">
                                          {ms.status !== 'completed' && (
                                            <button
                                              onClick={() => handleUpdateMilestoneStatus(plan.id, ms.id, 'completed')}
                                              className="p-1 rounded hover:bg-[var(--color-grey-2)]"
                                              title="Mark completed"
                                            >
                                              <Check size={14} style={{ color: '#16a34a' }} />
                                            </button>
                                          )}
                                          <button
                                            onClick={() => handleDeleteMilestone(plan.id, ms.id)}
                                            className="p-1 rounded hover:bg-[var(--color-grey-2)]"
                                            title="Delete"
                                          >
                                            <Trash2 size={13} style={{ color: '#dc2626' }} />
                                          </button>
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                              )}

                              {addingMilestone && (
                                <div className="mt-3 p-3 rounded-lg border space-y-2" style={{ backgroundColor: 'var(--color-bg)', borderColor: 'var(--color-border)' }}>
                                  <p className="text-sm font-medium" style={{ color: 'var(--color-text)' }}>Add Milestone</p>
                                  <input type="text" value={milestoneForm.title} onChange={(e) => setMilestoneForm(f => ({ ...f, title: e.target.value }))} placeholder="Milestone title" className="w-full px-2 py-1.5 rounded border text-sm" style={inputStyle} />
                                  <textarea value={milestoneForm.description} onChange={(e) => setMilestoneForm(f => ({ ...f, description: e.target.value }))} placeholder="Description (optional)" rows={2} className="w-full px-2 py-1.5 rounded border text-sm resize-none" style={inputStyle} />
                                  <div className="grid grid-cols-2 gap-2">
                                    <input type="date" value={milestoneForm.target_date} onChange={(e) => setMilestoneForm(f => ({ ...f, target_date: e.target.value }))} className="px-2 py-1.5 rounded border text-sm" style={inputStyle} />
                                    <input type="number" value={milestoneForm.year} onChange={(e) => setMilestoneForm(f => ({ ...f, year: e.target.value }))} placeholder="Year (1-5)" min={1} max={5} className="px-2 py-1.5 rounded border text-sm" style={inputStyle} />
                                  </div>
                                  <div className="flex gap-2 pt-1">
                                    <button onClick={() => handleAddMilestone(plan.id)} disabled={!milestoneForm.title.trim() || !milestoneForm.target_date} className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium text-white disabled:opacity-50" style={{ backgroundColor: 'var(--color-primary)' }}>
                                      <Plus size={12} /> Add
                                    </button>
                                    <button onClick={() => setAddingMilestone(false)} className="px-3 py-1.5 rounded-lg text-xs font-medium hover:bg-[var(--color-grey-2)]" style={{ color: 'var(--color-text-secondary)' }}>Cancel</button>
                                  </div>
                                </div>
                              )}
                            </>
                          )}

                          {/* ─── Checkpoints sub-tab ─── */}
                          {planTab === 'checkpoints' && (
                            <>
                              <div className="flex justify-end mb-2">
                                <button
                                  onClick={() => setAddingCheckpoint(true)}
                                  className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium hover:bg-[var(--color-grey-2)]"
                                  style={{ color: 'var(--color-text-secondary)' }}
                                >
                                  <Plus size={12} /> Add Review
                                </button>
                              </div>

                              {(plan.checkpoints || []).length === 0 ? (
                                <p className="text-sm py-4 text-center" style={{ color: 'var(--color-text-secondary)' }}>No review checkpoints recorded.</p>
                              ) : (
                                <div className="space-y-2">
                                  {[...(plan.checkpoints || [])].sort((a, b) => new Date(b.checkpoint_date).getTime() - new Date(a.checkpoint_date).getTime()).map(cp => (
                                    <div
                                      key={cp.id}
                                      className="rounded-lg border p-3"
                                      style={{ backgroundColor: 'var(--color-bg)', borderColor: 'var(--color-border)' }}
                                    >
                                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                                        <ClipboardCheck size={14} style={{ color: 'var(--color-primary)' }} />
                                        <span className="text-sm font-medium" style={{ color: 'var(--color-text)' }}>
                                          {new Date(cp.checkpoint_date).toLocaleDateString()}
                                        </span>
                                        <StatusBadge status={cp.overall_assessment} map={ASSESSMENT_COLOURS} />
                                      </div>
                                      {cp.notes && (
                                        <p className="text-xs mt-1" style={{ color: 'var(--color-text-secondary)' }}>{cp.notes}</p>
                                      )}
                                    </div>
                                  ))}
                                </div>
                              )}

                              {addingCheckpoint && (
                                <div className="mt-3 p-3 rounded-lg border space-y-2" style={{ backgroundColor: 'var(--color-bg)', borderColor: 'var(--color-border)' }}>
                                  <p className="text-sm font-medium" style={{ color: 'var(--color-text)' }}>Add Review Checkpoint</p>
                                  <div className="grid grid-cols-2 gap-2">
                                    <input type="date" value={checkpointForm.checkpoint_date} onChange={(e) => setCheckpointForm(f => ({ ...f, checkpoint_date: e.target.value }))} className="px-2 py-1.5 rounded border text-sm" style={inputStyle} />
                                    <select value={checkpointForm.overall_assessment} onChange={(e) => setCheckpointForm(f => ({ ...f, overall_assessment: e.target.value }))} className="px-2 py-1.5 rounded border text-sm" style={inputStyle}>
                                      <option value="on_track">On Track</option>
                                      <option value="needs_attention">Needs Attention</option>
                                      <option value="at_risk">At Risk</option>
                                      <option value="exceeded">Exceeded</option>
                                    </select>
                                  </div>
                                  <textarea value={checkpointForm.notes} onChange={(e) => setCheckpointForm(f => ({ ...f, notes: e.target.value }))} placeholder="Review notes..." rows={3} className="w-full px-2 py-1.5 rounded border text-sm resize-none" style={inputStyle} />
                                  <div className="flex gap-2 pt-1">
                                    <button onClick={() => handleAddCheckpoint(plan.id)} disabled={!checkpointForm.checkpoint_date} className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium text-white disabled:opacity-50" style={{ backgroundColor: 'var(--color-primary)' }}>
                                      <Plus size={12} /> Add
                                    </button>
                                    <button onClick={() => setAddingCheckpoint(false)} className="px-3 py-1.5 rounded-lg text-xs font-medium hover:bg-[var(--color-grey-2)]" style={{ color: 'var(--color-text-secondary)' }}>Cancel</button>
                                  </div>
                                </div>
                              )}
                            </>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* ─── Career Pathways Tab ──────────────────────────── */}
      {topTab === 'pathways' && (
        <>
          {pathways.length === 0 ? (
            <div className="text-center py-16" style={{ color: 'var(--color-text-secondary)' }}>
              <Route size={48} className="mx-auto mb-3 opacity-40" />
              <p className="text-lg font-medium mb-1">No career pathways defined</p>
              <p className="text-sm">Create pathways to guide development plans.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {pathways.map(pw => {
                const linkedPlans = plans.filter(p => p.career_pathway_id === pw.id);
                return (
                  <div
                    key={pw.id}
                    className="rounded-xl border p-4"
                    style={{ backgroundColor: 'var(--color-surface)', borderColor: 'var(--color-border)' }}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <h3 className="font-medium text-sm" style={{ color: 'var(--color-text)' }}>{pw.name}</h3>
                        {pw.description && (
                          <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-secondary)' }}>{pw.description}</p>
                        )}
                      </div>
                      <button
                        onClick={() => handleDeletePathway(pw.id)}
                        className="p-1 rounded hover:bg-[var(--color-grey-2)]"
                        title="Delete pathway"
                      >
                        <Trash2 size={13} style={{ color: '#dc2626' }} />
                      </button>
                    </div>

                    {/* Pathway levels */}
                    {pw.levels && pw.levels.length > 0 && (
                      <div className="mt-3">
                        <p className="text-xs font-medium mb-1.5" style={{ color: 'var(--color-text-secondary)' }}>Career Ladder</p>
                        <div className="flex items-center gap-1 flex-wrap">
                          {pw.levels.map((level, i) => (
                            <div key={i} className="flex items-center gap-1">
                              <span
                                className="px-2 py-1 rounded text-xs font-medium"
                                style={{ backgroundColor: '#ede9fe', color: '#7c3aed' }}
                              >
                                {level.title}
                                {level.typical_years && <span className="opacity-70"> ({level.typical_years}yr)</span>}
                              </span>
                              {i < pw.levels!.length - 1 && (
                                <span className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>&rarr;</span>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    <div className="mt-3 pt-2 border-t text-xs" style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-secondary)' }}>
                      {linkedPlans.length} plan{linkedPlans.length !== 1 ? 's' : ''} linked
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* ─── Create Plan Modal ────────────────────────────── */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="rounded-xl shadow-xl w-full max-w-lg mx-4 max-h-[85vh] overflow-y-auto" style={{ backgroundColor: 'var(--color-surface)' }}>
            <div className="p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold" style={{ color: 'var(--color-text)' }}>New Development Plan</h3>
                <button onClick={() => setShowCreateModal(false)} className="p-1 rounded hover:bg-[var(--color-grey-2)]" style={{ color: 'var(--color-text-secondary)' }}>
                  <X size={18} />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium mb-1 block" style={{ color: 'var(--color-text)' }}>Team Member</label>
                  <select value={createForm.user_id} onChange={(e) => setCreateForm(f => ({ ...f, user_id: e.target.value }))} className="w-full px-3 py-2 rounded-lg border text-sm" style={inputStyle}>
                    <option value="">Select a member...</option>
                    {members.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-sm font-medium mb-1 block" style={{ color: 'var(--color-text)' }}>Plan Horizon</label>
                    <select value={createForm.horizon_years} onChange={(e) => setCreateForm(f => ({ ...f, horizon_years: e.target.value }))} className="w-full px-3 py-2 rounded-lg border text-sm" style={inputStyle}>
                      {[1, 2, 3, 4, 5].map(y => <option key={y} value={y}>{y} year{y > 1 ? 's' : ''}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-1 block" style={{ color: 'var(--color-text)' }}>Career Pathway</label>
                    <select value={createForm.career_pathway_id} onChange={(e) => setCreateForm(f => ({ ...f, career_pathway_id: e.target.value }))} className="w-full px-3 py-2 rounded-lg border text-sm" style={inputStyle}>
                      <option value="">None</option>
                      {pathways.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-sm font-medium mb-1 block" style={{ color: 'var(--color-text)' }}>Start Date</label>
                    <input type="date" value={createForm.start_date} onChange={(e) => setCreateForm(f => ({ ...f, start_date: e.target.value }))} className="w-full px-3 py-2 rounded-lg border text-sm" style={inputStyle} />
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-1 block" style={{ color: 'var(--color-text)' }}>End Date</label>
                    <input type="date" value={createForm.end_date} onChange={(e) => setCreateForm(f => ({ ...f, end_date: e.target.value }))} className="w-full px-3 py-2 rounded-lg border text-sm" style={inputStyle} />
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium mb-1 block" style={{ color: 'var(--color-text)' }}>Total Budget ({'\u00A3'})</label>
                  <input type="number" value={createForm.total_budget} onChange={(e) => setCreateForm(f => ({ ...f, total_budget: e.target.value }))} placeholder="Optional" className="w-full px-3 py-2 rounded-lg border text-sm" style={inputStyle} />
                </div>

                <div>
                  <label className="text-sm font-medium mb-1 block" style={{ color: 'var(--color-text)' }}>Career Aspiration</label>
                  <textarea value={createForm.career_aspiration} onChange={(e) => setCreateForm(f => ({ ...f, career_aspiration: e.target.value }))} rows={3} placeholder="Where does this person want to be?" className="w-full px-3 py-2 rounded-lg border text-sm resize-none" style={inputStyle} />
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <button onClick={() => setShowCreateModal(false)} className="px-4 py-2 rounded-lg text-sm font-medium hover:bg-[var(--color-grey-2)]" style={{ color: 'var(--color-text-secondary)' }}>Cancel</button>
                  <button onClick={handleCreatePlan} disabled={!createForm.user_id} className="px-4 py-2 rounded-lg text-sm font-medium text-white disabled:opacity-50" style={{ backgroundColor: 'var(--color-primary)' }}>Create Plan</button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ─── Create Pathway Modal ─────────────────────────── */}
      {showPathwayModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="rounded-xl shadow-xl w-full max-w-md mx-4" style={{ backgroundColor: 'var(--color-surface)' }}>
            <div className="p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold" style={{ color: 'var(--color-text)' }}>New Career Pathway</h3>
                <button onClick={() => setShowPathwayModal(false)} className="p-1 rounded hover:bg-[var(--color-grey-2)]" style={{ color: 'var(--color-text-secondary)' }}>
                  <X size={18} />
                </button>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium mb-1 block" style={{ color: 'var(--color-text)' }}>Name</label>
                  <input type="text" value={pathwayForm.name} onChange={(e) => setPathwayForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. Engineering Leadership" className="w-full px-3 py-2 rounded-lg border text-sm" style={inputStyle} />
                </div>
                <div>
                  <label className="text-sm font-medium mb-1 block" style={{ color: 'var(--color-text)' }}>Description</label>
                  <textarea value={pathwayForm.description} onChange={(e) => setPathwayForm(f => ({ ...f, description: e.target.value }))} rows={3} placeholder="Optional description..." className="w-full px-3 py-2 rounded-lg border text-sm resize-none" style={inputStyle} />
                </div>
                <div className="flex justify-end gap-2 pt-2">
                  <button onClick={() => setShowPathwayModal(false)} className="px-4 py-2 rounded-lg text-sm font-medium hover:bg-[var(--color-grey-2)]" style={{ color: 'var(--color-text-secondary)' }}>Cancel</button>
                  <button onClick={handleCreatePathway} disabled={!pathwayForm.name.trim()} className="px-4 py-2 rounded-lg text-sm font-medium text-white disabled:opacity-50" style={{ backgroundColor: 'var(--color-primary)' }}>Create</button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
