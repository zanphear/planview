import { useState, useEffect, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Heart,
  ThumbsUp,
  Plus,
  BarChart3,
  MessageCircle,
  Smile,
  X,
  Send,
  Award,
} from 'lucide-react';
import { useWorkspaceStore } from '../stores/workspaceStore';
import { useAuthStore } from '../stores/authStore';
import { membersApi } from '../api/users';
import type { PulseSurvey, Kudos } from '../api/wellbeing';
import type { User } from '../api/users';
import {
  useSurveys,
  useKudos,
  useCreateSurvey,
  useSubmitResponse,
  useGiveKudos,
} from '../api/queries/wellbeing';
import { Toast } from '../components/shared/Toast';
import { StatCard } from '../components/shared/StatCard';
import { BarChart } from '../components/charts/BarChart';
import { COLOURS } from '../utils/colours';

type Tab = 'surveys' | 'kudos';

const EMOJI_FACES = ['😞', '😐', '🙂', '😊', '😁'];

const KUDOS_COLOURS: Record<string, string> = {
  teamwork: COLOURS.blue,
  innovation: COLOURS.purple,
  leadership: COLOURS.amber,
  above_and_beyond: COLOURS.green,
  customer_focus: COLOURS.teal,
};

function formatRelativeTime(dateStr: string): string {
  const d = new Date(dateStr);
  const diff = Date.now() - d.getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return d.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: d.getFullYear() !== new Date().getFullYear() ? 'numeric' : undefined,
  });
}

function getScoreColour(score: number): string {
  if (score >= 4) return '#22c55e';
  if (score >= 3) return '#f59e0b';
  return '#ef4444';
}

