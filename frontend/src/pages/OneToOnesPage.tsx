import { useEffect, useState, useCallback, useMemo } from 'react';
import { Plus, X, Users, Calendar, CheckCircle2, Circle, Filter, MessageSquare, CheckCircle, ClipboardList } from 'lucide-react';
import { useWorkspaceStore } from '../stores/workspaceStore';
import { useAuthStore } from '../stores/authStore';
import { meetingsApi } from '../api/meetings';
import { membersApi } from '../api/users';
import { LoadingSpinner } from '../components/shared/LoadingSpinner';
import { StatCard } from '../components/shared/StatCard';
import { DonutChart } from '../components/charts/DonutChart';
import { BarChart } from '../components/charts/BarChart';
import { COLOURS } from '../utils/colours';
import type { Meeting, MeetingAction } from '../api/meetings';
import type { User } from '../api/users';
import { Toast } from '../components/shared/Toast';

type MeetingStatus = 'scheduled' | 'completed' | 'cancelled';

const STATUS_CONFIG: Record<MeetingStatus, { label: string; bg: string; text: string }> = {
  scheduled: { label: 'Scheduled', bg: 'rgba(59,130,246,0.12)', text: '#3b82f6' },
  completed: { label: 'Completed', bg: 'rgba(16,185,129,0.12)', text: '#10b981' },
  cancelled: { label: 'Cancelled', bg: 'rgba(239,68,68,0.12)', text: '#ef4444' },
};

const MOODS = [
  { value: 'great', emoji: '\uD83D\uDE0A', label: 'Great' },
  { value: 'ok', emoji: '\uD83D\uDE10', label: 'OK' },
  { value: 'concerned', emoji: '\uD83D\uDE1F', label: 'Concerned' },
] as const;

function getMoodEmoji(mood: string | null): string {
  const found = MOODS.find((m) => m.value === mood);
  return found ? found.emoji : '';
}

const STATUS_BORDER: Record<string, string> = {
  scheduled: COLOURS.blue,
  completed: COLOURS.green,
  cancelled: COLOURS.red,
  draft: COLOURS.slate,
};

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-GB', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

