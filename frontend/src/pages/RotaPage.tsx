import { useEffect, useState, useMemo } from 'react';
import {
  startOfWeek, endOfWeek, addWeeks, subWeeks, addDays,
  format, eachDayOfInterval, isWeekend, isToday, isSameDay,
} from 'date-fns';
import { ChevronLeft, ChevronRight, Plus, Trash2, Edit2, X, Phone, Clock, Sun } from 'lucide-react';
import { useWorkspaceStore } from '../stores/workspaceStore';
import { rotasApi } from '../api/rotas';
import { membersApi } from '../api/users';
import { LoadingSpinner } from '../components/shared/LoadingSpinner';
import type { Rota, RotaEntry } from '../api/rotas';
import type { User } from '../api/users';

const ROTA_TYPE_LABELS: Record<string, { label: string; desc: string }> = {
  callout: { label: 'Call-out', desc: 'On-call coverage' },
  weekday: { label: 'Weekday', desc: '9-5 type shifts' },
  '24hour': { label: '24 Hour', desc: 'Full 24h coverage' },
};

const ROTA_TYPE_ICONS: Record<string, typeof Phone> = {
  callout: Phone,
  weekday: Clock,
  '24hour': Sun,
};

export function RotaPage() {
  const workspace = useWorkspaceStore((s) => s.currentWorkspace);
  const [rotas, setRotas] = useState<Rota[]>([]);
  const [members, setMembers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [weekStart, setWeekStart] = useState(() => startOfWeek(new Date(), { weekStartsOn: 1 }));
  const [weeksToShow, setWeeksToShow] = useState(2);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingRota, setEditingRota] = useState<Rota | null>(null);
  const [addingEntry, setAddingEntry] = useState<string | null>(null);

  const loadData = async () => {
    if (!workspace) return;
    setLoading(true);
    try {
      const [rotasRes, membersRes] = await Promise.all([
        rotasApi.list(workspace.id),
        membersApi.list(workspace.id),
      ]);
      setRotas(rotasRes.data);
      setMembers(membersRes.data);
    } catch (err) {
      console.error('Failed to load rotas:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [workspace]);

  const dateRange = useMemo(() => {
    const end = endOfWeek(addWeeks(weekStart, weeksToShow - 1), { weekStartsOn: 1 });
    return eachDayOfInterval({ start: weekStart, end });
  }, [weekStart, weeksToShow]);

  if (loading) return <LoadingSpinner />;

  return (
    <div className="p-4 sm:p-6 h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <h2 className="text-xl font-bold" style={{ color: 'var(--color-text)' }}>
          Rotas
        </h2>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setWeekStart(subWeeks(weekStart, 1))}
            className="p-2 rounded-lg hover:bg-[var(--color-grey-1)] transition-colors"
            style={{ color: 'var(--color-text-secondary)' }}
          >
            <ChevronLeft size={18} />
          </button>
          <button
            onClick={() => setWeekStart(startOfWeek(new Date(), { weekStartsOn: 1 }))}
            className="px-3 py-1.5 text-sm font-medium rounded-lg hover:bg-[var(--color-grey-1)] transition-colors"
            style={{ color: 'var(--color-text)' }}
          >
            This Week
          </button>
          <button
            onClick={() => setWeekStart(addWeeks(weekStart, 1))}
            className="p-2 rounded-lg hover:bg-[var(--color-grey-1)] transition-colors"
            style={{ color: 'var(--color-text-secondary)' }}
          >
            <ChevronRight size={18} />
          </button>
          <select
            value={weeksToShow}
            onChange={(e) => setWeeksToShow(Number(e.target.value))}
            className="text-sm px-2 py-1.5 rounded-lg border"
            style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-surface)', color: 'var(--color-text)' }}
          >
            <option value={1}>1 week</option>
            <option value={2}>2 weeks</option>
            <option value={4}>4 weeks</option>
          </select>
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-lg text-white transition-colors"
            style={{ background: 'linear-gradient(135deg, #8A00E5, #4D217A)' }}
          >
            <Plus size={14} />
            New Rota
          </button>
        </div>
      </div>

      {/* Date range label */}
      <div className="text-sm mb-3" style={{ color: 'var(--color-text-secondary)' }}>
        {format(dateRange[0], 'd MMM yyyy')} — {format(dateRange[dateRange.length - 1], 'd MMM yyyy')}
      </div>

      {/* Rota sections */}
      {rotas.length === 0 ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <Phone size={48} className="mx-auto mb-3 opacity-30" style={{ color: 'var(--color-text-secondary)' }} />
            <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
              No rotas configured yet. Create one to get started.
            </p>
          </div>
        </div>
      ) : (
        <div className="flex-1 overflow-auto space-y-6">
          {rotas.map((rota) => (
            <RotaSection
              key={rota.id}
              rota={rota}
              dateRange={dateRange}
              members={members}
              workspaceId={workspace!.id}
              onUpdate={loadData}
              onEdit={() => setEditingRota(rota)}
              addingEntry={addingEntry === rota.id}
              onToggleAddEntry={() => setAddingEntry(addingEntry === rota.id ? null : rota.id)}
            />
          ))}
        </div>
      )}

      {/* Create Modal */}
      {showCreateModal && workspace && (
        <CreateRotaModal
          workspaceId={workspace.id}
          onClose={() => setShowCreateModal(false)}
          onCreated={loadData}
        />
      )}

      {/* Edit Modal */}
      {editingRota && workspace && (
        <EditRotaModal
          rota={editingRota}
          workspaceId={workspace.id}
          onClose={() => setEditingRota(null)}
          onSaved={loadData}
          onDeleted={loadData}
        />
      )}
    </div>
  );
}


