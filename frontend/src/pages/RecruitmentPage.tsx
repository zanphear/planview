import { useState, useEffect, useMemo } from 'react';
import {
  UserPlus,
  Search,
  Filter,
  Plus,
  Mail,
  Phone,
  MapPin,
  ChevronRight,
  X,
  Users,
  TrendingUp,
  Award,
} from 'lucide-react';
import { useWorkspaceStore } from '../stores/workspaceStore';
import { useAuthStore } from '../stores/authStore';
import { useLookupValues } from '../stores/lookupStore';
import { candidatesApi } from '../api/candidates';
import type { Candidate } from '../api/candidates';
import { membersApi } from '../api/users';
import type { User } from '../api/users';
import { Toast } from '../components/shared/Toast';
import { LookupSelect } from '../components/shared/LookupSelect';
import { StatCard } from '../components/shared/StatCard';
import { COLOURS } from '../utils/colours';

const PIPELINE_COLUMNS = [
  { key: 'applied', label: 'Applied', colour: '#6b7280' },
  { key: 'screening', label: 'Screening', colour: '#f59e0b' },
  { key: 'interview', label: 'Interview', colour: '#3b82f6' },
  { key: 'offer', label: 'Offer', colour: '#8b5cf6' },
  { key: 'hired', label: 'Hired', colour: '#10b981' },
  { key: 'rejected', label: 'Rejected', colour: '#ef4444' },
] as const;

const EVENT_TYPE_OPTIONS = [
  'phone_screen',
  'interview',
  'technical_test',
  'reference_check',
  'offer_made',
  'offer_accepted',
  'rejected',
] as const;

const EVENT_TYPE_LABELS: Record<string, string> = {
  phone_screen: 'Phone Screen',
  interview: 'Interview',
  technical_test: 'Technical Test',
  reference_check: 'Reference Check',
  offer_made: 'Offer Made',
  offer_accepted: 'Offer Accepted',
  rejected: 'Rejected',
};

interface CreateCandidateForm {
  name: string;
  email: string;
  phone: string;
  position_applied: string;
  source: string;
  notes: string;
}

interface CreateEventForm {
  event_type: string;
  event_date: string;
  interviewer_id: string;
  outcome: string;
  notes: string;
}

const emptyCandidate: CreateCandidateForm = {
  name: '',
  email: '',
  phone: '',
  position_applied: '',
  source: 'website',
  notes: '',
};

const emptyEvent: CreateEventForm = {
  event_type: 'phone_screen',
  event_date: new Date().toISOString().split('T')[0],
  interviewer_id: '',
  outcome: '',
  notes: '',
};

