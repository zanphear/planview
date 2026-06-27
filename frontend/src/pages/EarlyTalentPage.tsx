import { useState, useEffect, useCallback } from 'react';
import {
  GraduationCap,
  Plus,
  Users,
  ChevronDown,
  ChevronUp,
  X,
  Briefcase,
  Calendar,
  Award,
  UserCheck,
  BarChart3,
  Clock,
  Trash2,
} from 'lucide-react';
import { useWorkspaceStore } from '../stores/workspaceStore';
import { membersApi } from '../api/users';
import type { User } from '../api/users';
import { earlyTalentApi } from '../api/earlyTalent';
import type {
  EarlyTalentProgramme,
  EarlyTalentCohort,
  EarlyTalentParticipant,
  EarlyTalentRotation,
  EarlyTalentDashboardStats,
} from '../api/earlyTalent';
import { DonutChart } from '../components/charts/DonutChart';
import { BarChart } from '../components/charts/BarChart';
import { ProgressRing } from '../components/charts/ProgressRing';

type Tab = 'programmes' | 'participants' | 'dashboard';

type ProgrammeType = 'graduate' | 'apprentice' | 'intern' | 'industrial_placement';
type ParticipantStatus = 'enrolled' | 'active' | 'on_probation' | 'completed' | 'withdrawn';

const PROGRAMME_TYPE_LABELS: Record<ProgrammeType, string> = {
  graduate: 'Graduate',
  apprentice: 'Apprentice',
  intern: 'Intern',
  industrial_placement: 'Industrial Placement',
};

const STATUS_COLOURS: Record<string, { bg: string; text: string }> = {
  draft: { bg: '#f3f4f6', text: '#6b7280' },
  active: { bg: '#dbeafe', text: '#2563eb' },
  completed: { bg: '#dcfce7', text: '#16a34a' },
  archived: { bg: '#fef3c7', text: '#d97706' },
  forming: { bg: '#ede9fe', text: '#7c3aed' },
  enrolled: { bg: '#dbeafe', text: '#2563eb' },
  on_probation: { bg: '#fef3c7', text: '#d97706' },
  withdrawn: { bg: '#fee2e2', text: '#dc2626' },
  scheduled: { bg: '#f3f4f6', text: '#6b7280' },
  in_progress: { bg: '#fef3c7', text: '#d97706' },
  pending: { bg: '#f3f4f6', text: '#6b7280' },
  overdue: { bg: '#fee2e2', text: '#dc2626' },
};