// --- Rota Section (one per rota) ---

function RotaSection({
  rota, dateRange, members, workspaceId, onUpdate, onEdit, addingEntry, onToggleAddEntry,
}: {
  rota: Rota;
  dateRange: Date[];
  members: User[];
  workspaceId: string;
  onUpdate: () => void;
  onEdit: () => void;
  addingEntry: boolean;
  onToggleAddEntry: () => void;
}) {
  const Icon = ROTA_TYPE_ICONS[rota.rota_type] || Phone;
  const typeInfo = ROTA_TYPE_LABELS[rota.rota_type] || { label: rota.rota_type, desc: '' };

  const timeLabel = rota.rota_type === 'weekday' && rota.start_time && rota.end_time
    ? `${rota.start_time.slice(0, 5)} - ${rota.end_time.slice(0, 5)}`
    : rota.rota_type === '24hour'
      ? '24h'
      : '';

  const handleDeleteEntry = async (entryId: string) => {
    try {
      await rotasApi.deleteEntry(workspaceId, rota.id, entryId);
      onUpdate();
    } catch (err) {
      console.error('Failed to delete entry:', err);
    }
  };

  return (
    <div className="rounded-xl border" style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-surface)' }}>
      {/* Rota header */}
      <div className="flex items-center justify-between px-4 py-3 border-b" style={{ borderColor: 'var(--color-border)' }}>
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: rota.colour + '20', color: rota.colour }}>
            <Icon size={16} />
          </div>
          <div>
            <div className="font-semibold text-sm" style={{ color: 'var(--color-text)' }}>{rota.name}</div>
            <div className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>
              {typeInfo.label}
              {timeLabel && ` \u00B7 ${timeLabel}`}
              {rota.include_weekends ? ' \u00B7 Inc. weekends' : ''}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={onToggleAddEntry}
            className="p-1.5 rounded-lg hover:bg-[var(--color-grey-1)] transition-colors"
            style={{ color: 'var(--color-primary)' }}
            title="Add entry"
          >
            <Plus size={16} />
          </button>
          <button
            onClick={onEdit}
            className="p-1.5 rounded-lg hover:bg-[var(--color-grey-1)] transition-colors"
            style={{ color: 'var(--color-text-secondary)' }}
            title="Edit rota"
          >
            <Edit2 size={14} />
          </button>
        </div>
      </div>

      {/* Add entry form */}
      {addingEntry && (
        <AddEntryForm
          rotaId={rota.id}
          workspaceId={workspaceId}
          members={members}
          onCreated={() => { onToggleAddEntry(); onUpdate(); }}
          onCancel={onToggleAddEntry}
        />
      )}

      {/* Timeline grid */}
      <div className="overflow-x-auto">
        <div style={{ minWidth: dateRange.length * 48 + 160 }}>
          {/* Day headers */}
          <div className="flex border-b" style={{ borderColor: 'var(--color-border)' }}>
            <div className="w-40 shrink-0 px-3 py-2 text-xs font-medium" style={{ color: 'var(--color-text-secondary)' }}>
              Person
            </div>
            {dateRange.map((day) => {
              const weekend = isWeekend(day);
              const today = isToday(day);
              const showDay = !weekend || rota.include_weekends;
              return (
                <div
                  key={day.toISOString()}
                  className="w-12 shrink-0 text-center py-2"
                  style={{
                    backgroundColor: today ? 'rgba(65,134,224,0.08)' : weekend && !showDay ? 'var(--color-grey-1)' : undefined,
                    opacity: weekend && !showDay ? 0.4 : 1,
                  }}
                >
                  <div className="text-[10px]" style={{ color: 'var(--color-text-secondary)' }}>
                    {format(day, 'EEE')}
                  </div>
                  <div
                    className={`text-xs font-medium ${today ? 'w-6 h-6 rounded-full flex items-center justify-center mx-auto bg-[var(--color-primary)] text-white' : ''}`}
                    style={{ color: today ? undefined : 'var(--color-text)' }}
                  >
                    {format(day, 'd')}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Entries as swimlanes */}
          {rota.entries.length === 0 ? (
            <div className="px-4 py-6 text-center text-xs" style={{ color: 'var(--color-text-secondary)' }}>
              No entries yet. Click + to add someone to this rota.
            </div>
          ) : (
            <EntryRows
              entries={rota.entries}
              dateRange={dateRange}
              rotaColour={rota.colour}
              includeWeekends={rota.include_weekends}
              onDelete={handleDeleteEntry}
            />
          )}
        </div>
      </div>
    </div>
  );
}


// --- Entry Rows ---

function EntryRows({
  entries, dateRange, rotaColour, includeWeekends, onDelete,
}: {
  entries: RotaEntry[];
  dateRange: Date[];
  rotaColour: string;
  includeWeekends: boolean;
  onDelete: (id: string) => void;
}) {
  // Group entries by user
  const byUser = useMemo(() => {
    const map = new Map<string, { user: RotaEntry['user']; entries: RotaEntry[] }>();
    for (const entry of entries) {
      const uid = entry.user_id;
      if (!map.has(uid)) {
        map.set(uid, { user: entry.user, entries: [] });
      }
      map.get(uid)!.entries.push(entry);
    }
    return Array.from(map.values());
  }, [entries]);

  return (
    <>
      {byUser.map(({ user, entries: userEntries }) => (
        <div key={user?.id || 'unknown'} className="flex border-b last:border-b-0" style={{ borderColor: 'var(--color-border)' }}>
          {/* User label */}
          <div className="w-40 shrink-0 px-3 py-2 flex items-center gap-2">
            <div
              className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold text-white shrink-0"
              style={{ backgroundColor: user?.colour || '#999' }}
            >
              {user?.initials || user?.name?.charAt(0) || '?'}
            </div>
            <span className="text-xs truncate" style={{ color: 'var(--color-text)' }}>
              {user?.name || 'Unknown'}
            </span>
          </div>

          {/* Day cells */}
          {dateRange.map((day) => {
            const weekend = isWeekend(day);
            const today = isToday(day);
            const covered = userEntries.some((e) => {
              const from = new Date(e.date_from);
              const to = new Date(e.date_to);
              return day >= from && day <= to;
            });
            const matchingEntry = userEntries.find((e) => {
              const from = new Date(e.date_from);
              return isSameDay(day, from);
            });
            const dimmed = weekend && !includeWeekends;

            return (
              <div
                key={day.toISOString()}
                className="w-12 shrink-0 h-10 flex items-center justify-center relative group"
                style={{
                  backgroundColor: today ? 'rgba(65,134,224,0.05)' : dimmed ? 'var(--color-grey-1)' : undefined,
                  opacity: dimmed ? 0.3 : 1,
                }}
              >
                {covered && !dimmed && (
                  <div
                    className="w-10 h-6 rounded"
                    style={{ backgroundColor: rotaColour, opacity: 0.7 }}
                    title={matchingEntry?.notes || user?.name || ''}
                  />
                )}
                {matchingEntry && !dimmed && (
                  <button
                    onClick={() => onDelete(matchingEntry.id)}
                    className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-red-500 text-white items-center justify-center text-[8px] hidden group-hover:flex"
                    title="Remove"
                  >
                    <X size={8} />
                  </button>
                )}
              </div>
            );
          })}
        </div>
      ))}
    </>
  );
}


// --- Add Entry Form ---

function AddEntryForm({
  rotaId, workspaceId, members, onCreated, onCancel,
}: {
  rotaId: string;
  workspaceId: string;
  members: User[];
  onCreated: () => void;
  onCancel: () => void;
}) {
  const [userId, setUserId] = useState('');
  const [dateFrom, setDateFrom] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [dateTo, setDateTo] = useState(format(addDays(new Date(), 6), 'yyyy-MM-dd'));
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userId) return;
    setSaving(true);
    try {
      await rotasApi.createEntry(workspaceId, rotaId, {
        user_id: userId,
        date_from: dateFrom,
        date_to: dateTo,
        notes: notes || undefined,
      });
      onCreated();
    } catch (err) {
      console.error('Failed to add entry:', err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex items-end gap-3 px-4 py-3 border-b" style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-bg)' }}>
      <div className="flex-1 min-w-0">
        <label className="block text-xs mb-1" style={{ color: 'var(--color-text-secondary)' }}>Person</label>
        <select
          value={userId}
          onChange={(e) => setUserId(e.target.value)}
          required
          className="w-full text-sm px-2 py-1.5 rounded border"
          style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-surface)', color: 'var(--color-text)' }}
        >
          <option value="">Select...</option>
          {members.map((m) => (
            <option key={m.id} value={m.id}>{m.name}</option>
          ))}
        </select>
      </div>
      <div>
        <label className="block text-xs mb-1" style={{ color: 'var(--color-text-secondary)' }}>From</label>
        <input
          type="date"
          value={dateFrom}
          onChange={(e) => setDateFrom(e.target.value)}
          className="text-sm px-2 py-1.5 rounded border"
          style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-surface)', color: 'var(--color-text)' }}
        />
      </div>
      <div>
        <label className="block text-xs mb-1" style={{ color: 'var(--color-text-secondary)' }}>To</label>
        <input
          type="date"
          value={dateTo}
          onChange={(e) => setDateTo(e.target.value)}
          className="text-sm px-2 py-1.5 rounded border"
          style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-surface)', color: 'var(--color-text)' }}
        />
      </div>
      <div>
        <label className="block text-xs mb-1" style={{ color: 'var(--color-text-secondary)' }}>Notes</label>
        <input
          type="text"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Optional"
          className="text-sm px-2 py-1.5 rounded border w-32"
          style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-surface)', color: 'var(--color-text)' }}
        />
      </div>
      <button
        type="submit"
        disabled={saving || !userId}
        className="px-3 py-1.5 text-sm font-medium rounded-lg text-white disabled:opacity-50"
        style={{ backgroundColor: 'var(--color-primary)' }}
      >
        Add
      </button>
      <button
        type="button"
        onClick={onCancel}
        className="p-1.5 rounded-lg hover:bg-[var(--color-grey-1)]"
        style={{ color: 'var(--color-text-secondary)' }}
      >
        <X size={16} />
      </button>
    </form>
  );
}