export function WellbeingPage() {
  const workspace = useWorkspaceStore((s) => s.currentWorkspace);
  const user = useAuthStore((s) => s.user);
  const workspaceId = workspace?.id;

  // Client/UI state only, server data lives in TanStack Query (ADR 0003).
  const [tab, setTab] = useState<Tab>('surveys');
  const [expandedSurvey, setExpandedSurvey] = useState<string | null>(null);
  const [showNewSurvey, setShowNewSurvey] = useState(false);
  const [showGiveKudos, setShowGiveKudos] = useState(false);

  const surveysQuery = useSurveys(workspaceId);
  const kudosQuery = useKudos(workspaceId);
  const membersQuery = useQuery({
    queryKey: ['members', workspaceId ?? ''],
    queryFn: async (): Promise<User[]> => (await membersApi.list(workspaceId!)).data,
    enabled: !!workspaceId,
  });

  const surveys = surveysQuery.data ?? [];
  const kudos = kudosQuery.data ?? [];
  const members = membersQuery.data ?? [];

  const getMemberName = (userId: string): string => {
    const m = members.find((u) => u.id === userId);
    return m?.name || 'Unknown';
  };

  const getMember = (userId: string): User | undefined => {
    return members.find((u) => u.id === userId);
  };

  // Computed stats, derive purely from query data, no input mutation.
  const allResponses = useMemo(
    () => (surveysQuery.data ?? []).flatMap((s) => s.responses),
    [surveysQuery.data],
  );
  const totalResponses = allResponses.length;
  const avgMoraleNum =
    totalResponses > 0 ? allResponses.reduce((sum, r) => sum + r.morale, 0) / totalResponses : 0;
  const avgMorale = totalResponses > 0 ? avgMoraleNum.toFixed(1) : '\u2014';
  const avgWorkload =
    totalResponses > 0 ? allResponses.reduce((sum, r) => sum + r.workload, 0) / totalResponses : 0;
  const avgSupport =
    totalResponses > 0 ? allResponses.reduce((sum, r) => sum + r.support, 0) / totalResponses : 0;
  const now = new Date();
  const kudosThisMonth = kudos.filter((k) => {
    const d = new Date(k.created_at);
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  }).length;

  const wellbeingBars = [
    { label: 'Morale', value: avgMoraleNum, colour: COLOURS.pink },
    { label: 'Workload', value: avgWorkload, colour: COLOURS.amber },
    { label: 'Support', value: avgSupport, colour: COLOURS.green },
  ];

  // ── PENDING ────────────────────────────────────────────────────────────────
  if (surveysQuery.isPending || kudosQuery.isPending || membersQuery.isPending) {
    return (
      <div className="flex items-center justify-center h-full">
        <div
          className="animate-spin w-6 h-6 border-2 border-t-transparent rounded-full"
          style={{ borderColor: 'var(--color-primary)', borderTopColor: 'transparent' }}
        />
      </div>
    );
  }

  // ── ERROR (with retry) ───────────────────────────────────────────────────────
  if (surveysQuery.isError || kudosQuery.isError || membersQuery.isError) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-3 p-6 text-center">
        <Heart size={40} className="opacity-30" style={{ color: 'var(--color-text-secondary)' }} />
        <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
          Couldn't load wellbeing data.
        </p>
        <button
          onClick={() => {
            surveysQuery.refetch();
            kudosQuery.refetch();
            membersQuery.refetch();
          }}
          className="px-4 py-2 text-sm font-medium rounded-lg text-white"
          style={{ backgroundColor: 'var(--color-primary)' }}
        >
          Retry
        </button>
      </div>
    );
  }

  // ── EMPTY (with CTA) ─────────────────────────────────────────────────────────
  if (surveys.length === 0 && kudos.length === 0 && !showNewSurvey) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-3 p-6 text-center">
        <Heart size={48} className="opacity-30" style={{ color: 'var(--color-text-secondary)' }} />
        <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
          No wellbeing activity yet. Start by sending a pulse survey to check in with your team.
        </p>
        <button
          onClick={() => {
            setTab('surveys');
            setShowNewSurvey(true);
          }}
          className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium rounded-lg text-white"
          style={{ background: 'linear-gradient(135deg, #8A00E5, #4D217A)' }}
        >
          <Plus size={14} />
          New Survey
        </button>
      </div>
    );
  }

  // ── SUCCESS ──────────────────────────────────────────────────────────────────
  return (
    <div className="p-4 sm:p-6 h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <div className="flex items-center gap-3">
          <Heart size={22} style={{ color: 'var(--color-primary)' }} />
          <h2 className="text-xl font-bold" style={{ color: 'var(--color-text)' }}>
            Team Wellbeing
          </h2>
        </div>

        {/* Tab switcher */}
        <div
          className="flex items-center gap-1 p-1 rounded-lg"
          style={{ backgroundColor: 'var(--color-grey-1)' }}
        >
          <button
            onClick={() => setTab('surveys')}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
              tab === 'surveys' ? 'shadow-sm' : ''
            }`}
            style={{
              backgroundColor: tab === 'surveys' ? 'var(--color-surface)' : 'transparent',
              color: tab === 'surveys' ? 'var(--color-text)' : 'var(--color-text-secondary)',
            }}
          >
            <BarChart3 size={14} />
            Pulse Surveys
          </button>
          <button
            onClick={() => setTab('kudos')}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
              tab === 'kudos' ? 'shadow-sm' : ''
            }`}
            style={{
              backgroundColor: tab === 'kudos' ? 'var(--color-surface)' : 'transparent',
              color: tab === 'kudos' ? 'var(--color-text)' : 'var(--color-text-secondary)',
            }}
          >
            <ThumbsUp size={14} />
            Kudos Wall
          </button>
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard
          label="Surveys Sent"
          value={surveys.length}
          icon={<Send size={20} />}
          colour={COLOURS.blue}
        />
        <StatCard
          label="Total Responses"
          value={totalResponses}
          icon={<BarChart3 size={20} />}
          colour={COLOURS.purple}
        />
        <StatCard
          label="Avg Morale"
          value={avgMorale}
          icon={<Heart size={20} />}
          colour={COLOURS.pink}
        />
        <StatCard
          label="Kudos This Month"
          value={kudosThisMonth}
          icon={<Award size={20} />}
          colour={COLOURS.green}
        />
      </div>

      {/* Wellbeing chart */}
      {allResponses.length > 0 && (
        <div
          className="rounded-xl border p-5 mb-6"
          style={{ backgroundColor: 'var(--color-surface)', borderColor: 'var(--color-border)' }}
        >
          <h3 className="text-sm font-semibold mb-4" style={{ color: 'var(--color-text)' }}>
            Wellbeing Averages
          </h3>
          <BarChart bars={wellbeingBars} height={130} />
        </div>
      )}

      {/* Tab content */}
      <div className="flex-1 overflow-auto">
        {tab === 'surveys' ? (
          <SurveysTab
            surveys={surveys}
            workspace={workspace}
            user={user}
            expandedSurvey={expandedSurvey}
            onToggleExpand={(id) => setExpandedSurvey(expandedSurvey === id ? null : id)}
            showNewSurvey={showNewSurvey}
            onToggleNewSurvey={() => setShowNewSurvey(!showNewSurvey)}
          />
        ) : (
          <KudosTab
            kudos={kudos}
            members={members}
            getMemberName={getMemberName}
            getMember={getMember}
            showGiveKudos={showGiveKudos}
            onToggleGiveKudos={() => setShowGiveKudos(!showGiveKudos)}
            workspace={workspace}
            user={user}
          />
        )}
      </div>
    </div>
  );
}

