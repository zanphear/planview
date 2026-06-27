import { useState, useEffect } from 'react';
import {
  Target, Plus, ChevronDown, ChevronRight, X,
  Calendar, TrendingUp, CheckCircle, AlertTriangle,
} from 'lucide-react';
import { Toast } from '../components/shared/Toast';
import { StatCard } from '../components/shared/StatCard';
import { DonutChart } from '../components/charts/DonutChart';
import { ProgressRing } from '../components/charts/ProgressRing';
import { COLOURS, STATUS_COLOURS as CHART_STATUS_COLOURS } from '../utils/colours';
import { useWorkspaceStore } from '../stores/workspaceStore';
import { useAuthStore } from '../stores/authStore';
import {
  objectivesApi,
  type Objective,
  type KeyResult,
  type ReviewPeriod,
} from '../api/objectives';

type Status = 'not_started' | 'on_track' | 'at_risk' | 'behind' | 'completed';
type Category = 'personal' | 'team' | 'company';

const STATUS_COLOURS: Record<Status, string> = {
  not_started: 'var(--color-text-secondary)',
  on_track: 'var(--color-success)',
  at_risk: 'var(--color-warning)',
  behind: 'var(--color-danger)',
  completed: 'var(--color-primary)',
};

const STATUS_LABELS: Record<Status, string> = {
  not_started: 'Not Started',
  on_track: 'On Track',
  at_risk: 'At Risk',
  behind: 'Behind',
  completed: 'Completed',
};

const CATEGORY_COLOURS: Record<Category, string> = {
  personal: 'var(--color-teal)',
  team: 'var(--color-primary)',
  company: 'var(--color-warning)',
};

function calcProgress(keyResults: KeyResult[]): number {
  if (keyResults.length === 0) return 0;
  const sum = keyResults.reduce((acc, kr) => {
    const target = kr.target_value || 1;
    return acc + Math.min((kr.current_value / target) * 100, 100);
  }, 0);
  return Math.round(sum / keyResults.length);
}