// --- Create Rota Modal ---

function CreateRotaModal({
  workspaceId, onClose, onCreated,
}: {
  workspaceId: string;
  onClose: () => void;
  onCreated: () => void;
}) {
  const [name, setName] = useState('');
  const [rotaType, setRotaType] = useState<string>('callout');
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('17:00');
  const [includeWeekends, setIncludeWeekends] = useState(false);
  const [colour, setColour] = useState('#8A00E5');
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await rotasApi.create(workspaceId, {
        name,
        rota_type: rotaType as Rota['rota_type'],
        start_time: rotaType === 'weekday' ? startTime : null,
        end_time: rotaType === 'weekday' ? endTime : null,
        include_weekends: includeWeekends,
        colour,
      });
      onCreated();
      onClose();
    } catch (err) {
      console.error('Failed to create rota:', err);
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
          <h3 className="text-lg font-bold" style={{ color: 'var(--color-text)' }}>New Rota</h3>
          <button onClick={onClose} className="p-1 rounded hover:bg-[var(--color-grey-1)]" style={{ color: 'var(--color-text-secondary)' }}>
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1" style={{ color: 'var(--color-text-secondary)' }}>Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              placeholder="e.g. On-Call Rota"
              className="w-full px-3 py-2 text-sm rounded-lg border"
              style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-surface)', color: 'var(--color-text)' }}
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2" style={{ color: 'var(--color-text-secondary)' }}>Type</label>
            <div className="grid grid-cols-3 gap-2">
              {Object.entries(ROTA_TYPE_LABELS).map(([key, info]) => {
                const Icon = ROTA_TYPE_ICONS[key];
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setRotaType(key)}
                    className={`p-3 rounded-lg border text-center transition-all ${
                      rotaType === key ? 'ring-2 ring-[var(--color-primary)]' : ''
                    }`}
                    style={{
                      borderColor: rotaType === key ? 'var(--color-primary)' : 'var(--color-border)',
                      backgroundColor: rotaType === key ? 'rgba(65,134,224,0.05)' : 'var(--color-surface)',
                    }}
                  >
                    <Icon size={20} className="mx-auto mb-1" style={{ color: rotaType === key ? 'var(--color-primary)' : 'var(--color-text-secondary)' }} />
                    <div className="text-xs font-medium" style={{ color: 'var(--color-text)' }}>{info.label}</div>
                    <div className="text-[10px] mt-0.5" style={{ color: 'var(--color-text-secondary)' }}>{info.desc}</div>
                  </button>
                );
              })}
            </div>
          </div>

          {rotaType === 'weekday' && (
            <div className="flex gap-3">
              <div className="flex-1">
                <label className="block text-sm font-medium mb-1" style={{ color: 'var(--color-text-secondary)' }}>Start Time</label>
                <input
                  type="time"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-lg border"
                  style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-surface)', color: 'var(--color-text)' }}
                />
              </div>
              <div className="flex-1">
                <label className="block text-sm font-medium mb-1" style={{ color: 'var(--color-text-secondary)' }}>End Time</label>
                <input
                  type="time"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-lg border"
                  style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-surface)', color: 'var(--color-text)' }}
                />
              </div>
            </div>
          )}

          <div className="flex items-center gap-3">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={includeWeekends}
                onChange={(e) => setIncludeWeekends(e.target.checked)}
                className="rounded"
              />
              <span className="text-sm" style={{ color: 'var(--color-text)' }}>Include weekends</span>
            </label>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1" style={{ color: 'var(--color-text-secondary)' }}>Colour</label>
            <div className="flex items-center gap-2">
              <input type="color" value={colour} onChange={(e) => setColour(e.target.value)} className="w-8 h-8 rounded cursor-pointer" />
              <span className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>{colour}</span>
            </div>
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
              disabled={saving || !name.trim()}
              className="px-4 py-2 text-sm font-medium rounded-lg text-white disabled:opacity-50"
              style={{ background: 'linear-gradient(135deg, #8A00E5, #4D217A)' }}
            >
              {saving ? 'Creating...' : 'Create Rota'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}