// --- Surveys Tab ---

function SurveysTab({
  surveys,
  workspace,
  user,
  expandedSurvey,
  onToggleExpand,
  showNewSurvey,
  onToggleNewSurvey,
}: {
  surveys: PulseSurvey[];
  workspace: { id: string } | null;
  user: User | null;
  expandedSurvey: string | null;
  onToggleExpand: (id: string) => void;
  showNewSurvey: boolean;
  onToggleNewSurvey: () => void;
}) {
  return (
    <div className="space-y-4">
      {/* New Survey button */}
      <div className="flex justify-end">
        <button
          onClick={onToggleNewSurvey}
          className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-lg text-white transition-colors"
          style={{ background: 'linear-gradient(135deg, #8A00E5, #4D217A)' }}
        >
          <Plus size={14} />
          New Survey
        </button>
      </div>

      {/* Create survey form */}
      {showNewSurvey && workspace && (
        <CreateSurveyForm
          workspaceId={workspace.id}
          onCreated={onToggleNewSurvey}
          onCancel={onToggleNewSurvey}
        />
      )}

      {/* Survey list */}
      {surveys.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16">
          <BarChart3
            size={48}
            className="mb-3 opacity-30"
            style={{ color: 'var(--color-text-secondary)' }}
          />
          <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
            No pulse surveys yet. Create one to check in with your team.
          </p>
        </div>
      ) : (
        surveys.map((survey) => (
          <SurveyCard
            key={survey.id}
            survey={survey}
            expanded={expandedSurvey === survey.id}
            onToggle={() => onToggleExpand(survey.id)}
            workspace={workspace}
            user={user}
          />
        ))
      )}
    </div>
  );
}

// --- Create Survey Form ---