export function RecruitmentPage() {
  const workspace = useWorkspaceStore((s) => s.currentWorkspace);
  const user = useAuthStore((s) => s.user);

  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [members, setMembers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterSource, setFilterSource] = useState<string>('');
  const [showFilters, setShowFilters] = useState(false);

  const [selectedCandidate, setSelectedCandidate] = useState<Candidate | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEventModal, setShowEventModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const [createForm, setCreateForm] = useState<CreateCandidateForm>(emptyCandidate);
  const [eventForm, setEventForm] = useState<CreateEventForm>(emptyEvent);

  const lookupValues = useLookupValues(workspace?.id, 'candidate_source');

  const TERMINAL_STAGES = ['hired', 'rejected', 'withdrawn'];
  const inPipeline = useMemo(
    () => candidates.filter((c) => !TERMINAL_STAGES.includes(c.status)).length,
    [candidates],
  );
  const hiredCount = useMemo(
    () => candidates.filter((c) => c.status === 'hired').length,
    [candidates],
  );
  const uniqueSources = useMemo(
    () => new Set(candidates.map((c) => c.source).filter(Boolean)).size,
    [candidates],
  );

  useEffect(() => {
    if (!workspace) return;
    setLoading(true);
    Promise.all([candidatesApi.list(workspace.id), membersApi.list(workspace.id)])
      .then(([candRes, membRes]) => {
        setCandidates(candRes.data);
        setMembers(membRes.data);
      })
      .catch((err) => {
        console.error('Failed to load recruitment data:', err);
        Toast.show('Failed to load recruitment data');
      })
      .finally(() => setLoading(false));
  }, [workspace]);

  // Escape key handlers for modals
  useEffect(() => {
    if (!showCreateModal) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setShowCreateModal(false);
        setCreateForm(emptyCandidate);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [showCreateModal]);

  useEffect(() => {
    if (!showEventModal) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setShowEventModal(false);
        setEventForm(emptyEvent);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [showEventModal]);

  useEffect(() => {
    if (!showDeleteConfirm) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setShowDeleteConfirm(false);
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [showDeleteConfirm]);

  const filteredCandidates = useMemo(() => {
    let result = candidates;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (c) =>
          c.name.toLowerCase().includes(q) ||
          c.position_applied.toLowerCase().includes(q) ||
          (c.email && c.email.toLowerCase().includes(q)),
      );
    }
    if (filterSource) {
      result = result.filter((c) => c.source === filterSource);
    }
    return result;
  }, [candidates, searchQuery, filterSource]);

  const columnCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const col of PIPELINE_COLUMNS) {
      counts[col.key] = filteredCandidates.filter((c) => c.status === col.key).length;
    }
    return counts;
  }, [filteredCandidates]);

  const handleCreateCandidate = async () => {
    if (!workspace || !createForm.name.trim() || !createForm.position_applied.trim()) return;
    try {
      const { data } = await candidatesApi.create(workspace.id, {
        name: createForm.name.trim(),
        email: createForm.email.trim() || null,
        phone: createForm.phone.trim() || null,
        position_applied: createForm.position_applied.trim(),
        source: createForm.source || null,
        notes: createForm.notes.trim() || null,
        status: 'applied',
      });
      setCandidates((prev) => [...prev, data]);
      setCreateForm(emptyCandidate);
      setShowCreateModal(false);
    } catch (err) {
      console.error('Failed to create candidate:', err);
      Toast.show('Failed to create candidate');
    }
  };

  const handleUpdateStatus = async (candidateId: string, status: string) => {
    if (!workspace) return;
    try {
      const { data } = await candidatesApi.update(workspace.id, candidateId, { status });
      setCandidates((prev) => prev.map((c) => (c.id === candidateId ? data : c)));
      if (selectedCandidate?.id === candidateId) setSelectedCandidate(data);
    } catch (err) {
      console.error('Failed to update status:', err);
      Toast.show('Failed to update candidate status');
    }
  };

  const handleDeleteCandidate = async () => {
    if (!workspace || !selectedCandidate) return;
    try {
      await candidatesApi.delete(workspace.id, selectedCandidate.id);
      setCandidates((prev) => prev.filter((c) => c.id !== selectedCandidate.id));
      setSelectedCandidate(null);
      setShowDeleteConfirm(false);
    } catch (err) {
      console.error('Failed to delete candidate:', err);
      Toast.show('Failed to delete candidate');
    }
  };

  const handleAddEvent = async () => {
    if (!workspace || !selectedCandidate || !eventForm.event_type) return;
    try {
      const { data } = await candidatesApi.addEvent(workspace.id, selectedCandidate.id, {
        event_type: eventForm.event_type,
        event_date: eventForm.event_date,
        interviewer_id: eventForm.interviewer_id || null,
        outcome: eventForm.outcome.trim() || null,
        notes: eventForm.notes.trim() || null,
      });
      const updated = {
        ...selectedCandidate,
        events: [...selectedCandidate.events, data],
      };
      setCandidates((prev) => prev.map((c) => (c.id === updated.id ? updated : c)));
      setSelectedCandidate(updated);
      setEventForm(emptyEvent);
      setShowEventModal(false);
    } catch (err) {
      console.error('Failed to add event:', err);
      Toast.show('Failed to add event');
    }
  };

  const getMemberName = (id: string | null) => {
    if (!id) return null;
    const member = members.find((m) => m.id === id);
    return member?.name ?? null;
  };

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div
          className="animate-spin rounded-full h-8 w-8 border-b-2"
          style={{ borderColor: 'var(--color-primary)' }}
        />
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="px-6 pt-6 pb-4 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-3">
          <UserPlus size={24} style={{ color: 'var(--color-primary)' }} />
          <h1 className="text-xl font-semibold" style={{ color: 'var(--color-text)' }}>
            Recruitment Pipeline
          </h1>
          <span
            className="text-sm px-2 py-0.5 rounded-full"
            style={{ backgroundColor: 'var(--color-grey-1)', color: 'var(--color-text-secondary)' }}
          >
            {candidates.length} candidate{candidates.length !== 1 ? 's' : ''}
          </span>
        </div>
        <div className="flex items-center gap-3">
          {/* Search */}
          <div className="relative">
            <Search
              size={16}
              className="absolute left-2.5 top-1/2 -translate-y-1/2"
              style={{ color: 'var(--color-text-secondary)' }}
            />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search candidates..."
              className="pl-8 pr-3 py-1.5 text-sm border rounded-lg outline-none focus:ring-2 w-56"
              style={
                {
                  borderColor: 'var(--color-border)',
                  backgroundColor: 'var(--color-surface)',
                  color: 'var(--color-text)',
                  '--tw-ring-color': 'var(--color-primary)',
                } as React.CSSProperties
              }
            />
          </div>

          {/* Filter toggle */}
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="p-1.5 rounded-lg hover:bg-muted transition-colors"
            style={{ color: filterSource ? 'var(--color-primary)' : 'var(--color-text-secondary)' }}
            title="Filter by source"
          >
            <Filter size={16} />
          </button>

          {/* Add Candidate */}
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-white rounded-lg text-sm font-medium hover:opacity-90 transition-opacity"
            style={{ backgroundColor: 'var(--color-primary)' }}
          >
            <Plus size={16} />
            Add Candidate
          </button>
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6 px-6">
        <StatCard
          label="Total Candidates"
          value={candidates.length}
          icon={<UserPlus size={20} />}
          colour={COLOURS.blue}
        />
        <StatCard
          label="In Pipeline"
          value={inPipeline}
          icon={<Users size={20} />}
          colour={COLOURS.purple}
        />
        <StatCard
          label="Hired"
          value={hiredCount}
          icon={<Award size={20} />}
          colour={COLOURS.green}
        />
        <StatCard
          label="Sources"
          value={uniqueSources}
          icon={<TrendingUp size={20} />}
          colour={COLOURS.teal}
        />
      </div>

      {/* Source filter bar */}
      {showFilters && (
        <div className="px-6 pb-3 flex items-center gap-2 flex-shrink-0">
          <span className="text-xs font-medium" style={{ color: 'var(--color-text-secondary)' }}>
            Source:
          </span>
          <button
            onClick={() => setFilterSource('')}
            className="px-2.5 py-1 text-xs rounded-full border transition-colors"
            style={{
              borderColor: !filterSource ? 'var(--color-primary)' : 'var(--color-border)',
              backgroundColor: !filterSource ? 'var(--color-primary)' : 'transparent',
              color: !filterSource ? '#fff' : 'var(--color-text-secondary)',
            }}
          >
            All
          </button>
          {lookupValues.map((lv) => {
            const chipColour = lv.colour || '#64748b';
            return (
              <button
                key={lv.value}
                onClick={() => setFilterSource(filterSource === lv.value ? '' : lv.value)}
                className="px-2.5 py-1 text-xs rounded-full border transition-colors capitalize"
                style={{
                  borderColor: filterSource === lv.value ? chipColour : 'var(--color-border)',
                  backgroundColor: filterSource === lv.value ? chipColour : 'transparent',
                  color: filterSource === lv.value ? '#fff' : 'var(--color-text-secondary)',
                }}
              >
                {lv.label || lv.value}
              </button>
            );
          })}
        </div>
      )}

      {/* Pipeline columns */}
      <div className="flex-1 overflow-x-auto px-6 pb-6">
        <div className="flex gap-4 h-full min-w-max">
          {PIPELINE_COLUMNS.map((col) => {
            const colCandidates = filteredCandidates.filter((c) => c.status === col.key);
            return (
              <div
                key={col.key}
                className="w-72 flex flex-col rounded-xl"
                style={{ backgroundColor: 'var(--color-grey-1)' }}
              >
                {/* Column header */}
                <div className="px-3 py-3 flex items-center justify-between flex-shrink-0">
                  <div className="flex items-center gap-2">
                    <div
                      className="w-2.5 h-2.5 rounded-full"
                      style={{ backgroundColor: col.colour }}
                    />
                    <span className="text-sm font-medium" style={{ color: 'var(--color-text)' }}>
                      {col.label}
                    </span>
                  </div>
                  <span
                    className="text-xs font-medium px-1.5 py-0.5 rounded-full min-w-[20px] text-center"
                    style={{ backgroundColor: col.colour + '20', color: col.colour }}
                  >
                    {columnCounts[col.key]}
                  </span>
                </div>

                {/* Candidate cards */}
                <div className="flex-1 overflow-y-auto px-2 pb-2 space-y-2">
                  {colCandidates.map((candidate) => (
                    <button
                      key={candidate.id}
                      onClick={() => setSelectedCandidate(candidate)}
                      className="w-full text-left p-3 rounded-lg border transition-colors hover:shadow-md group"
                      style={{
                        backgroundColor: 'var(--color-surface)',
                        borderColor: 'var(--color-border)',
                      }}
                    >
                      <div className="flex items-start justify-between">
                        <p
                          className="text-sm font-medium truncate"
                          style={{ color: 'var(--color-text)' }}
                        >
                          {candidate.name}
                        </p>
                        <ChevronRight
                          size={14}
                          className="opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0 mt-0.5"
                          style={{ color: 'var(--color-text-secondary)' }}
                        />
                      </div>
                      <p
                        className="text-xs mt-1 truncate"
                        style={{ color: 'var(--color-text-secondary)' }}
                      >
                        {candidate.position_applied}
                      </p>
                      <div className="flex items-center justify-between mt-2">
                        {candidate.source &&
                          (() => {
                            const sourceColour =
                              lookupValues.find((v) => v.value === candidate.source)?.colour ||
                              '#64748b';
                            return (
                              <span
                                className="text-[10px] font-medium px-1.5 py-0.5 rounded-full capitalize"
                                style={{
                                  backgroundColor: sourceColour + '18',
                                  color: sourceColour,
                                }}
                              >
                                {candidate.source}
                              </span>
                            );
                          })()}
                        <span
                          className="text-[10px]"
                          style={{ color: 'var(--color-text-secondary)' }}
                        >
                          {new Date(candidate.applied_date).toLocaleDateString()}
                        </span>
                      </div>
                    </button>
                  ))}
                  {colCandidates.length === 0 && (
                    <p
                      className="text-xs text-center py-4"
                      style={{ color: 'var(--color-text-secondary)' }}
                    >
                      No candidates
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Detail panel - slides in from right */}
      {selectedCandidate && (
        <>
          <div
            className="fixed inset-0 bg-black/30 z-40"
            onClick={() => setSelectedCandidate(null)}
          />
          <div
            className="fixed top-0 right-0 h-full w-[480px] max-w-full z-50 shadow-2xl overflow-y-auto animate-slide-in-right"
            style={{ backgroundColor: 'var(--color-surface)' }}
          >
            {/* Panel header */}
            <div
              className="sticky top-0 z-10 px-5 py-4 flex items-center justify-between border-b"
              style={{
                backgroundColor: 'var(--color-surface)',
                borderColor: 'var(--color-border)',
              }}
            >
              <h2 className="text-lg font-semibold" style={{ color: 'var(--color-text)' }}>
                Candidate Details
              </h2>
              <button
                onClick={() => setSelectedCandidate(null)}
                className="p-1 rounded-lg hover:bg-muted transition-colors"
                style={{ color: 'var(--color-text-secondary)' }}
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-5 space-y-6">
              {/* Candidate info */}
              <div>
                <h3 className="text-lg font-semibold" style={{ color: 'var(--color-text)' }}>
                  {selectedCandidate.name}
                </h3>
                <p className="text-sm mt-0.5" style={{ color: 'var(--color-text-secondary)' }}>
                  {selectedCandidate.position_applied}
                </p>
                <div className="mt-3 space-y-1.5">
                  {selectedCandidate.email && (
                    <div
                      className="flex items-center gap-2 text-sm"
                      style={{ color: 'var(--color-text-secondary)' }}
                    >
                      <Mail size={14} />
                      <span>{selectedCandidate.email}</span>
                    </div>
                  )}
                  {selectedCandidate.phone && (
                    <div
                      className="flex items-center gap-2 text-sm"
                      style={{ color: 'var(--color-text-secondary)' }}
                    >
                      <Phone size={14} />
                      <span>{selectedCandidate.phone}</span>
                    </div>
                  )}
                  {selectedCandidate.source && (
                    <div
                      className="flex items-center gap-2 text-sm"
                      style={{ color: 'var(--color-text-secondary)' }}
                    >
                      <MapPin size={14} />
                      <span className="capitalize">Source: {selectedCandidate.source}</span>
                    </div>
                  )}
                </div>
                {selectedCandidate.notes && (
                  <p
                    className="text-sm mt-3 p-2 rounded-lg"
                    style={{
                      backgroundColor: 'var(--color-grey-1)',
                      color: 'var(--color-text-secondary)',
                    }}
                  >
                    {selectedCandidate.notes}
                  </p>
                )}
              </div>

              {/* Status dropdown */}
              <div>
                <label
                  className="text-xs font-medium"
                  style={{ color: 'var(--color-text-secondary)' }}
                >
                  Pipeline Status
                </label>
                <select
                  value={selectedCandidate.status}
                  onChange={(e) => handleUpdateStatus(selectedCandidate.id, e.target.value)}
                  className="mt-1 w-full px-3 py-2 text-sm border rounded-lg outline-none focus:ring-2"
                  style={
                    {
                      borderColor: 'var(--color-border)',
                      backgroundColor: 'var(--color-surface)',
                      color: 'var(--color-text)',
                      '--tw-ring-color': 'var(--color-primary)',
                    } as React.CSSProperties
                  }
                >
                  {PIPELINE_COLUMNS.map((col) => (
                    <option key={col.key} value={col.key}>
                      {col.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Actions */}
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    setEventForm({ ...emptyEvent, interviewer_id: user?.id ?? '' });
                    setShowEventModal(true);
                  }}
                  className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-sm font-medium rounded-lg border transition-colors hover:bg-subtle"
                  style={{ borderColor: 'var(--color-border)', color: 'var(--color-text)' }}
                >
                  <Plus size={14} />
                  Add Event
                </button>
                <button
                  onClick={() => setShowDeleteConfirm(true)}
                  className="px-3 py-2 text-sm font-medium rounded-lg border transition-colors hover:bg-red-50"
                  style={{ borderColor: 'var(--color-border)', color: '#ef4444' }}
                >
                  Delete
                </button>
              </div>

              {/* Event timeline */}
              <div>
                <h4 className="text-sm font-medium mb-3" style={{ color: 'var(--color-text)' }}>
                  Timeline
                </h4>
                {selectedCandidate.events.length === 0 ? (
                  <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
                    No events recorded yet.
                  </p>
                ) : (
                  <div className="relative ml-3">
                    {/* Connecting line */}
                    <div
                      className="absolute left-0 top-1.5 bottom-1.5 w-px"
                      style={{ backgroundColor: 'var(--color-border)' }}
                    />
                    <div className="space-y-4">
                      {[...selectedCandidate.events]
                        .sort(
                          (a, b) =>
                            new Date(b.event_date).getTime() - new Date(a.event_date).getTime(),
                        )
                        .map((evt) => (
                          <div key={evt.id} className="relative pl-5">
                            {/* Dot */}
                            <div
                              className="absolute left-0 top-1.5 w-2 h-2 rounded-full -translate-x-[3.5px]"
                              style={{ backgroundColor: 'var(--color-primary)' }}
                            />
                            <div>
                              <div className="flex items-center gap-2">
                                <span
                                  className="text-sm font-medium"
                                  style={{ color: 'var(--color-text)' }}
                                >
                                  {EVENT_TYPE_LABELS[evt.event_type] || evt.event_type}
                                </span>
                                <span
                                  className="text-xs"
                                  style={{ color: 'var(--color-text-secondary)' }}
                                >
                                  {new Date(evt.event_date).toLocaleDateString()}
                                </span>
                              </div>
                              {getMemberName(evt.interviewer_id) && (
                                <p
                                  className="text-xs mt-0.5"
                                  style={{ color: 'var(--color-text-secondary)' }}
                                >
                                  Interviewer: {getMemberName(evt.interviewer_id)}
                                </p>
                              )}
                              {evt.outcome && (
                                <p
                                  className="text-xs mt-0.5"
                                  style={{ color: 'var(--color-text-secondary)' }}
                                >
                                  Outcome: {evt.outcome}
                                </p>
                              )}
                              {evt.notes && (
                                <p
                                  className="text-xs mt-1 p-1.5 rounded"
                                  style={{
                                    backgroundColor: 'var(--color-grey-1)',
                                    color: 'var(--color-text-secondary)',
                                  }}
                                >
                                  {evt.notes}
                                </p>
                              )}
                            </div>
                          </div>
                        ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Delete confirmation */}
            {showDeleteConfirm && (
              <div className="fixed inset-0 bg-black/40 z-[60] flex items-center justify-center">
                <div
                  className="rounded-xl p-5 w-80 shadow-xl"
                  style={{ backgroundColor: 'var(--color-surface)' }}
                >
                  <h3 className="text-sm font-semibold" style={{ color: 'var(--color-text)' }}>
                    Delete candidate?
                  </h3>
                  <p className="text-sm mt-2" style={{ color: 'var(--color-text-secondary)' }}>
                    This will permanently remove {selectedCandidate.name} and all associated events.
                    This cannot be undone.
                  </p>
                  <div className="flex gap-2 mt-4 justify-end">
                    <button
                      onClick={() => setShowDeleteConfirm(false)}
                      className="px-3 py-1.5 text-sm rounded-lg border hover:bg-subtle transition-colors"
                      style={{ borderColor: 'var(--color-border)', color: 'var(--color-text)' }}
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleDeleteCandidate}
                      className="px-3 py-1.5 text-sm rounded-lg text-white bg-red-500 hover:bg-red-600 transition-colors"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </>
      )}

      {/* Create candidate modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center">
          <div
            className="rounded-xl p-6 w-[440px] max-w-[90vw] shadow-xl"
            style={{ backgroundColor: 'var(--color-surface)' }}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold" style={{ color: 'var(--color-text)' }}>
                Add Candidate
              </h3>
              <button
                onClick={() => {
                  setShowCreateModal(false);
                  setCreateForm(emptyCandidate);
                }}
                className="p-1 rounded-lg hover:bg-muted transition-colors"
                style={{ color: 'var(--color-text-secondary)' }}
              >
                <X size={18} />
              </button>
            </div>
            <div className="space-y-3">
              <div>
                <label
                  className="text-xs font-medium"
                  style={{ color: 'var(--color-text-secondary)' }}
                >
                  Name *
                </label>
                <input
                  type="text"
                  value={createForm.name}
                  onChange={(e) => setCreateForm((f) => ({ ...f, name: e.target.value }))}
                  className="mt-1 w-full px-3 py-2 text-sm border rounded-lg outline-none focus:ring-2"
                  style={
                    {
                      borderColor: 'var(--color-border)',
                      backgroundColor: 'var(--color-surface)',
                      color: 'var(--color-text)',
                      '--tw-ring-color': 'var(--color-primary)',
                    } as React.CSSProperties
                  }
                  placeholder="Full name"
                  autoFocus
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label
                    className="text-xs font-medium"
                    style={{ color: 'var(--color-text-secondary)' }}
                  >
                    Email
                  </label>
                  <input
                    type="email"
                    value={createForm.email}
                    onChange={(e) => setCreateForm((f) => ({ ...f, email: e.target.value }))}
                    className="mt-1 w-full px-3 py-2 text-sm border rounded-lg outline-none focus:ring-2"
                    style={
                      {
                        borderColor: 'var(--color-border)',
                        backgroundColor: 'var(--color-surface)',
                        color: 'var(--color-text)',
                        '--tw-ring-color': 'var(--color-primary)',
                      } as React.CSSProperties
                    }
                    placeholder="email@example.com"
                  />
                </div>
                <div>
                  <label
                    className="text-xs font-medium"
                    style={{ color: 'var(--color-text-secondary)' }}
                  >
                    Phone
                  </label>
                  <input
                    type="tel"
                    value={createForm.phone}
                    onChange={(e) => setCreateForm((f) => ({ ...f, phone: e.target.value }))}
                    className="mt-1 w-full px-3 py-2 text-sm border rounded-lg outline-none focus:ring-2"
                    style={
                      {
                        borderColor: 'var(--color-border)',
                        backgroundColor: 'var(--color-surface)',
                        color: 'var(--color-text)',
                        '--tw-ring-color': 'var(--color-primary)',
                      } as React.CSSProperties
                    }
                    placeholder="+44..."
                  />
                </div>
              </div>
              <div>
                <label
                  className="text-xs font-medium"
                  style={{ color: 'var(--color-text-secondary)' }}
                >
                  Position Applied *
                </label>
                <input
                  type="text"
                  value={createForm.position_applied}
                  onChange={(e) =>
                    setCreateForm((f) => ({ ...f, position_applied: e.target.value }))
                  }
                  className="mt-1 w-full px-3 py-2 text-sm border rounded-lg outline-none focus:ring-2"
                  style={
                    {
                      borderColor: 'var(--color-border)',
                      backgroundColor: 'var(--color-surface)',
                      color: 'var(--color-text)',
                      '--tw-ring-color': 'var(--color-primary)',
                    } as React.CSSProperties
                  }
                  placeholder="e.g. Senior Engineer"
                />
              </div>
              <div>
                <label
                  className="text-xs font-medium"
                  style={{ color: 'var(--color-text-secondary)' }}
                >
                  Source
                </label>
                <LookupSelect
                  category="candidate_source"
                  value={createForm.source}
                  onChange={(v) => setCreateForm((f) => ({ ...f, source: v }))}
                  placeholder="Select source..."
                  className="mt-1 w-full px-3 py-2 text-sm border rounded-lg outline-none focus:ring-2 capitalize"
                  style={
                    {
                      borderColor: 'var(--color-border)',
                      backgroundColor: 'var(--color-surface)',
                      color: 'var(--color-text)',
                      '--tw-ring-color': 'var(--color-primary)',
                    } as React.CSSProperties
                  }
                />
              </div>
              <div>
                <label
                  className="text-xs font-medium"
                  style={{ color: 'var(--color-text-secondary)' }}
                >
                  Notes
                </label>
                <textarea
                  value={createForm.notes}
                  onChange={(e) => setCreateForm((f) => ({ ...f, notes: e.target.value }))}
                  rows={3}
                  className="mt-1 w-full px-3 py-2 text-sm border rounded-lg outline-none focus:ring-2 resize-none"
                  style={
                    {
                      borderColor: 'var(--color-border)',
                      backgroundColor: 'var(--color-surface)',
                      color: 'var(--color-text)',
                      '--tw-ring-color': 'var(--color-primary)',
                    } as React.CSSProperties
                  }
                  placeholder="Any initial notes..."
                />
              </div>
            </div>
            <div className="flex gap-2 mt-5 justify-end">
              <button
                onClick={() => {
                  setShowCreateModal(false);
                  setCreateForm(emptyCandidate);
                }}
                className="px-4 py-2 text-sm rounded-lg border hover:bg-subtle transition-colors"
                style={{ borderColor: 'var(--color-border)', color: 'var(--color-text)' }}
              >
                Cancel
              </button>
              <button
                onClick={handleCreateCandidate}
                disabled={!createForm.name.trim() || !createForm.position_applied.trim()}
                className="px-4 py-2 text-sm font-medium text-white rounded-lg disabled:opacity-50 hover:opacity-90 transition-opacity"
                style={{ backgroundColor: 'var(--color-primary)' }}
              >
                Add Candidate
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add event modal */}
      {showEventModal && (
        <div className="fixed inset-0 bg-black/40 z-[60] flex items-center justify-center">
          <div
            className="rounded-xl p-6 w-[440px] max-w-[90vw] shadow-xl"
            style={{ backgroundColor: 'var(--color-surface)' }}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold" style={{ color: 'var(--color-text)' }}>
                Add Event
              </h3>
              <button
                onClick={() => {
                  setShowEventModal(false);
                  setEventForm(emptyEvent);
                }}
                className="p-1 rounded-lg hover:bg-muted transition-colors"
                style={{ color: 'var(--color-text-secondary)' }}
              >
                <X size={18} />
              </button>
            </div>
            <div className="space-y-3">
              <div>
                <label
                  className="text-xs font-medium"
                  style={{ color: 'var(--color-text-secondary)' }}
                >
                  Event Type *
                </label>
                <select
                  value={eventForm.event_type}
                  onChange={(e) => setEventForm((f) => ({ ...f, event_type: e.target.value }))}
                  className="mt-1 w-full px-3 py-2 text-sm border rounded-lg outline-none focus:ring-2"
                  style={
                    {
                      borderColor: 'var(--color-border)',
                      backgroundColor: 'var(--color-surface)',
                      color: 'var(--color-text)',
                      '--tw-ring-color': 'var(--color-primary)',
                    } as React.CSSProperties
                  }
                >
                  {EVENT_TYPE_OPTIONS.map((et) => (
                    <option key={et} value={et}>
                      {EVENT_TYPE_LABELS[et]}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label
                  className="text-xs font-medium"
                  style={{ color: 'var(--color-text-secondary)' }}
                >
                  Date
                </label>
                <input
                  type="date"
                  value={eventForm.event_date}
                  onChange={(e) => setEventForm((f) => ({ ...f, event_date: e.target.value }))}
                  className="mt-1 w-full px-3 py-2 text-sm border rounded-lg outline-none focus:ring-2"
                  style={
                    {
                      borderColor: 'var(--color-border)',
                      backgroundColor: 'var(--color-surface)',
                      color: 'var(--color-text)',
                      '--tw-ring-color': 'var(--color-primary)',
                    } as React.CSSProperties
                  }
                />
              </div>
              <div>
                <label
                  className="text-xs font-medium"
                  style={{ color: 'var(--color-text-secondary)' }}
                >
                  Interviewer
                </label>
                <select
                  value={eventForm.interviewer_id}
                  onChange={(e) => setEventForm((f) => ({ ...f, interviewer_id: e.target.value }))}
                  className="mt-1 w-full px-3 py-2 text-sm border rounded-lg outline-none focus:ring-2"
                  style={
                    {
                      borderColor: 'var(--color-border)',
                      backgroundColor: 'var(--color-surface)',
                      color: 'var(--color-text)',
                      '--tw-ring-color': 'var(--color-primary)',
                    } as React.CSSProperties
                  }
                >
                  <option value="">None</option>
                  {members.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label
                  className="text-xs font-medium"
                  style={{ color: 'var(--color-text-secondary)' }}
                >
                  Outcome
                </label>
                <LookupSelect
                  category="event_outcome"
                  value={eventForm.outcome}
                  onChange={(v) => setEventForm((f) => ({ ...f, outcome: v }))}
                  placeholder="Select outcome..."
                  className="mt-1 w-full px-3 py-2 text-sm border rounded-lg outline-none focus:ring-2"
                  style={
                    {
                      borderColor: 'var(--color-border)',
                      backgroundColor: 'var(--color-surface)',
                      color: 'var(--color-text)',
                      '--tw-ring-color': 'var(--color-primary)',
                    } as React.CSSProperties
                  }
                />
              </div>
              <div>
                <label
                  className="text-xs font-medium"
                  style={{ color: 'var(--color-text-secondary)' }}
                >
                  Notes
                </label>
                <textarea
                  value={eventForm.notes}
                  onChange={(e) => setEventForm((f) => ({ ...f, notes: e.target.value }))}
                  rows={3}
                  className="mt-1 w-full px-3 py-2 text-sm border rounded-lg outline-none focus:ring-2 resize-none"
                  style={
                    {
                      borderColor: 'var(--color-border)',
                      backgroundColor: 'var(--color-surface)',
                      color: 'var(--color-text)',
                      '--tw-ring-color': 'var(--color-primary)',
                    } as React.CSSProperties
                  }
                  placeholder="Additional details..."
                />
              </div>
            </div>
            <div className="flex gap-2 mt-5 justify-end">
              <button
                onClick={() => {
                  setShowEventModal(false);
                  setEventForm(emptyEvent);
                }}
                className="px-4 py-2 text-sm rounded-lg border hover:bg-subtle transition-colors"
                style={{ borderColor: 'var(--color-border)', color: 'var(--color-text)' }}
              >
                Cancel
              </button>
              <button
                onClick={handleAddEvent}
                className="px-4 py-2 text-sm font-medium text-white rounded-lg hover:opacity-90 transition-opacity"
                style={{ backgroundColor: 'var(--color-primary)' }}
              >
                Add Event
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