export function OneToOnesPage() {
  const workspace = useWorkspaceStore((s) => s.currentWorkspace);
  const user = useAuthStore((s) => s.user);

  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [members, setMembers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedMeetingId, setSelectedMeetingId] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);

  const loadData = useCallback(async () => {
    if (!workspace) return;
    setLoading(true);
    try {
      const params = statusFilter !== 'all' ? { status: statusFilter } : undefined;
      const [meetingsRes, membersRes] = await Promise.all([
        meetingsApi.list(workspace.id, params),
        membersApi.list(workspace.id),
      ]);
      setMeetings(meetingsRes.data);
      setMembers(membersRes.data);
    } catch (err) {
      console.error('Failed to load meetings:', err);
      Toast.show('Failed to load meetings');
    } finally {
      setLoading(false);
    }
  }, [workspace, statusFilter]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const selectedMeeting = meetings.find((m) => m.id === selectedMeetingId) || null;

  const completedCount = useMemo(() => meetings.filter((m) => m.status === 'completed').length, [meetings]);
  const upcomingCount = useMemo(() => meetings.filter((m) => m.status === 'scheduled' || new Date(m.scheduled_date) > new Date()).length, [meetings]);
  const openActions = useMemo(() => meetings.reduce((sum, m) => sum + m.actions.filter((a) => a.status === 'open').length, 0), [meetings]);

  const statusSegments = useMemo(() => {
    const counts: Record<string, number> = {};
    meetings.forEach((m) => { counts[m.status] = (counts[m.status] || 0) + 1; });
    return [
      { label: 'Scheduled', value: counts['scheduled'] || 0, colour: COLOURS.blue },
      { label: 'Completed', value: counts['completed'] || 0, colour: COLOURS.green },
      { label: 'Cancelled', value: counts['cancelled'] || 0, colour: COLOURS.red },
    ];
  }, [meetings]);

  const moodBars = useMemo(() => {
    const counts: Record<string, number> = {};
    meetings.forEach((m) => { if (m.mood) counts[m.mood] = (counts[m.mood] || 0) + 1; });
    if (Object.keys(counts).length === 0) return [];
    return [
      { label: 'Great', value: counts['great'] || 0, colour: COLOURS.green },
      { label: 'OK', value: counts['ok'] || 0, colour: COLOURS.amber },
      { label: 'Concerned', value: counts['concerned'] || 0, colour: COLOURS.red },
    ];
  }, [meetings]);

  const getMemberName = (id: string): string => {
    const member = members.find((m) => m.id === id);
    return member?.name || 'Unknown';
  };

  if (loading) return <LoadingSpinner />;

  return (
    <div className="p-4 sm:p-6 h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <h2 className="text-xl font-bold" style={{ color: 'var(--color-text)' }}>
          1:1 Meetings
        </h2>
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-lg text-white transition-colors"
          style={{ background: 'linear-gradient(135deg, #8A00E5, #4D217A)' }}
        >
          <Plus size={14} />
          New Meeting
        </button>
      </div>

      {/* Filter bar */}
      <div className="flex items-center gap-2 mb-4">
        <Filter size={14} style={{ color: 'var(--color-text-secondary)' }} />
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="text-sm px-2 py-1.5 rounded-lg border"
          style={{
            borderColor: 'var(--color-border)',
            backgroundColor: 'var(--color-surface)',
            color: 'var(--color-text)',
          }}
        >
          <option value="all">All statuses</option>
          <option value="scheduled">Scheduled</option>
          <option value="completed">Completed</option>
          <option value="cancelled">Cancelled</option>
        </select>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard label="Total Meetings" value={meetings.length} icon={<MessageSquare size={20} />} colour={COLOURS.blue} />
        <StatCard label="Completed" value={completedCount} icon={<CheckCircle size={20} />} colour={COLOURS.green} />
        <StatCard label="Upcoming" value={upcomingCount} icon={<Calendar size={20} />} colour={COLOURS.purple} />
        <StatCard label="Open Actions" value={openActions} icon={<ClipboardList size={20} />} colour={COLOURS.amber} />
      </div>

      {/* Charts */}
      {meetings.length > 0 && (
        <div className={`grid grid-cols-1 ${moodBars.length > 0 ? 'lg:grid-cols-2' : ''} gap-4 mb-6`}>
          <div className="rounded-xl border p-5" style={{ backgroundColor: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
            <h3 className="text-sm font-semibold mb-4" style={{ color: 'var(--color-text)' }}>Meeting Status</h3>
            <DonutChart segments={statusSegments} size={120} centerValue={meetings.length} centerLabel="total" />
          </div>
          {moodBars.length > 0 && (
            <div className="rounded-xl border p-5" style={{ backgroundColor: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
              <h3 className="text-sm font-semibold mb-4" style={{ color: 'var(--color-text)' }}>Mood Trend</h3>
              <BarChart bars={moodBars} height={130} />
            </div>
          )}
        </div>
      )}

      {/* Main content */}
      <div className="flex-1 flex gap-4 overflow-hidden flex-col lg:flex-row">
        {/* Meetings list */}
        <div className="flex-1 overflow-auto space-y-2 min-w-0">
          {meetings.length === 0 ? (
            <div className="flex-1 flex items-center justify-center py-16">
              <div className="text-center">
                <Users size={48} className="mx-auto mb-3 opacity-30" style={{ color: 'var(--color-text-secondary)' }} />
                <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
                  No meetings found. Schedule one to get started.
                </p>
              </div>
            </div>
          ) : (
            meetings.map((meeting) => {
              const status = meeting.status as MeetingStatus;
              const config = STATUS_CONFIG[status] || STATUS_CONFIG.scheduled;
              const openActions = meeting.actions.filter((a) => a.status === 'open').length;
              const isSelected = meeting.id === selectedMeetingId;

              return (
                <button
                  key={meeting.id}
                  onClick={() => setSelectedMeetingId(isSelected ? null : meeting.id)}
                  className="w-full text-left rounded-lg border p-4 transition-colors"
                  style={{
                    borderColor: isSelected ? 'var(--color-primary)' : 'var(--color-border)',
                    backgroundColor: isSelected ? 'rgba(65,134,224,0.05)' : 'var(--color-surface)',
                    borderLeft: `3px solid ${STATUS_BORDER[status] || COLOURS.slate}`,
                  }}
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <div className="font-medium text-sm truncate" style={{ color: 'var(--color-text)' }}>
                        {getMemberName(meeting.report_id)}
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        <Calendar size={12} style={{ color: 'var(--color-text-secondary)' }} />
                        <span className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>
                          {formatDate(meeting.scheduled_date)}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {meeting.mood && (
                        <span className="text-lg" title={meeting.mood}>
                          {getMoodEmoji(meeting.mood)}
                        </span>
                      )}
                      {openActions > 0 && (
                        <span
                          className="text-xs px-1.5 py-0.5 rounded-full font-medium"
                          style={{ backgroundColor: 'rgba(245,158,11,0.12)', color: '#f59e0b' }}
                        >
                          {openActions} open
                        </span>
                      )}
                      <span
                        className="text-xs px-2 py-0.5 rounded-full font-medium"
                        style={{ backgroundColor: config.bg, color: config.text }}
                      >
                        {config.label}
                      </span>
                    </div>
                  </div>
                </button>
              );
            })
          )}
        </div>

        {/* Detail panel */}
        {selectedMeeting && workspace && user && (
          <MeetingDetail
            meeting={selectedMeeting}
            workspaceId={workspace.id}
            members={members}
            onClose={() => setSelectedMeetingId(null)}
            onUpdated={loadData}
          />
        )}
      </div>

      {/* Create Modal */}
      {showCreateModal && workspace && (
        <CreateMeetingModal
          workspaceId={workspace.id}
          members={members}
          onClose={() => setShowCreateModal(false)}
          onCreated={loadData}
        />
      )}
    </div>
  );
}


// --- Meeting Detail Panel ---

function MeetingDetail({
  meeting,
  workspaceId,
  members,
  onClose,
  onUpdated,
}: {
  meeting: Meeting;
  workspaceId: string;
  members: User[];
  onClose: () => void;
  onUpdated: () => void;
}) {
  const [notes, setNotes] = useState(meeting.notes || '');
  const [mood, setMood] = useState(meeting.mood || '');
  const [newActionTitle, setNewActionTitle] = useState('');
  const [savingNotes, setSavingNotes] = useState(false);

  useEffect(() => {
    setNotes(meeting.notes || '');
    setMood(meeting.mood || '');
  }, [meeting.id, meeting.notes, meeting.mood]);

  const getMemberName = (id: string): string => {
    const member = members.find((m) => m.id === id);
    return member?.name || 'Unknown';
  };

  const status = meeting.status as MeetingStatus;
  const config = STATUS_CONFIG[status] || STATUS_CONFIG.scheduled;

  const handleSaveNotes = async () => {
    setSavingNotes(true);
    try {
      await meetingsApi.update(workspaceId, meeting.id, { notes });
      onUpdated();
    } catch (err) {
      console.error('Failed to save notes:', err);
      Toast.show('Failed to save notes');
    } finally {
      setSavingNotes(false);
    }
  };

  const handleMoodChange = async (newMood: string) => {
    setMood(newMood);
    try {
      await meetingsApi.update(workspaceId, meeting.id, { mood: newMood });
      onUpdated();
    } catch (err) {
      console.error('Failed to update mood:', err);
      Toast.show('Failed to update mood');
    }
  };

  const handleAddAction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newActionTitle.trim()) return;
    try {
      await meetingsApi.addAction(workspaceId, meeting.id, { title: newActionTitle.trim() });
      setNewActionTitle('');
      onUpdated();
    } catch (err) {
      console.error('Failed to add action:', err);
      Toast.show('Failed to add action');
    }
  };

  const handleToggleAction = async (action: MeetingAction) => {
    const newStatus = action.status === 'open' ? 'done' : 'open';
    try {
      await meetingsApi.updateAction(workspaceId, meeting.id, action.id, { status: newStatus });
      onUpdated();
    } catch (err) {
      console.error('Failed to toggle action:', err);
      Toast.show('Failed to update action');
    }
  };

  return (
    <div
      className="w-full lg:w-96 shrink-0 rounded-xl border overflow-auto"
      style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-surface)' }}
    >
      {/* Detail header */}
      <div className="flex items-center justify-between px-4 py-3 border-b" style={{ borderColor: 'var(--color-border)' }}>
        <div>
          <div className="font-semibold text-sm" style={{ color: 'var(--color-text)' }}>
            {getMemberName(meeting.report_id)}
          </div>
          <div className="flex items-center gap-2 mt-0.5">
            <span className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>
              {formatDate(meeting.scheduled_date)}
            </span>
            <span
              className="text-xs px-2 py-0.5 rounded-full font-medium"
              style={{ backgroundColor: config.bg, color: config.text }}
            >
              {config.label}
            </span>
          </div>
        </div>
        <button
          onClick={onClose}
          className="p-1 rounded hover:bg-[var(--color-grey-1)]"
          style={{ color: 'var(--color-text-secondary)' }}
        >
          <X size={18} />
        </button>
      </div>

      <div className="p-4 space-y-5">
        {/* Mood selector */}
        <div>
          <label className="block text-xs font-medium mb-2" style={{ color: 'var(--color-text-secondary)' }}>
            Mood
          </label>
          <div className="flex gap-2">
            {MOODS.map((m) => (
              <button
                key={m.value}
                onClick={() => handleMoodChange(m.value)}
                className="flex flex-col items-center gap-1 px-3 py-2 rounded-lg border transition-colors"
                style={{
                  borderColor: mood === m.value ? 'var(--color-primary)' : 'var(--color-border)',
                  backgroundColor: mood === m.value ? 'rgba(65,134,224,0.08)' : 'transparent',
                }}
              >
                <span className="text-xl">{m.emoji}</span>
                <span className="text-[10px]" style={{ color: 'var(--color-text-secondary)' }}>
                  {m.label}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Notes */}
        <div>
          <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--color-text-secondary)' }}>
            Notes
          </label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            onBlur={handleSaveNotes}
            rows={5}
            placeholder="Meeting notes..."
            className="w-full text-sm px-3 py-2 rounded-lg border resize-none"
            style={{
              borderColor: 'var(--color-border)',
              backgroundColor: 'var(--color-bg)',
              color: 'var(--color-text)',
            }}
          />
          {savingNotes && (
            <span className="text-[10px]" style={{ color: 'var(--color-text-secondary)' }}>
              Saving...
            </span>
          )}
        </div>

        {/* Actions */}
        <div>
          <label className="block text-xs font-medium mb-2" style={{ color: 'var(--color-text-secondary)' }}>
            Actions ({meeting.actions.filter((a) => a.status === 'open').length} open)
          </label>
          <div className="space-y-1.5 mb-3">
            {meeting.actions.length === 0 ? (
              <p className="text-xs py-2" style={{ color: 'var(--color-text-secondary)' }}>
                No actions yet.
              </p>
            ) : (
              meeting.actions.map((action) => (
                <div
                  key={action.id}
                  className="flex items-start gap-2 group"
                >
                  <button
                    onClick={() => handleToggleAction(action)}
                    className="mt-0.5 shrink-0"
                    style={{ color: action.status === 'done' ? '#10b981' : 'var(--color-text-secondary)' }}
                  >
                    {action.status === 'done' ? <CheckCircle2 size={16} /> : <Circle size={16} />}
                  </button>
                  <span
                    className="text-sm"
                    style={{
                      color: action.status === 'done' ? 'var(--color-text-secondary)' : 'var(--color-text)',
                      textDecoration: action.status === 'done' ? 'line-through' : 'none',
                    }}
                  >
                    {action.title}
                  </span>
                </div>
              ))
            )}
          </div>

          {/* Add action form */}
          <form onSubmit={handleAddAction} className="flex gap-2">
            <input
              type="text"
              value={newActionTitle}
              onChange={(e) => setNewActionTitle(e.target.value)}
              placeholder="Add action..."
              className="flex-1 text-sm px-3 py-1.5 rounded-lg border"
              style={{
                borderColor: 'var(--color-border)',
                backgroundColor: 'var(--color-bg)',
                color: 'var(--color-text)',
              }}
            />
            <button
              type="submit"
              disabled={!newActionTitle.trim()}
              className="px-3 py-1.5 text-sm font-medium rounded-lg text-white disabled:opacity-50"
              style={{ backgroundColor: 'var(--color-primary)' }}
            >
              Add
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}


// --- Create Meeting Modal ---

function CreateMeetingModal({
  workspaceId,
  members,
  onClose,
  onCreated,
}: {
  workspaceId: string;
  members: User[];
  onClose: () => void;
  onCreated: () => void;
}) {
  const [reportId, setReportId] = useState('');
  const [scheduledDate, setScheduledDate] = useState(
    new Date().toISOString().split('T')[0]
  );
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reportId) return;
    setSaving(true);
    try {
      await meetingsApi.create(workspaceId, {
        report_id: reportId,
        scheduled_date: scheduledDate,
      });
      onCreated();
      onClose();
    } catch (err) {
      console.error('Failed to create meeting:', err);
      Toast.show('Failed to create meeting');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={onClose}>
      <div
        className="w-full max-w-md rounded-xl shadow-2xl p-6"
        style={{ backgroundColor: 'var(--color-surface)' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold" style={{ color: 'var(--color-text)' }}>
            New 1:1 Meeting
          </h3>
          <button
            onClick={onClose}
            className="p-1 rounded hover:bg-[var(--color-grey-1)]"
            style={{ color: 'var(--color-text-secondary)' }}
          >
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1" style={{ color: 'var(--color-text-secondary)' }}>
              Report
            </label>
            <select
              value={reportId}
              onChange={(e) => setReportId(e.target.value)}
              required
              className="w-full px-3 py-2 text-sm rounded-lg border"
              style={{
                borderColor: 'var(--color-border)',
                backgroundColor: 'var(--color-surface)',
                color: 'var(--color-text)',
              }}
            >
              <option value="">Select a team member...</option>
              {members.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1" style={{ color: 'var(--color-text-secondary)' }}>
              Date
            </label>
            <input
              type="date"
              value={scheduledDate}
              onChange={(e) => setScheduledDate(e.target.value)}
              required
              className="w-full px-3 py-2 text-sm rounded-lg border"
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
              disabled={saving || !reportId}
              className="px-4 py-2 text-sm font-medium rounded-lg text-white disabled:opacity-50"
              style={{ background: 'linear-gradient(135deg, #8A00E5, #4D217A)' }}
            >
              {saving ? 'Creating...' : 'Schedule Meeting'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