function CreateSurveyForm({
  workspaceId,
  onCreated,
  onCancel,
}: {
  workspaceId: string;
  onCreated: () => void;
  onCancel: () => void;
}) {
  const [title, setTitle] = useState('');
  const [endDate, setEndDate] = useState('');
  const createSurvey = useCreateSurvey(workspaceId);
  const saving = createSurvey.isPending;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    createSurvey.mutate(
      { title: title.trim(), end_date: endDate || undefined },
      {
        onSuccess: () => onCreated(),
        onError: (err) => {
          console.error('Failed to create survey:', err);
          Toast.show('Failed to create survey');
        },
      },
    );
  };

  return (
    <div
      className="rounded-xl border p-4"
      style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-surface)' }}
    >
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold" style={{ color: 'var(--color-text)' }}>
          New Pulse Survey
        </h3>
        <button
          onClick={onCancel}
          className="p-1 rounded hover:bg-subtle"
          style={{ color: 'var(--color-text-secondary)' }}
        >
          <X size={16} />
        </button>
      </div>
      <form onSubmit={handleSubmit} className="flex items-end gap-3 flex-wrap">
        <div className="flex-1 min-w-[200px]">
          <label className="block text-xs mb-1" style={{ color: 'var(--color-text-secondary)' }}>
            Title
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
            placeholder="e.g. Weekly Check-in"
            className="w-full px-3 py-2 text-sm rounded-lg border"
            style={{
              borderColor: 'var(--color-border)',
              backgroundColor: 'var(--color-surface)',
              color: 'var(--color-text)',
            }}
          />
        </div>
        <div>
          <label className="block text-xs mb-1" style={{ color: 'var(--color-text-secondary)' }}>
            End Date (optional)
          </label>
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="px-3 py-2 text-sm rounded-lg border"
            style={{
              borderColor: 'var(--color-border)',
              backgroundColor: 'var(--color-surface)',
              color: 'var(--color-text)',
            }}
          />
        </div>
        <button
          type="submit"
          disabled={saving || !title.trim()}
          className="px-4 py-2 text-sm font-medium rounded-lg text-white disabled:opacity-50"
          style={{ backgroundColor: 'var(--color-primary)' }}
        >
          {saving ? 'Creating...' : 'Create'}
        </button>
      </form>
    </div>
  );
}

// --- Survey Card ---