// --- Edit Rota Modal ---

function EditRotaModal({
  rota, workspaceId, onClose, onSaved, onDeleted,
}: {
  rota: Rota;
  workspaceId: string;
  onClose: () => void;
  onSaved: () => void;
  onDeleted: () => void;
}) {
  const [name, setName] = useState(rota.name);
  const [rotaType, setRotaType] = useState<string>(rota.rota_type);
  const [startTime, setStartTime] = useState(rota.start_time?.slice(0, 5) || '09:00');
  const [endTime, setEndTime] = useState(rota.end_time?.slice(0, 5) || '17:00');
  const [includeWeekends, setIncludeWeekends] = useState(rota.include_weekends);
  const [colour, setColour] = useState(rota.colour);
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await rotasApi.update(workspaceId, rota.id, {
        name,
        rota_type: rotaType as Rota['rota_type'],
        start_time: rotaType === 'weekday' ? startTime : null,
        end_time: rotaType === 'weekday' ? endTime : null,
        include_weekends: includeWeekends,
        colour,
      });
      onSaved();
      onClose();
    } catch (err) {
      console.error('Failed to update rota:', err);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    try {
      await rotasApi.delete(workspaceId, rota.id);
      onDeleted();
      onClose();
    } catch (err) {
      console.error('Failed to delete rota:', err);
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
          <h3 className="text-lg font-bold" style={{ color: 'var(--color-text)' }}>Edit Rota</h3>
          <button onClick={onClose} className="p-1 rounded hover:bg-[var(--color-grey-1)]" style={{ color: 'var(--color-text-secondary)' }}>
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1" style={{ color: 'var(--color-text-secondary)' }}>Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="w-full px-3 py-2 text-sm rounded-lg border"
              style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-surface)', color: 'var(--color-text)' }}
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2" style={{ color: 'var(--color-text-secondary)' }}>Type</label>
            <div className="grid grid-cols-3 gap-2">
              {Object.entries(ROTA_TYPE_LABELS).map(([key, info]) => {
                const Icon = ROTA_TYPE_ICONS[key];
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setRotaType(key)}
                    className={`p-3 rounded-lg border text-center transition-all ${
                      rotaType === key ? 'ring-2 ring-[var(--color-primary)]' : ''
                    }`}
                    style={{
                      borderColor: rotaType === key ? 'var(--color-primary)' : 'var(--color-border)',
                      backgroundColor: rotaType === key ? 'rgba(65,134,224,0.05)' : 'var(--color-surface)',
                    }}
                  >
                    <Icon size={20} className="mx-auto mb-1" style={{ color: rotaType === key ? 'var(--color-primary)' : 'var(--color-text-secondary)' }} />
                    <div className="text-xs font-medium" style={{ color: 'var(--color-text)' }}>{info.label}</div>
                  </button>
                );
              })}
            </div>
          </div>

          {rotaType === 'weekday' && (
            <div className="flex gap-3">
              <div className="flex-1">
                <label className="block text-sm font-medium mb-1" style={{ color: 'var(--color-text-secondary)' }}>Start Time</label>
                <input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} className="w-full px-3 py-2 text-sm rounded-lg border" style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-surface)', color: 'var(--color-text)' }} />
              </div>
              <div className="flex-1">
                <label className="block text-sm font-medium mb-1" style={{ color: 'var(--color-text-secondary)' }}>End Time</label>
                <input type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} className="w-full px-3 py-2 text-sm rounded-lg border" style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-surface)', color: 'var(--color-text)' }} />
              </div>
            </div>
          )}

          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={includeWeekends} onChange={(e) => setIncludeWeekends(e.target.checked)} className="rounded" />
            <span className="text-sm" style={{ color: 'var(--color-text)' }}>Include weekends</span>
          </label>

          <div>
            <label className="block text-sm font-medium mb-1" style={{ color: 'var(--color-text-secondary)' }}>Colour</label>
            <div className="flex items-center gap-2">
              <input type="color" value={colour} onChange={(e) => setColour(e.target.value)} className="w-8 h-8 rounded cursor-pointer" />
              <span className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>{colour}</span>
            </div>
          </div>

          <div className="flex items-center justify-between pt-2">
            {confirmDelete ? (
              <div className="flex items-center gap-2">
                <span className="text-xs" style={{ color: 'var(--color-danger)' }}>Delete this rota?</span>
                <button type="button" onClick={handleDelete} className="text-xs px-2 py-1 rounded bg-red-500 text-white">Yes</button>
                <button type="button" onClick={() => setConfirmDelete(false)} className="text-xs px-2 py-1 rounded" style={{ color: 'var(--color-text-secondary)' }}>No</button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setConfirmDelete(true)}
                className="flex items-center gap-1 text-xs px-2 py-1 rounded hover:bg-red-50"
                style={{ color: 'var(--color-danger)' }}
              >
                <Trash2 size={12} />
                Delete
              </button>
            )}
            <div className="flex gap-2">
              <button type="button" onClick={onClose} className="px-4 py-2 text-sm rounded-lg" style={{ color: 'var(--color-text-secondary)' }}>Cancel</button>
              <button
                type="submit"
                disabled={saving || !name.trim()}
                className="px-4 py-2 text-sm font-medium rounded-lg text-white disabled:opacity-50"
                style={{ background: 'linear-gradient(135deg, #8A00E5, #4D217A)' }}
              >
                {saving ? 'Saving...' : 'Save'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