function StatusBadge({ status }: { status: string }) {
  const s = STATUS_COLOURS[status] || { bg: '#f3f4f6', text: '#6b7280' };
  return (
    <span
      style={{ backgroundColor: s.bg, color: s.text }}
      className="px-2 py-0.5 rounded-full text-xs font-medium capitalize"
    >
      {status.replace('_', ' ')}
    </span>
  );
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .map((p) => p[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

export function EarlyTalentPage() {
  const workspace = useWorkspaceStore((s) => s.currentWorkspace);
  const [tab, setTab] = useState<Tab>('programmes');
  const [programmes, setProgrammes] = useState<EarlyTalentProgramme[]>([]);
  const [participants, setParticipants] = useState<EarlyTalentParticipant[]>([]);
  const [members, setMembers] = useState<User[]>([]);
  const [stats, setStats] = useState<EarlyTalentDashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  const [expandedProgrammeId, setExpandedProgrammeId] = useState<string | null>(null);
  const [programmeCohorts, setProgrammeCohorts] = useState<Record<string, EarlyTalentCohort[]>>({});
  const [programmeRotations, setProgrammeRotations] = useState<
    Record<string, EarlyTalentRotation[]>
  >({});

  const [showCreateProgramme, setShowCreateProgramme] = useState(false);
  const [showEnrolParticipant, setShowEnrolParticipant] = useState(false);
  const [filterProgrammeId, setFilterProgrammeId] = useState('');
  const [filterStatus, setFilterStatus] = useState('');

  const [createForm, setCreateForm] = useState({
    name: '',
    programme_type: 'graduate' as ProgrammeType,
    description: '',
    start_date: '',
    end_date: '',
    duration_months: '',
  });

  const [enrolForm, setEnrolForm] = useState({
    programme_id: '',
    user_id: '',
    qualification_target: '',
    university: '',
    qualification_level: '',
    start_date: '',
    expected_end_date: '',
    notes: '',
  });

  const loadData = useCallback(async () => {
    if (!workspace) return;
    setLoading(true);
    try {
      const params: Record<string, string> = {};
      if (filterProgrammeId) params.programme_id = filterProgrammeId;
      if (filterStatus) params.status = filterStatus;

      const [progRes, partRes, membersRes] = await Promise.all([
        earlyTalentApi.listProgrammes(workspace.id),
        earlyTalentApi.listParticipants(
          workspace.id,
          Object.keys(params).length > 0 ? params : undefined,
        ),
        membersApi.list(workspace.id),
      ]);
      setProgrammes(progRes.data);
      setParticipants(partRes.data);
      setMembers(membersRes.data);
    } catch (err) {
      console.error('Failed to load early talent data:', err);
    } finally {
      setLoading(false);
    }
  }, [workspace, filterProgrammeId, filterStatus]);

  const loadStats = useCallback(async () => {
    if (!workspace) return;
    try {
      const { data } = await earlyTalentApi.stats(workspace.id);
      setStats(data);
    } catch {
      /* ignore */
    }
  }, [workspace]);

  useEffect(() => {
    loadData();
  }, [loadData]);
  useEffect(() => {
    if (tab === 'dashboard') loadStats();
  }, [tab, loadStats]);

  const loadProgrammeDetails = async (progId: string) => {
    if (!workspace) return;
    try {
      const [cohortsRes, rotationsRes] = await Promise.all([
        earlyTalentApi.listCohorts(workspace.id, progId),
        earlyTalentApi.listRotations(workspace.id, progId),
      ]);
      setProgrammeCohorts((prev) => ({ ...prev, [progId]: cohortsRes.data }));
      setProgrammeRotations((prev) => ({ ...prev, [progId]: rotationsRes.data }));
    } catch {
      /* ignore */
    }
  };

  const handleExpandProgramme = (progId: string) => {
    if (expandedProgrammeId === progId) {
      setExpandedProgrammeId(null);
    } else {
      setExpandedProgrammeId(progId);
      if (!programmeCohorts[progId]) loadProgrammeDetails(progId);
    }
  };

  const getMember = (userId: string) => members.find((u) => u.id === userId);

  const handleCreateProgramme = async () => {
    if (!workspace || !createForm.name.trim()) return;
    try {
      await earlyTalentApi.createProgramme(workspace.id, {
        name: createForm.name,
        programme_type: createForm.programme_type,
        description: createForm.description || null,
        start_date: createForm.start_date || new Date().toISOString().slice(0, 10),
        end_date: createForm.end_date || null,
        duration_months: createForm.duration_months ? parseInt(createForm.duration_months) : null,
      });
      setShowCreateProgramme(false);
      setCreateForm({
        name: '',
        programme_type: 'graduate',
        description: '',
        start_date: '',
        end_date: '',
        duration_months: '',
      });
      await loadData();
    } catch (err) {
      console.error('Failed to create programme:', err);
    }
  };

  const handleEnrolParticipant = async () => {
    if (!workspace || !enrolForm.programme_id || !enrolForm.user_id) return;
    try {
      await earlyTalentApi.createParticipant(workspace.id, {
        programme_id: enrolForm.programme_id,
        user_id: enrolForm.user_id,
        qualification_target: enrolForm.qualification_target || null,
        university: enrolForm.university || null,
        qualification_level: enrolForm.qualification_level || null,
        start_date: enrolForm.start_date || null,
        expected_end_date: enrolForm.expected_end_date || null,
        notes: enrolForm.notes || null,
      });
      setShowEnrolParticipant(false);
      setEnrolForm({
        programme_id: '',
        user_id: '',
        qualification_target: '',
        university: '',
        qualification_level: '',
        start_date: '',
        expected_end_date: '',
        notes: '',
      });
      await loadData();
    } catch (err) {
      console.error('Failed to enrol participant:', err);
    }
  };

  const handleDeleteProgramme = async (id: string) => {
    if (!workspace) return;
    try {
      await earlyTalentApi.deleteProgramme(workspace.id, id);
      await loadData();
    } catch (err) {
      console.error('Failed to delete programme:', err);
    }
  };

  const handleUpdateParticipantStatus = async (id: string, status: string) => {
    if (!workspace) return;
    try {
      await earlyTalentApi.updateParticipant(workspace.id, id, { status });
      await loadData();
    } catch (err) {
      console.error('Failed to update participant:', err);
    }
  };

  if (loading && programmes.length === 0) {
    return (
      <div className="p-6 flex items-center justify-center h-64">
        <div
          className="animate-spin rounded-full h-8 w-8 border-b-2"
          style={{ borderColor: 'var(--color-primary)' }}
        />
      </div>
    );
  }

  const tabs: { key: Tab; label: string; icon: typeof GraduationCap }[] = [
    { key: 'programmes', label: 'Programmes', icon: Briefcase },
    { key: 'participants', label: 'Participants', icon: Users },
    { key: 'dashboard', label: 'Dashboard', icon: BarChart3 },
  ];

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h2
          className="text-xl font-semibold flex items-center gap-2"
          style={{ color: 'var(--color-text)' }}
        >
          <GraduationCap size={22} />
          Early Talent
        </h2>
        <div className="flex items-center gap-2">
          {tab === 'programmes' && (
            <button
              onClick={() => setShowCreateProgramme(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium text-white transition-colors"
              style={{ backgroundColor: 'var(--color-primary)' }}
            >
              <Plus size={16} /> New Programme
            </button>
          )}
          {tab === 'participants' && (
            <button
              onClick={() => setShowEnrolParticipant(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium text-white transition-colors"
              style={{ backgroundColor: 'var(--color-primary)' }}
            >
              <Plus size={16} /> Enrol Participant
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 border-b" style={{ borderColor: 'var(--color-border)' }}>
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
              tab === t.key
                ? 'border-accent text-accent'
                : 'border-transparent hover:border-gray-300'
            }`}
            style={tab !== t.key ? { color: 'var(--color-text-secondary)' } : undefined}
          >
            <t.icon size={14} />
            {t.label}
          </button>
        ))}
      </div>

      {/* Programmes Tab */}
      {tab === 'programmes' && (
        <div className="space-y-3">
          {programmes.length === 0 ? (
            <div className="text-center py-16" style={{ color: 'var(--color-text-secondary)' }}>
              <GraduationCap size={48} className="mx-auto mb-3 opacity-40" />
              <p className="text-lg font-medium mb-1">No programmes yet</p>
              <p className="text-sm">Create a graduate or apprentice programme to get started.</p>
            </div>
          ) : (
            programmes.map((prog) => {
              const isExpanded = expandedProgrammeId === prog.id;
              const progParticipants = participants.filter((p) => p.programme_id === prog.id);
              const cohorts = programmeCohorts[prog.id] || [];
              const rotations = programmeRotations[prog.id] || [];

              return (
                <div
                  key={prog.id}
                  className="rounded-xl border overflow-hidden"
                  style={{
                    backgroundColor: 'var(--color-surface)',
                    borderColor: 'var(--color-border)',
                  }}
                >
                  <button
                    onClick={() => handleExpandProgramme(prog.id)}
                    className="w-full flex items-center gap-3 p-4 text-left hover:bg-muted transition-colors"
                  >
                    <div className="p-2 rounded-lg bg-purple-500/10">
                      <GraduationCap size={18} className="text-purple-500" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span
                          className="font-medium text-sm"
                          style={{ color: 'var(--color-text)' }}
                        >
                          {prog.name}
                        </span>
                        <StatusBadge status={prog.status} />
                        <span className="text-xs px-2 py-0.5 rounded-full bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400 font-medium capitalize">
                          {PROGRAMME_TYPE_LABELS[prog.programme_type as ProgrammeType] ||
                            prog.programme_type}
                        </span>
                      </div>
                      <div
                        className="flex items-center gap-3 text-xs"
                        style={{ color: 'var(--color-text-secondary)' }}
                      >
                        <span>
                          <Calendar size={11} className="inline mr-1" />
                          {new Date(prog.start_date).toLocaleDateString('en-GB', {
                            month: 'short',
                            year: 'numeric',
                          })}
                        </span>
                        {prog.duration_months && <span>{prog.duration_months} months</span>}
                        <span>
                          <Users size={11} className="inline mr-1" />
                          {progParticipants.length} participants
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteProgramme(prog.id);
                        }}
                        className="p-1.5 rounded hover:bg-red-100 dark:hover:bg-red-900/30"
                        title="Delete programme"
                      >
                        <Trash2 size={14} className="text-red-500" />
                      </button>
                      {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                    </div>
                  </button>

                  {isExpanded && (
                    <div
                      className="border-t px-4 pb-4"
                      style={{ borderColor: 'var(--color-border)' }}
                    >
                      {prog.description && (
                        <p
                          className="text-sm py-3"
                          style={{ color: 'var(--color-text-secondary)' }}
                        >
                          {prog.description}
                        </p>
                      )}

                      {/* Cohorts */}
                      <div className="mb-4">
                        <h4
                          className="text-xs font-semibold uppercase tracking-wider mb-2"
                          style={{ color: 'var(--color-text-secondary)' }}
                        >
                          Cohorts ({cohorts.length})
                        </h4>
                        {cohorts.length === 0 ? (
                          <p className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>
                            No cohorts defined.
                          </p>
                        ) : (
                          <div className="space-y-1">
                            {cohorts.map((c) => (
                              <div
                                key={c.id}
                                className="flex items-center gap-2 text-sm p-2 rounded-lg"
                                style={{ backgroundColor: 'var(--color-bg)' }}
                              >
                                <Users size={14} style={{ color: 'var(--color-text-secondary)' }} />
                                <span style={{ color: 'var(--color-text)' }}>{c.name}</span>
                                <StatusBadge status={c.status} />
                                <span
                                  className="text-xs ml-auto"
                                  style={{ color: 'var(--color-text-secondary)' }}
                                >
                                  Intake: {new Date(c.intake_date).toLocaleDateString('en-GB')}
                                </span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Rotations */}
                      <div className="mb-4">
                        <h4
                          className="text-xs font-semibold uppercase tracking-wider mb-2"
                          style={{ color: 'var(--color-text-secondary)' }}
                        >
                          Rotations ({rotations.length})
                        </h4>
                        {rotations.length === 0 ? (
                          <p className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>
                            No rotations defined.
                          </p>
                        ) : (
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                            {rotations.map((r) => (
                              <div
                                key={r.id}
                                className="flex items-start gap-2 text-sm p-2 rounded-lg"
                                style={{ backgroundColor: 'var(--color-bg)' }}
                              >
                                <Briefcase
                                  size={14}
                                  className="mt-0.5"
                                  style={{ color: 'var(--color-text-secondary)' }}
                                />
                                <div>
                                  <span
                                    className="font-medium"
                                    style={{ color: 'var(--color-text)' }}
                                  >
                                    {r.name}
                                  </span>
                                  <div
                                    className="text-xs"
                                    style={{ color: 'var(--color-text-secondary)' }}
                                  >
                                    {r.department && <span>{r.department} · </span>}
                                    {r.duration_weeks} weeks
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Participants in this programme */}
                      <div>
                        <h4
                          className="text-xs font-semibold uppercase tracking-wider mb-2"
                          style={{ color: 'var(--color-text-secondary)' }}
                        >
                          Participants ({progParticipants.length})
                        </h4>
                        {progParticipants.length === 0 ? (
                          <p className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>
                            No participants enrolled.
                          </p>
                        ) : (
                          <div className="space-y-1">
                            {progParticipants.map((p) => {
                              const member = getMember(p.user_id);
                              const mentor = p.mentor_id ? getMember(p.mentor_id) : null;
                              return (
                                <div
                                  key={p.id}
                                  className="flex items-center gap-2 text-sm p-2 rounded-lg"
                                  style={{ backgroundColor: 'var(--color-bg)' }}
                                >
                                  <div
                                    className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-semibold shrink-0"
                                    style={{ backgroundColor: member?.colour || '#6b7280' }}
                                  >
                                    {member?.initials || getInitials(member?.name || '?')}
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <span
                                      className="font-medium"
                                      style={{ color: 'var(--color-text)' }}
                                    >
                                      {member?.name || 'Unknown'}
                                    </span>
                                    {p.qualification_target && (
                                      <span
                                        className="text-xs ml-2"
                                        style={{ color: 'var(--color-text-secondary)' }}
                                      >
                                        {p.qualification_target}
                                      </span>
                                    )}
                                  </div>
                                  <StatusBadge status={p.status} />
                                  {mentor && (
                                    <span
                                      className="text-xs"
                                      style={{ color: 'var(--color-text-secondary)' }}
                                    >
                                      <UserCheck size={11} className="inline mr-0.5" />
                                      Mentor: {mentor.name}
                                    </span>
                                  )}
                                  <div
                                    className="flex items-center gap-1 text-xs"
                                    style={{ color: 'var(--color-text-secondary)' }}
                                  >
                                    <Award size={11} />
                                    {p.qualification_progress}%
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      )}

      {/* Participants Tab */}
      {tab === 'participants' && (
        <div>
          <div className="flex items-center gap-3 mb-4">
            <select
              value={filterProgrammeId}
              onChange={(e) => setFilterProgrammeId(e.target.value)}
              className="px-3 py-1.5 rounded-lg border text-sm"
              style={{
                backgroundColor: 'var(--color-surface)',
                borderColor: 'var(--color-border)',
                color: 'var(--color-text)',
              }}
            >
              <option value="">All programmes</option>
              {programmes.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="px-3 py-1.5 rounded-lg border text-sm"
              style={{
                backgroundColor: 'var(--color-surface)',
                borderColor: 'var(--color-border)',
                color: 'var(--color-text)',
              }}
            >
              <option value="">All statuses</option>
              {(
                [
                  'enrolled',
                  'active',
                  'on_probation',
                  'completed',
                  'withdrawn',
                ] as ParticipantStatus[]
              ).map((s) => (
                <option key={s} value={s}>
                  {s.replace('_', ' ')}
                </option>
              ))}
            </select>
          </div>

          {participants.length === 0 ? (
            <div className="text-center py-16" style={{ color: 'var(--color-text-secondary)' }}>
              <Users size={48} className="mx-auto mb-3 opacity-40" />
              <p className="text-lg font-medium mb-1">No participants found</p>
              <p className="text-sm">Enrol team members into a programme to get started.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {participants.map((p) => {
                const member = getMember(p.user_id);
                const mentor = p.mentor_id ? getMember(p.mentor_id) : null;
                const buddy = p.buddy_id ? getMember(p.buddy_id) : null;
                const prog = programmes.find((pr) => pr.id === p.programme_id);

                return (
                  <div
                    key={p.id}
                    className="rounded-xl border p-4"
                    style={{
                      backgroundColor: 'var(--color-surface)',
                      borderColor: 'var(--color-border)',
                    }}
                  >
                    <div className="flex items-start gap-3">
                      <div
                        className="w-10 h-10 rounded-full flex items-center justify-center text-white font-semibold shrink-0"
                        style={{ backgroundColor: member?.colour || '#6b7280' }}
                      >
                        {member?.initials || getInitials(member?.name || '?')}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-medium" style={{ color: 'var(--color-text)' }}>
                            {member?.name || 'Unknown'}
                          </span>
                          <StatusBadge status={p.status} />
                          {prog && (
                            <span className="text-xs px-2 py-0.5 rounded-full bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400 font-medium">
                              {prog.name}
                            </span>
                          )}
                        </div>
                        <div
                          className="flex items-center gap-3 text-xs mt-1 flex-wrap"
                          style={{ color: 'var(--color-text-secondary)' }}
                        >
                          {p.qualification_target && (
                            <span>
                              <Award size={11} className="inline mr-0.5" />
                              {p.qualification_target}
                            </span>
                          )}
                          {p.university && <span>{p.university}</span>}
                          {p.start_date && (
                            <span>
                              <Calendar size={11} className="inline mr-0.5" />
                              Started {new Date(p.start_date).toLocaleDateString('en-GB')}
                            </span>
                          )}
                          {mentor && (
                            <span>
                              <UserCheck size={11} className="inline mr-0.5" />
                              Mentor: {mentor.name}
                            </span>
                          )}
                          {buddy && <span>Buddy: {buddy.name}</span>}
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-1">
                        <div className="flex items-center gap-1">
                          <span
                            className="text-xs font-medium"
                            style={{ color: 'var(--color-text-secondary)' }}
                          >
                            Qualification
                          </span>
                          <div
                            className="w-24 h-2 rounded-full overflow-hidden"
                            style={{ backgroundColor: 'var(--color-grey-2)' }}
                          >
                            <div
                              className="h-full rounded-full transition-colors"
                              style={{
                                width: `${p.qualification_progress}%`,
                                backgroundColor:
                                  p.qualification_progress >= 75
                                    ? '#22c55e'
                                    : p.qualification_progress >= 50
                                      ? '#f59e0b'
                                      : 'var(--color-primary)',
                              }}
                            />
                          </div>
                          <span
                            className="text-xs font-semibold w-8 text-right"
                            style={{ color: 'var(--color-text)' }}
                          >
                            {p.qualification_progress}%
                          </span>
                        </div>
                        <div className="flex gap-1">
                          {p.status !== 'completed' && p.status !== 'withdrawn' && (
                            <select
                              value={p.status}
                              onChange={(e) => handleUpdateParticipantStatus(p.id, e.target.value)}
                              className="text-xs px-2 py-1 rounded border"
                              style={{
                                backgroundColor: 'var(--color-surface)',
                                borderColor: 'var(--color-border)',
                                color: 'var(--color-text)',
                              }}
                            >
                              <option value="enrolled">Enrolled</option>
                              <option value="active">Active</option>
                              <option value="on_probation">On Probation</option>
                              <option value="completed">Completed</option>
                              <option value="withdrawn">Withdrawn</option>
                            </select>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Dashboard Tab */}
      {tab === 'dashboard' && stats && (
        <div className="space-y-6">
          {/* Summary cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              {
                label: 'Active Programmes',
                value: stats.active_programmes,
                total: stats.total_programmes,
                icon: Briefcase,
                colour: '#8A00E5',
              },
              {
                label: 'Active Participants',
                value: stats.active_participants,
                total: stats.total_participants,
                icon: Users,
                colour: '#2563eb',
              },
              {
                label: 'Avg Qualification',
                value: `${Math.round(stats.avg_qualification_progress)}%`,
                icon: Award,
                colour: '#16a34a',
              },
              {
                label: 'Overdue Milestones',
                value: stats.overdue_milestones,
                icon: Clock,
                colour: stats.overdue_milestones > 0 ? '#dc2626' : '#6b7280',
              },
            ].map((card) => (
              <div
                key={card.label}
                className="rounded-xl border p-4"
                style={{
                  backgroundColor: 'var(--color-surface)',
                  borderColor: 'var(--color-border)',
                }}
              >
                <div className="flex items-center gap-2 mb-2">
                  <card.icon size={16} style={{ color: card.colour }} />
                  <span
                    className="text-xs font-medium"
                    style={{ color: 'var(--color-text-secondary)' }}
                  >
                    {card.label}
                  </span>
                </div>
                <div className="text-2xl font-bold" style={{ color: 'var(--color-text)' }}>
                  {card.value}
                  {'total' in card && card.total != null && (
                    <span
                      className="text-sm font-normal"
                      style={{ color: 'var(--color-text-secondary)' }}
                    >
                      {' '}
                      / {card.total}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Charts row */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {Object.keys(stats.by_type).length > 0 && (
              <div
                className="rounded-xl border p-4"
                style={{
                  backgroundColor: 'var(--color-surface)',
                  borderColor: 'var(--color-border)',
                }}
              >
                <h3 className="text-sm font-semibold mb-3" style={{ color: 'var(--color-text)' }}>
                  By Programme Type
                </h3>
                <DonutChart
                  segments={Object.entries(stats.by_type).map(([label, value], i) => ({
                    label: PROGRAMME_TYPE_LABELS[label as ProgrammeType] || label,
                    value,
                    colour: ['#8A00E5', '#3b82f6', '#10b981', '#f59e0b'][i % 4],
                  }))}
                  size={180}
                />
              </div>
            )}
            {Object.keys(stats.by_status).length > 0 && (
              <div
                className="rounded-xl border p-4"
                style={{
                  backgroundColor: 'var(--color-surface)',
                  borderColor: 'var(--color-border)',
                }}
              >
                <h3 className="text-sm font-semibold mb-3" style={{ color: 'var(--color-text)' }}>
                  Participants by Status
                </h3>
                <BarChart
                  bars={Object.entries(stats.by_status).map(([label, value], i) => ({
                    label: label.replace('_', ' '),
                    value,
                    colour: ['#8A00E5', '#3b82f6', '#10b981', '#f59e0b', '#ef4444'][i % 5],
                  }))}
                  height={180}
                />
              </div>
            )}
          </div>

          {/* Completion rate */}
          <div
            className="rounded-xl border p-4 flex items-center gap-6"
            style={{ backgroundColor: 'var(--color-surface)', borderColor: 'var(--color-border)' }}
          >
            <ProgressRing value={Math.round(stats.cohort_completion_rate)} size={80} />
            <div>
              <h3 className="text-sm font-semibold" style={{ color: 'var(--color-text)' }}>
                Cohort Completion Rate
              </h3>
              <p className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>
                Percentage of cohort participants who have completed their programmes.
              </p>
            </div>
          </div>
        </div>
      )}

      {tab === 'dashboard' && !stats && (
        <div className="flex items-center justify-center py-16">
          <div
            className="animate-spin rounded-full h-8 w-8 border-b-2"
            style={{ borderColor: 'var(--color-primary)' }}
          />
        </div>
      )}

      {/* Create Programme Modal */}
      {showCreateProgramme && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div
            className="rounded-xl shadow-xl w-full max-w-lg mx-4 max-h-[85vh] overflow-y-auto"
            style={{ backgroundColor: 'var(--color-surface)' }}
          >
            <div className="p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold" style={{ color: 'var(--color-text)' }}>
                  New Programme
                </h3>
                <button
                  onClick={() => setShowCreateProgramme(false)}
                  className="p-1 rounded hover:bg-muted"
                >
                  <X size={18} style={{ color: 'var(--color-text-secondary)' }} />
                </button>
              </div>
              <div className="space-y-4">
                <div>
                  <label
                    className="text-sm font-medium mb-1 block"
                    style={{ color: 'var(--color-text)' }}
                  >
                    Programme Name
                  </label>
                  <input
                    type="text"
                    value={createForm.name}
                    onChange={(e) => setCreateForm((f) => ({ ...f, name: e.target.value }))}
                    placeholder="e.g. Graduate Programme 2026"
                    className="w-full px-3 py-2 rounded-lg border text-sm"
                    style={{
                      backgroundColor: 'var(--color-surface)',
                      borderColor: 'var(--color-border)',
                      color: 'var(--color-text)',
                    }}
                  />
                </div>
                <div>
                  <label
                    className="text-sm font-medium mb-1 block"
                    style={{ color: 'var(--color-text)' }}
                  >
                    Type
                  </label>
                  <select
                    value={createForm.programme_type}
                    onChange={(e) =>
                      setCreateForm((f) => ({
                        ...f,
                        programme_type: e.target.value as ProgrammeType,
                      }))
                    }
                    className="w-full px-3 py-2 rounded-lg border text-sm"
                    style={{
                      backgroundColor: 'var(--color-surface)',
                      borderColor: 'var(--color-border)',
                      color: 'var(--color-text)',
                    }}
                  >
                    {Object.entries(PROGRAMME_TYPE_LABELS).map(([k, v]) => (
                      <option key={k} value={k}>
                        {v}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label
                    className="text-sm font-medium mb-1 block"
                    style={{ color: 'var(--color-text)' }}
                  >
                    Description
                  </label>
                  <textarea
                    value={createForm.description}
                    onChange={(e) => setCreateForm((f) => ({ ...f, description: e.target.value }))}
                    rows={3}
                    placeholder="Programme description..."
                    className="w-full px-3 py-2 rounded-lg border text-sm resize-none"
                    style={{
                      backgroundColor: 'var(--color-surface)',
                      borderColor: 'var(--color-border)',
                      color: 'var(--color-text)',
                    }}
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label
                      className="text-sm font-medium mb-1 block"
                      style={{ color: 'var(--color-text)' }}
                    >
                      Start Date
                    </label>
                    <input
                      type="date"
                      value={createForm.start_date}
                      onChange={(e) => setCreateForm((f) => ({ ...f, start_date: e.target.value }))}
                      className="w-full px-3 py-2 rounded-lg border text-sm"
                      style={{
                        backgroundColor: 'var(--color-surface)',
                        borderColor: 'var(--color-border)',
                        color: 'var(--color-text)',
                      }}
                    />
                  </div>
                  <div>
                    <label
                      className="text-sm font-medium mb-1 block"
                      style={{ color: 'var(--color-text)' }}
                    >
                      Duration (months)
                    </label>
                    <input
                      type="number"
                      value={createForm.duration_months}
                      onChange={(e) =>
                        setCreateForm((f) => ({ ...f, duration_months: e.target.value }))
                      }
                      placeholder="e.g. 24"
                      className="w-full px-3 py-2 rounded-lg border text-sm"
                      style={{
                        backgroundColor: 'var(--color-surface)',
                        borderColor: 'var(--color-border)',
                        color: 'var(--color-text)',
                      }}
                    />
                  </div>
                </div>
                <div className="flex justify-end gap-2 pt-2">
                  <button
                    onClick={() => setShowCreateProgramme(false)}
                    className="px-4 py-2 rounded-lg text-sm font-medium hover:bg-muted"
                    style={{ color: 'var(--color-text-secondary)' }}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleCreateProgramme}
                    disabled={!createForm.name.trim()}
                    className="px-4 py-2 rounded-lg text-sm font-medium text-white transition-colors disabled:opacity-50"
                    style={{ backgroundColor: 'var(--color-primary)' }}
                  >
                    Create Programme
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Enrol Participant Modal */}
      {showEnrolParticipant && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div
            className="rounded-xl shadow-xl w-full max-w-lg mx-4 max-h-[85vh] overflow-y-auto"
            style={{ backgroundColor: 'var(--color-surface)' }}
          >
            <div className="p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold" style={{ color: 'var(--color-text)' }}>
                  Enrol Participant
                </h3>
                <button
                  onClick={() => setShowEnrolParticipant(false)}
                  className="p-1 rounded hover:bg-muted"
                >
                  <X size={18} style={{ color: 'var(--color-text-secondary)' }} />
                </button>
              </div>
              <div className="space-y-4">
                <div>
                  <label
                    className="text-sm font-medium mb-1 block"
                    style={{ color: 'var(--color-text)' }}
                  >
                    Programme
                  </label>
                  <select
                    value={enrolForm.programme_id}
                    onChange={(e) => setEnrolForm((f) => ({ ...f, programme_id: e.target.value }))}
                    className="w-full px-3 py-2 rounded-lg border text-sm"
                    style={{
                      backgroundColor: 'var(--color-surface)',
                      borderColor: 'var(--color-border)',
                      color: 'var(--color-text)',
                    }}
                  >
                    <option value="">Select programme...</option>
                    {programmes.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label
                    className="text-sm font-medium mb-1 block"
                    style={{ color: 'var(--color-text)' }}
                  >
                    Team Member
                  </label>
                  <select
                    value={enrolForm.user_id}
                    onChange={(e) => setEnrolForm((f) => ({ ...f, user_id: e.target.value }))}
                    className="w-full px-3 py-2 rounded-lg border text-sm"
                    style={{
                      backgroundColor: 'var(--color-surface)',
                      borderColor: 'var(--color-border)',
                      color: 'var(--color-text)',
                    }}
                  >
                    <option value="">Select member...</option>
                    {members.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label
                    className="text-sm font-medium mb-1 block"
                    style={{ color: 'var(--color-text)' }}
                  >
                    Qualification Target
                  </label>
                  <input
                    type="text"
                    value={enrolForm.qualification_target}
                    onChange={(e) =>
                      setEnrolForm((f) => ({ ...f, qualification_target: e.target.value }))
                    }
                    placeholder="e.g. BEng Electrical Engineering"
                    className="w-full px-3 py-2 rounded-lg border text-sm"
                    style={{
                      backgroundColor: 'var(--color-surface)',
                      borderColor: 'var(--color-border)',
                      color: 'var(--color-text)',
                    }}
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label
                      className="text-sm font-medium mb-1 block"
                      style={{ color: 'var(--color-text)' }}
                    >
                      University
                    </label>
                    <input
                      type="text"
                      value={enrolForm.university}
                      onChange={(e) => setEnrolForm((f) => ({ ...f, university: e.target.value }))}
                      placeholder="e.g. Sheffield Hallam"
                      className="w-full px-3 py-2 rounded-lg border text-sm"
                      style={{
                        backgroundColor: 'var(--color-surface)',
                        borderColor: 'var(--color-border)',
                        color: 'var(--color-text)',
                      }}
                    />
                  </div>
                  <div>
                    <label
                      className="text-sm font-medium mb-1 block"
                      style={{ color: 'var(--color-text)' }}
                    >
                      Qualification Level
                    </label>
                    <select
                      value={enrolForm.qualification_level}
                      onChange={(e) =>
                        setEnrolForm((f) => ({ ...f, qualification_level: e.target.value }))
                      }
                      className="w-full px-3 py-2 rounded-lg border text-sm"
                      style={{
                        backgroundColor: 'var(--color-surface)',
                        borderColor: 'var(--color-border)',
                        color: 'var(--color-text)',
                      }}
                    >
                      <option value="">Select...</option>
                      <option value="level_3">Level 3 (A-Level equiv)</option>
                      <option value="level_4">Level 4 (HNC)</option>
                      <option value="level_5">Level 5 (HND/FdEng)</option>
                      <option value="level_6">Level 6 (Degree)</option>
                      <option value="level_7">Level 7 (Masters)</option>
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label
                      className="text-sm font-medium mb-1 block"
                      style={{ color: 'var(--color-text)' }}
                    >
                      Start Date
                    </label>
                    <input
                      type="date"
                      value={enrolForm.start_date}
                      onChange={(e) => setEnrolForm((f) => ({ ...f, start_date: e.target.value }))}
                      className="w-full px-3 py-2 rounded-lg border text-sm"
                      style={{
                        backgroundColor: 'var(--color-surface)',
                        borderColor: 'var(--color-border)',
                        color: 'var(--color-text)',
                      }}
                    />
                  </div>
                  <div>
                    <label
                      className="text-sm font-medium mb-1 block"
                      style={{ color: 'var(--color-text)' }}
                    >
                      Expected End Date
                    </label>
                    <input
                      type="date"
                      value={enrolForm.expected_end_date}
                      onChange={(e) =>
                        setEnrolForm((f) => ({ ...f, expected_end_date: e.target.value }))
                      }
                      className="w-full px-3 py-2 rounded-lg border text-sm"
                      style={{
                        backgroundColor: 'var(--color-surface)',
                        borderColor: 'var(--color-border)',
                        color: 'var(--color-text)',
                      }}
                    />
                  </div>
                </div>
                <div className="flex justify-end gap-2 pt-2">
                  <button
                    onClick={() => setShowEnrolParticipant(false)}
                    className="px-4 py-2 rounded-lg text-sm font-medium hover:bg-muted"
                    style={{ color: 'var(--color-text-secondary)' }}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleEnrolParticipant}
                    disabled={!enrolForm.programme_id || !enrolForm.user_id}
                    className="px-4 py-2 rounded-lg text-sm font-medium text-white transition-colors disabled:opacity-50"
                    style={{ backgroundColor: 'var(--color-primary)' }}
                  >
                    Enrol
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default EarlyTalentPage;