function SurveyCard({
  survey,
  expanded,
  onToggle,
  workspace,
  user,
}: {
  survey: PulseSurvey;
  expanded: boolean;
  onToggle: () => void;
  workspace: { id: string } | null;
  user: User | null;
}) {
  const responseCount = survey.responses.length;
  const hasResponded = user ? survey.responses.some((r) => r.user_id === user.id) : false;

  const averages =
    responseCount > 0
      ? {
          morale: survey.responses.reduce((sum, r) => sum + r.morale, 0) / responseCount,
          workload: survey.responses.reduce((sum, r) => sum + r.workload, 0) / responseCount,
          support: survey.responses.reduce((sum, r) => sum + r.support, 0) / responseCount,
        }
      : null;

  return (
    <div
      className="rounded-xl border overflow-hidden"
      style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-surface)' }}
    >
      {/* Survey header */}
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-subtle transition-colors text-left"
      >
        <div className="flex items-center gap-3">
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center"
            style={{ backgroundColor: 'rgba(138,0,229,0.1)', color: '#8A00E5' }}
          >
            <BarChart3 size={16} />
          </div>
          <div>
            <div className="font-semibold text-sm" style={{ color: 'var(--color-text)' }}>
              {survey.title}
            </div>
            <div
              className="text-xs flex items-center gap-2"
              style={{ color: 'var(--color-text-secondary)' }}
            >
              <span
                className="px-1.5 py-0.5 rounded text-[10px] font-medium"
                style={{
                  backgroundColor:
                    survey.status === 'active' ? 'rgba(34,197,94,0.1)' : 'var(--color-grey-1)',
                  color: survey.status === 'active' ? '#22c55e' : 'var(--color-text-secondary)',
                }}
              >
                {survey.status}
              </span>
              <span>
                {responseCount} response{responseCount !== 1 ? 's' : ''}
              </span>
              {averages && (
                <span className="flex items-center gap-1">
                  <span
                    className="w-2 h-2 rounded-full inline-block"
                    style={{
                      backgroundColor:
                        averages.morale >= 4
                          ? COLOURS.green
                          : averages.morale >= 3
                            ? COLOURS.amber
                            : COLOURS.red,
                    }}
                  />
                  <span>{averages.morale.toFixed(1)}</span>
                </span>
              )}
              <span>{formatRelativeTime(survey.created_at)}</span>
            </div>
          </div>
        </div>
        <div
          className="text-xs transition-transform"
          style={{
            color: 'var(--color-text-secondary)',
            transform: expanded ? 'rotate(180deg)' : 'rotate(0deg)',
          }}
        >
          &#9660;
        </div>
      </button>

      {/* Expanded content */}
      {expanded && (
        <div
          className="border-t px-4 py-4 space-y-4"
          style={{ borderColor: 'var(--color-border)' }}
        >
          {/* Results summary */}
          {averages && (
            <div>
              <h4
                className="text-xs font-semibold mb-3 flex items-center gap-1.5"
                style={{ color: 'var(--color-text-secondary)' }}
              >
                <BarChart3 size={12} />
                Results Summary
              </h4>
              <div className="space-y-2">
                <ScoreBar label="Morale" value={averages.morale} />
                <ScoreBar label="Workload" value={averages.workload} />
                <ScoreBar label="Support" value={averages.support} />
              </div>
            </div>
          )}

          {/* Respond form */}
          {survey.status === 'active' && !hasResponded && workspace && (
            <RespondForm workspaceId={workspace.id} surveyId={survey.id} />
          )}

          {hasResponded && (
            <div
              className="text-xs py-2 text-center"
              style={{ color: 'var(--color-text-secondary)' }}
            >
              You've already responded to this survey.
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// --- Score Bar ---

function ScoreBar({ label, value }: { label: string; value: number }) {
  const percentage = (value / 5) * 100;
  const colour = getScoreColour(value);

  return (
    <div className="flex items-center gap-3">
      <span className="text-xs w-16 shrink-0" style={{ color: 'var(--color-text-secondary)' }}>
        {label}
      </span>
      <div
        className="flex-1 h-5 rounded-full overflow-hidden"
        style={{ backgroundColor: 'var(--color-grey-1)' }}
      >
        <div
          className="h-full rounded-full transition-colors"
          style={{ width: `${percentage}%`, backgroundColor: colour }}
        />
      </div>
      <span className="text-xs font-medium w-8 text-right" style={{ color: 'var(--color-text)' }}>
        {value.toFixed(1)}
      </span>
    </div>
  );
}

// --- Respond Form ---

function RespondForm({ workspaceId, surveyId }: { workspaceId: string; surveyId: string }) {
  const [morale, setMorale] = useState(3);
  const [workload, setWorkload] = useState(3);
  const [support, setSupport] = useState(3);
  const [comments, setComments] = useState('');
  const submitResponse = useSubmitResponse(workspaceId);
  const saving = submitResponse.isPending;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    submitResponse.mutate(
      {
        surveyId,
        data: { morale, workload, support, comments: comments.trim() || undefined },
      },
      {
        onError: (err) => {
          console.error('Failed to submit response:', err);
          Toast.show('Failed to submit response');
        },
      },
    );
  };

  return (
    <div
      className="rounded-lg border p-4"
      style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-bg)' }}
    >
      <h4
        className="text-xs font-semibold mb-3 flex items-center gap-1.5"
        style={{ color: 'var(--color-text-secondary)' }}
      >
        <Smile size={12} />
        Your Response
      </h4>
      <form onSubmit={handleSubmit} className="space-y-4">
        <SliderField label="Morale" value={morale} onChange={setMorale} />
        <SliderField label="Workload" value={workload} onChange={setWorkload} />
        <SliderField label="Support" value={support} onChange={setSupport} />

        <div>
          <label className="block text-xs mb-1" style={{ color: 'var(--color-text-secondary)' }}>
            <MessageCircle size={10} className="inline mr-1" />
            Comments (optional)
          </label>
          <textarea
            value={comments}
            onChange={(e) => setComments(e.target.value)}
            rows={2}
            placeholder="Anything you'd like to share..."
            className="w-full px-3 py-2 text-sm rounded-lg border resize-none"
            style={{
              borderColor: 'var(--color-border)',
              backgroundColor: 'var(--color-surface)',
              color: 'var(--color-text)',
            }}
          />
        </div>

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={saving}
            className="px-4 py-2 text-sm font-medium rounded-lg text-white disabled:opacity-50"
            style={{ backgroundColor: 'var(--color-primary)' }}
          >
            {saving ? 'Submitting...' : 'Submit Response'}
          </button>
        </div>
      </form>
    </div>
  );
}

// --- Slider Field ---

function SliderField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
}) {
  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <label className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>
          {label}
        </label>
        <span className="text-lg">{EMOJI_FACES[value - 1]}</span>
      </div>
      <input
        type="range"
        min={1}
        max={5}
        step={1}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full accent-[var(--color-primary)]"
      />
      <div
        className="flex justify-between text-[10px] px-0.5"
        style={{ color: 'var(--color-text-secondary)' }}
      >
        <span>1</span>
        <span>2</span>
        <span>3</span>
        <span>4</span>
        <span>5</span>
      </div>
    </div>
  );
}