export function ObjectivesPage() {
  const workspace = useWorkspaceStore((s) => s.currentWorkspace);
  const user = useAuthStore((s) => s.user);

  const [objectives, setObjectives] = useState<Objective[]>([]);
  const [periods, setPeriods] = useState<ReviewPeriod[]>([]);
  const [selectedPeriodId, setSelectedPeriodId] = useState<string | ''>('');
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  const [showNewObjective, setShowNewObjective] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [newCategory, setNewCategory] = useState<Category>('personal');
  const [newWeight, setNewWeight] = useState(100);

  const [addingKrForId, setAddingKrForId] = useState<string | null>(null);
  const [krTitle, setKrTitle] = useState('');
  const [krTarget, setKrTarget] = useState('');
  const [krUnit, setKrUnit] = useState('');
  const [krMeasurement, setKrMeasurement] = useState('numeric');

  const [showPeriodModal, setShowPeriodModal] = useState(false);
  const [periodName, setPeriodName] = useState('');
  const [periodStart, setPeriodStart] = useState('');
  const [periodEnd, setPeriodEnd] = useState('');

  useEffect(() => {
    if (!workspace) return;
    objectivesApi.listPeriods(workspace.id).then((res) => setPeriods(res.data));
  }, [workspace]);

  useEffect(() => {
    if (!workspace) return;
    setLoading(true);
    const params: { period_id?: string } = {};
    if (selectedPeriodId) params.period_id = selectedPeriodId;
    objectivesApi.list(workspace.id, params).then((res) => {
      setObjectives(res.data);
      setLoading(false);
    }).catch((err) => { console.error('Failed to load objectives', err); Toast.show('Failed to load objectives'); setLoading(false); });
  }, [workspace, selectedPeriodId]);

  const toggleExpanded = (id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleCreateObjective = async () => {
    if (!workspace || !user || !newTitle.trim()) return;
    const { data } = await objectivesApi.create(workspace.id, {
      title: newTitle.trim(),
      description: newDescription.trim() || null,
      category: newCategory,
      weight: newWeight,
      review_period_id: selectedPeriodId || null,
      user_id: user.id,
    });
    setObjectives((prev) => [...prev, data]);
    setNewTitle('');
    setNewDescription('');
    setNewCategory('personal');
    setNewWeight(100);
    setShowNewObjective(false);
  };

  const handleAddKeyResult = async (objectiveId: string) => {
    if (!workspace || !krTitle.trim() || !krTarget) return;
    const { data } = await objectivesApi.addKeyResult(workspace.id, objectiveId, {
      title: krTitle.trim(),
      target_value: parseFloat(krTarget),
      unit: krUnit.trim() || null,
      measurement_type: krMeasurement,
    });
    setObjectives((prev) =>
      prev.map((obj) =>
        obj.id === objectiveId
          ? { ...obj, key_results: [...obj.key_results, data], progress: calcProgress([...obj.key_results, data]) }
          : obj
      )
    );
    setKrTitle('');
    setKrTarget('');
    setKrUnit('');
    setKrMeasurement('numeric');
    setAddingKrForId(null);
  };

  const handleUpdateKrValue = async (objectiveId: string, kr: KeyResult, newValue: number) => {
    if (!workspace) return;
    const { data } = await objectivesApi.updateKeyResult(workspace.id, objectiveId, kr.id, {
      current_value: newValue,
    });
    setObjectives((prev) =>
      prev.map((obj) => {
        if (obj.id !== objectiveId) return obj;
        const updatedKrs = obj.key_results.map((k) => (k.id === kr.id ? data : k));
        return { ...obj, key_results: updatedKrs, progress: calcProgress(updatedKrs) };
      })
    );
  };

  const handleUpdateStatus = async (objectiveId: string, status: Status) => {
    if (!workspace) return;
    const { data } = await objectivesApi.update(workspace.id, objectiveId, { status });
    setObjectives((prev) => prev.map((obj) => (obj.id === objectiveId ? data : obj)));
  };

  const handleCreatePeriod = async () => {
    if (!workspace || !periodName.trim() || !periodStart || !periodEnd) return;
    const { data } = await objectivesApi.createPeriod(workspace.id, {
      name: periodName.trim(),
      start_date: periodStart,
      end_date: periodEnd,
    });
    setPeriods((prev) => [...prev, data]);
    setSelectedPeriodId(data.id);
    setPeriodName('');
    setPeriodStart('');
    setPeriodEnd('');
    setShowPeriodModal(false);
  };

  const avgProgress = objectives.length > 0
    ? Math.round(objectives.reduce((sum, o) => sum + (o.progress || 0), 0) / objectives.length)
    : 0;
  const onTrackCount = objectives.filter(o => o.status === 'on_track' || o.status === 'active').length;
  const atRiskCount = objectives.filter(o => o.status === 'at_risk').length;

  const statusCounts = objectives.reduce<Record<string, number>>((acc, o) => {
    const s = o.status || 'not_started';
    acc[s] = (acc[s] || 0) + 1;
    return acc;
  }, {});
  const statusSegments = Object.entries(statusCounts).map(([label, value]) => ({
    label: label.replace(/_/g, ' '),
    value,
    colour: CHART_STATUS_COLOURS[label] || COLOURS.slate,
  }));

  return (
    <div className="p-4 sm:p-6 max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h2 className="text-xl font-semibold flex items-center gap-2" style={{ color: 'var(--color-text)' }}>
          <Target size={22} />
          Objectives &amp; Key Results
        </h2>
        <button
          onClick={() => setShowNewObjective(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium text-white"
          style={{ backgroundColor: 'var(--color-primary)' }}
        >
          <Plus size={16} />
          New Objective
        </button>
      </div>

      {/* Period selector */}
      <div className="flex items-center gap-3 flex-wrap">
        <select
          value={selectedPeriodId}
          onChange={(e) => setSelectedPeriodId(e.target.value)}
          className="text-sm rounded-lg border px-3 py-1.5 outline-none"
          style={{
            backgroundColor: 'var(--color-surface)',
            borderColor: 'var(--color-border)',
            color: 'var(--color-text)',
          }}
        >
          <option value="">All Periods</option>
          {periods.map((p) => (
            <option key={p.id} value={p.id}>{p.name}</option>
          ))}
        </select>
        <button
          onClick={() => setShowPeriodModal(true)}
          className="flex items-center gap-1 text-sm font-medium"
          style={{ color: 'var(--color-primary)' }}
        >
          <Calendar size={14} />
          New Period
        </button>
      </div>

      {/* Stat cards */}
      {!loading && objectives.length > 0 && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <StatCard label="Total Objectives" value={objectives.length} icon={<Target size={20} />} colour={COLOURS.blue} />
          <StatCard label="Avg Progress" value={avgProgress + '%'} icon={<TrendingUp size={20} />} colour={COLOURS.purple} />
          <StatCard label="On Track" value={onTrackCount} icon={<CheckCircle size={20} />} colour={COLOURS.green} />
          <StatCard label="At Risk" value={atRiskCount} icon={<AlertTriangle size={20} />} colour={COLOURS.amber} />
        </div>
      )}

      {/* Status distribution */}
      {!loading && objectives.length > 0 && (
        <div className="rounded-xl border p-5 mb-6" style={{ backgroundColor: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
          <h3 className="text-sm font-semibold mb-4" style={{ color: 'var(--color-text)' }}>Status Distribution</h3>
          <div className="flex items-center gap-6">
            <DonutChart segments={statusSegments} size={120} centerValue={objectives.length} centerLabel="total" />
            <div className="space-y-1.5 flex-1">
              {statusSegments.map(s => (
                <div key={s.label} className="flex items-center gap-2 text-sm">
                  <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: s.colour }} />
                  <span className="capitalize" style={{ color: 'var(--color-text-secondary)' }}>{s.label}</span>
                  <span className="font-medium ml-auto" style={{ color: 'var(--color-text)' }}>{s.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* New objective form */}
      {showNewObjective && (
        <div
          className="rounded-xl border p-5 space-y-4"
          style={{ backgroundColor: 'var(--color-surface)', borderColor: 'var(--color-border)' }}
        >
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold" style={{ color: 'var(--color-text)' }}>
              Create Objective
            </h3>
            <button onClick={() => setShowNewObjective(false)} style={{ color: 'var(--color-text-secondary)' }}>
              <X size={16} />
            </button>
          </div>
          <input
            type="text"
            placeholder="Objective title"
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            className="w-full text-sm rounded-lg border px-3 py-2 outline-none"
            style={{
              backgroundColor: 'var(--color-grey-1)',
              borderColor: 'var(--color-border)',
              color: 'var(--color-text)',
            }}
          />
          <textarea
            placeholder="Description (optional)"
            value={newDescription}
            onChange={(e) => setNewDescription(e.target.value)}
            rows={2}
            className="w-full text-sm rounded-lg border px-3 py-2 outline-none resize-none"
            style={{
              backgroundColor: 'var(--color-grey-1)',
              borderColor: 'var(--color-border)',
              color: 'var(--color-text)',
            }}
          />
          <div className="flex items-center gap-4 flex-wrap">
            <div className="flex items-center gap-2">
              <label className="text-xs font-medium" style={{ color: 'var(--color-text-secondary)' }}>Category</label>
              <select
                value={newCategory}
                onChange={(e) => setNewCategory(e.target.value as Category)}
                className="text-sm rounded-lg border px-2 py-1 outline-none"
                style={{
                  backgroundColor: 'var(--color-grey-1)',
                  borderColor: 'var(--color-border)',
                  color: 'var(--color-text)',
                }}
              >
                <option value="personal">Personal</option>
                <option value="team">Team</option>
                <option value="company">Company</option>
              </select>
            </div>
            <div className="flex items-center gap-2">
              <label className="text-xs font-medium" style={{ color: 'var(--color-text-secondary)' }}>
                Weight: {newWeight}%
              </label>
              <input
                type="range"
                min={0}
                max={100}
                value={newWeight}
                onChange={(e) => setNewWeight(parseInt(e.target.value))}
                className="w-32"
              />
            </div>
          </div>
          <div className="flex justify-end">
            <button
              onClick={handleCreateObjective}
              disabled={!newTitle.trim()}
              className="px-4 py-1.5 rounded-lg text-sm font-medium text-white disabled:opacity-40"
              style={{ backgroundColor: 'var(--color-primary)' }}
            >
              Create
            </button>
          </div>
        </div>
      )}

      {/* Objectives list */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="rounded-xl border p-5 animate-pulse h-20"
              style={{ backgroundColor: 'var(--color-surface)', borderColor: 'var(--color-border)' }}
            />
          ))}
        </div>
      ) : objectives.length === 0 ? (
        <div
          className="rounded-xl border p-10 text-center"
          style={{ backgroundColor: 'var(--color-surface)', borderColor: 'var(--color-border)' }}
        >
          <Target size={48} style={{ color: 'var(--color-text-secondary)' }} className="mx-auto mb-3" />
          <p className="text-sm font-medium" style={{ color: 'var(--color-text)' }}>
            No objectives yet
          </p>
          <p className="text-xs mt-1" style={{ color: 'var(--color-text-secondary)' }}>
            Create your first objective to start tracking key results.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {objectives.map((obj) => {
            const status = obj.status as Status;
            const category = obj.category as Category;
            const expanded = expandedIds.has(obj.id);
            const progress = calcProgress(obj.key_results);

            return (
              <div
                key={obj.id}
                className="rounded-xl border overflow-hidden"
                style={{
                  backgroundColor: 'var(--color-surface)',
                  borderColor: 'var(--color-border)',
                  borderLeftWidth: '4px',
                  borderLeftColor: STATUS_COLOURS[status] || STATUS_COLOURS.not_started,
                }}
              >
                {/* Card header */}
                <div
                  className="flex items-center gap-3 px-4 py-3.5 cursor-pointer hover:bg-[var(--color-grey-1)] transition-colors"
                  onClick={() => toggleExpanded(obj.id)}
                >
                  <div style={{ color: 'var(--color-text-secondary)' }}>
                    {expanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-medium truncate" style={{ color: 'var(--color-text)' }}>
                        {obj.title}
                      </span>
                      <span
                        className="text-[10px] font-semibold uppercase px-1.5 py-0.5 rounded"
                        style={{
                          backgroundColor: (CATEGORY_COLOURS[category] || 'var(--color-text-secondary)') + '18',
                          color: CATEGORY_COLOURS[category] || 'var(--color-text-secondary)',
                        }}
                      >
                        {category}
                      </span>
                      <span
                        className="text-[10px] font-medium px-1.5 py-0.5 rounded"
                        style={{
                          backgroundColor: (STATUS_COLOURS[status] || STATUS_COLOURS.not_started) + '18',
                          color: STATUS_COLOURS[status] || STATUS_COLOURS.not_started,
                        }}
                      >
                        {STATUS_LABELS[status] || status}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <span className="text-xs font-medium" style={{ color: 'var(--color-text-secondary)' }}>
                      {obj.weight}%
                    </span>
                    <ProgressRing value={progress} size={36} colour={CHART_STATUS_COLOURS[status] || COLOURS.blue} />
                  </div>
                </div>

                {/* Expanded content */}
                {expanded && (
                  <div
                    className="px-5 pb-4 pt-1 border-t"
                    style={{ borderColor: 'var(--color-border)' }}
                  >
                    {obj.description && (
                      <p className="text-xs mb-3" style={{ color: 'var(--color-text-secondary)' }}>
                        {obj.description}
                      </p>
                    )}

                    {/* Status selector */}
                    <div className="flex items-center gap-2 mb-3 flex-wrap">
                      <span className="text-xs font-medium" style={{ color: 'var(--color-text-secondary)' }}>
                        Status:
                      </span>
                      {(Object.keys(STATUS_LABELS) as Status[]).map((s) => (
                        <button
                          key={s}
                          onClick={() => handleUpdateStatus(obj.id, s)}
                          className="text-[10px] font-medium px-2 py-0.5 rounded transition-colors"
                          style={{
                            backgroundColor: status === s
                              ? STATUS_COLOURS[s] + '30'
                              : 'var(--color-grey-1)',
                            color: status === s
                              ? STATUS_COLOURS[s]
                              : 'var(--color-text-secondary)',
                            border: status === s ? `1px solid ${STATUS_COLOURS[s]}` : '1px solid transparent',
                          }}
                        >
                          {STATUS_LABELS[s]}
                        </button>
                      ))}
                    </div>

                    {/* Key results */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <h4 className="text-xs font-semibold flex items-center gap-1" style={{ color: 'var(--color-text)' }}>
                          <TrendingUp size={12} />
                          Key Results ({obj.key_results.length})
                        </h4>
                        <button
                          onClick={() => setAddingKrForId(addingKrForId === obj.id ? null : obj.id)}
                          className="text-xs font-medium flex items-center gap-1"
                          style={{ color: 'var(--color-primary)' }}
                        >
                          <Plus size={12} />
                          Add
                        </button>
                      </div>

                      {obj.key_results.map((kr) => {
                        const krProgress = kr.target_value > 0
                          ? Math.min(Math.round((kr.current_value / kr.target_value) * 100), 100)
                          : 0;
                        return (
                          <div
                            key={kr.id}
                            className="flex items-center gap-3 px-3 py-2 rounded-lg"
                            style={{ backgroundColor: 'var(--color-grey-1)' }}
                          >
                            <span className="text-xs flex-1 truncate" style={{ color: 'var(--color-text)' }}>
                              {kr.title}
                            </span>
                            <div className="flex items-center gap-2 shrink-0">
                              <input
                                type="number"
                                value={kr.current_value}
                                onChange={(e) => handleUpdateKrValue(obj.id, kr, parseFloat(e.target.value) || 0)}
                                className="w-16 text-xs text-right rounded border px-1.5 py-0.5 outline-none"
                                style={{
                                  backgroundColor: 'var(--color-surface)',
                                  borderColor: 'var(--color-border)',
                                  color: 'var(--color-text)',
                                }}
                                onClick={(e) => e.stopPropagation()}
                              />
                              <span className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>
                                / {kr.target_value}{kr.unit ? ` ${kr.unit}` : ''}
                              </span>
                              <div className="w-16 h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: 'var(--color-grey-2)' }}>
                                <div
                                  className="h-full rounded-full transition-colors"
                                  style={{ width: `${krProgress}%`, backgroundColor: 'var(--color-primary)' }}
                                />
                              </div>
                              <span className="text-[10px] font-medium w-8 text-right" style={{ color: 'var(--color-text-secondary)' }}>
                                {krProgress}%
                              </span>
                            </div>
                          </div>
                        );
                      })}

                      {obj.key_results.length === 0 && addingKrForId !== obj.id && (
                        <p className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>
                          No key results yet. Add one to track progress.
                        </p>
                      )}

                      {/* Add key result form */}
                      {addingKrForId === obj.id && (
                        <div
                          className="rounded-lg border p-3 space-y-2 mt-2"
                          style={{ borderColor: 'var(--color-border)' }}
                        >
                          <input
                            type="text"
                            placeholder="Key result title"
                            value={krTitle}
                            onChange={(e) => setKrTitle(e.target.value)}
                            className="w-full text-xs rounded border px-2 py-1.5 outline-none"
                            style={{
                              backgroundColor: 'var(--color-grey-1)',
                              borderColor: 'var(--color-border)',
                              color: 'var(--color-text)',
                            }}
                          />
                          <div className="flex items-center gap-2 flex-wrap">
                            <input
                              type="number"
                              placeholder="Target"
                              value={krTarget}
                              onChange={(e) => setKrTarget(e.target.value)}
                              className="w-24 text-xs rounded border px-2 py-1.5 outline-none"
                              style={{
                                backgroundColor: 'var(--color-grey-1)',
                                borderColor: 'var(--color-border)',
                                color: 'var(--color-text)',
                              }}
                            />
                            <input
                              type="text"
                              placeholder="Unit (optional)"
                              value={krUnit}
                              onChange={(e) => setKrUnit(e.target.value)}
                              className="w-28 text-xs rounded border px-2 py-1.5 outline-none"
                              style={{
                                backgroundColor: 'var(--color-grey-1)',
                                borderColor: 'var(--color-border)',
                                color: 'var(--color-text)',
                              }}
                            />
                            <select
                              value={krMeasurement}
                              onChange={(e) => setKrMeasurement(e.target.value)}
                              className="text-xs rounded border px-2 py-1.5 outline-none"
                              style={{
                                backgroundColor: 'var(--color-grey-1)',
                                borderColor: 'var(--color-border)',
                                color: 'var(--color-text)',
                              }}
                            >
                              <option value="numeric">Numeric</option>
                              <option value="percentage">Percentage</option>
                              <option value="currency">Currency</option>
                              <option value="boolean">Boolean</option>
                            </select>
                          </div>
                          <div className="flex justify-end gap-2">
                            <button
                              onClick={() => setAddingKrForId(null)}
                              className="text-xs px-2 py-1 rounded"
                              style={{ color: 'var(--color-text-secondary)' }}
                            >
                              Cancel
                            </button>
                            <button
                              onClick={() => handleAddKeyResult(obj.id)}
                              disabled={!krTitle.trim() || !krTarget}
                              className="text-xs px-3 py-1 rounded font-medium text-white disabled:opacity-40"
                              style={{ backgroundColor: 'var(--color-primary)' }}
                            >
                              Add
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Create period modal */}
      {showPeriodModal && (
        <PeriodModal
          periodName={periodName} setPeriodName={setPeriodName}
          periodStart={periodStart} setPeriodStart={setPeriodStart}
          periodEnd={periodEnd} setPeriodEnd={setPeriodEnd}
          onClose={() => setShowPeriodModal(false)}
          onSubmit={handleCreatePeriod}
        />
      )}
    </div>
  );
}

function PeriodModal({ periodName, setPeriodName, periodStart, setPeriodStart, periodEnd, setPeriodEnd, onClose, onSubmit }: {
  periodName: string; setPeriodName: (v: string) => void;
  periodStart: string; setPeriodStart: (v: string) => void;
  periodEnd: string; setPeriodEnd: (v: string) => void;
  onClose: () => void; onSubmit: () => void;
}) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  const handleSubmit = (e: React.FormEvent) => { e.preventDefault(); onSubmit(); };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <form
        onSubmit={handleSubmit}
        className="rounded-xl border p-6 w-full max-w-md space-y-4 shadow-xl"
        style={{ backgroundColor: 'var(--color-surface)', borderColor: 'var(--color-border)' }}
      >
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold" style={{ color: 'var(--color-text)' }}>Create Review Period</h3>
          <button type="button" onClick={onClose} style={{ color: 'var(--color-text-secondary)' }}><X size={16} /></button>
        </div>
        <input type="text" placeholder="Period name (e.g. Q1 2026)" value={periodName} onChange={(e) => setPeriodName(e.target.value)}
          className="w-full text-sm rounded-lg border px-3 py-2 outline-none"
          style={{ backgroundColor: 'var(--color-grey-1)', borderColor: 'var(--color-border)', color: 'var(--color-text)' }} />
        <div className="flex gap-3">
          <div className="flex-1">
            <label className="text-xs font-medium block mb-1" style={{ color: 'var(--color-text-secondary)' }}>Start Date</label>
            <input type="date" value={periodStart} onChange={(e) => setPeriodStart(e.target.value)}
              className="w-full text-sm rounded-lg border px-3 py-2 outline-none"
              style={{ backgroundColor: 'var(--color-grey-1)', borderColor: 'var(--color-border)', color: 'var(--color-text)' }} />
          </div>
          <div className="flex-1">
            <label className="text-xs font-medium block mb-1" style={{ color: 'var(--color-text-secondary)' }}>End Date</label>
            <input type="date" value={periodEnd} onChange={(e) => setPeriodEnd(e.target.value)}
              className="w-full text-sm rounded-lg border px-3 py-2 outline-none"
              style={{ backgroundColor: 'var(--color-grey-1)', borderColor: 'var(--color-border)', color: 'var(--color-text)' }} />
          </div>
        </div>
        <div className="flex justify-end gap-2">
          <button type="button" onClick={onClose} className="px-3 py-1.5 rounded-lg text-sm" style={{ color: 'var(--color-text-secondary)' }}>Cancel</button>
          <button type="submit" disabled={!periodName.trim() || !periodStart || !periodEnd}
            className="px-4 py-1.5 rounded-lg text-sm font-medium text-white disabled:opacity-40"
            style={{ backgroundColor: 'var(--color-primary)' }}>Create</button>
        </div>
      </form>
    </div>
  );
}