// --- Kudos Tab ---

function KudosTab({
  kudos,
  members,
  getMemberName,
  getMember,
  showGiveKudos,
  onToggleGiveKudos,
  workspace,
  user,
}: {
  kudos: Kudos[];
  members: User[];
  getMemberName: (id: string) => string;
  getMember: (id: string) => User | undefined;
  showGiveKudos: boolean;
  onToggleGiveKudos: () => void;
  workspace: { id: string } | null;
  user: User | null;
}) {
  const BORDER_COLOURS = ['#8A00E5', '#22c55e', '#3b82f6', '#f59e0b', '#ef4444', '#ec4899'];

  return (
    <div className="space-y-4">
      {/* Give Kudos button */}
      <div className="flex justify-end">
        <button
          onClick={onToggleGiveKudos}
          className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-lg text-white transition-colors"
          style={{ background: 'linear-gradient(135deg, #8A00E5, #4D217A)' }}
        >
          <ThumbsUp size={14} />
          Give Kudos
        </button>
      </div>

      {/* Give Kudos modal */}
      {showGiveKudos && workspace && user && (
        <GiveKudosModal
          workspaceId={workspace.id}
          currentUserId={user.id}
          members={members}
          onClose={onToggleGiveKudos}
          onSent={onToggleGiveKudos}
        />
      )}

      {/* Kudos feed */}
      {kudos.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16">
          <ThumbsUp
            size={48}
            className="mb-3 opacity-30"
            style={{ color: 'var(--color-text-secondary)' }}
          />
          <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
            No kudos yet. Be the first to recognise a teammate!
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {kudos.map((k, idx) => {
            const sender = getMember(k.from_user_id);
            const receiver = getMember(k.to_user_id);
            const borderColour = BORDER_COLOURS[idx % BORDER_COLOURS.length];

            return (
              <div
                key={k.id}
                className="rounded-xl border p-4"
                style={{
                  borderColor: 'var(--color-border)',
                  backgroundColor: 'var(--color-surface)',
                  borderLeftWidth: '4px',
                  borderLeftColor: borderColour,
                }}
              >
                {/* Sender -> Receiver */}
                <div className="flex items-center gap-2 mb-2">
                  <MemberAvatar member={sender} />
                  <span className="text-xs font-medium" style={{ color: 'var(--color-text)' }}>
                    {getMemberName(k.from_user_id)}
                  </span>
                  <span className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>
                    &rarr;
                  </span>
                  <MemberAvatar member={receiver} />
                  <span className="text-xs font-medium" style={{ color: 'var(--color-text)' }}>
                    {getMemberName(k.to_user_id)}
                  </span>
                </div>

                {/* Category badge */}
                {(k as Kudos & { category?: string }).category &&
                  (() => {
                    const cat = (k as Kudos & { category?: string }).category!;
                    const categoryColour = KUDOS_COLOURS[cat] || COLOURS.slate;
                    return (
                      <div className="mb-2">
                        <span
                          className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium"
                          style={{ backgroundColor: categoryColour + '18', color: categoryColour }}
                        >
                          {cat.replace(/_/g, ' ')}
                        </span>
                      </div>
                    );
                  })()}

                {/* Message */}
                <p className="text-sm mb-2" style={{ color: 'var(--color-text)' }}>
                  {k.message}
                </p>

                {/* Timestamp */}
                <p className="text-[10px]" style={{ color: 'var(--color-text-secondary)' }}>
                  {formatRelativeTime(k.created_at)}
                </p>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// --- Member Avatar ---

function MemberAvatar({ member }: { member: User | undefined }) {
  return (
    <div
      className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold text-white shrink-0"
      style={{ backgroundColor: member?.colour || '#999' }}
    >
      {member?.initials || member?.name?.charAt(0) || '?'}
    </div>
  );
}

// --- Give Kudos Modal ---

function GiveKudosModal({
  workspaceId,
  currentUserId,
  members,
  onClose,
  onSent,
}: {
  workspaceId: string;
  currentUserId: string;
  members: User[];
  onClose: () => void;
  onSent: () => void;
}) {
  const [recipientId, setRecipientId] = useState('');
  const [message, setMessage] = useState('');
  const giveKudos = useGiveKudos(workspaceId);
  const saving = giveKudos.isPending;

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  const otherMembers = members.filter((m) => m.id !== currentUserId);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!recipientId || !message.trim()) return;
    giveKudos.mutate(
      { to_user_id: recipientId, message: message.trim() },
      {
        onSuccess: () => onSent(),
        onError: (err) => {
          console.error('Failed to give kudos:', err);
          Toast.show('Failed to send kudos');
        },
      },
    );
  };

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-xl shadow-2xl p-6"
        style={{ backgroundColor: 'var(--color-surface)' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h3
            className="text-lg font-bold flex items-center gap-2"
            style={{ color: 'var(--color-text)' }}
          >
            <ThumbsUp size={18} style={{ color: 'var(--color-primary)' }} />
            Give Kudos
          </h3>
          <button
            onClick={onClose}
            className="p-1 rounded hover:bg-subtle"
            style={{ color: 'var(--color-text-secondary)' }}
          >
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label
              className="block text-sm font-medium mb-1"
              style={{ color: 'var(--color-text-secondary)' }}
            >
              Recipient
            </label>
            <select
              value={recipientId}
              onChange={(e) => setRecipientId(e.target.value)}
              required
              className="w-full px-3 py-2 text-sm rounded-lg border"
              style={{
                borderColor: 'var(--color-border)',
                backgroundColor: 'var(--color-surface)',
                color: 'var(--color-text)',
              }}
            >
              <option value="">Select a teammate...</option>
              {otherMembers.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label
              className="block text-sm font-medium mb-1"
              style={{ color: 'var(--color-text-secondary)' }}
            >
              Message
            </label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              required
              rows={3}
              placeholder="What did they do that was great?"
              className="w-full px-3 py-2 text-sm rounded-lg border resize-none"
              style={{
                borderColor: 'var(--color-border)',
                backgroundColor: 'var(--color-surface)',
                color: 'var(--color-text)',
              }}
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm rounded-lg"
              style={{ color: 'var(--color-text-secondary)' }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving || !recipientId || !message.trim()}
              className="px-4 py-2 text-sm font-medium rounded-lg text-white disabled:opacity-50"
              style={{ background: 'linear-gradient(135deg, #8A00E5, #4D217A)' }}
            >
              {saving ? 'Sending...' : 'Send Kudos'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
