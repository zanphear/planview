import { useEffect, useState, useMemo } from 'react';
import {
  Shield, AlertTriangle, CheckCircle, Clock, Plus, Search, Filter,
  X, Edit2, Trash2,
} from 'lucide-react';
import { useWorkspaceStore } from '../stores/workspaceStore';
import { useLookupValues } from '../stores/lookupStore';
import { complianceApi } from '../api/compliance';
import { membersApi } from '../api/users';
import { LoadingSpinner } from '../components/shared/LoadingSpinner';
import { LookupSelect } from '../components/shared/LookupSelect';
import { StatusBadge } from '../components/shared/StatusBadge';
import { DonutChart } from '../components/charts/DonutChart';
import { COLOURS } from '../utils/colours';
import type { ComplianceItem } from '../api/compliance';
import type { User } from '../api/users';

type ItemType = 'certificate' | 'visa' | 'contract' | 'license' | 'training';
type StatusFilter = 'all' | 'valid' | 'expiring_soon' | 'expired' | 'not_applicable';

const ITEM_TYPES: Record<ItemType, { label: string; colour: string }> = {
  certificate: { label: 'Certificate', colour: '#6366f1' },
  visa: { label: 'Visa', colour: '#ec4899' },
  contract: { label: 'Contract', colour: '#f59e0b' },
  license: { label: 'Licence', colour: '#10b981' },
  training: { label: 'Training', colour: '#0ea5e9' },
};

const ALL_TYPES: ItemType[] = ['certificate', 'visa', 'contract', 'license', 'training'];

function getItemStatus(item: ComplianceItem): 'valid' | 'expiring_soon' | 'expired' | 'not_applicable' {
  if (!item.expiry_date) return 'not_applicable';
  const now = new Date();
  const expiry = new Date(item.expiry_date);
  if (expiry < now) return 'expired';
  const thirtyDays = new Date();
  thirtyDays.setDate(thirtyDays.getDate() + 30);
  if (expiry <= thirtyDays) return 'expiring_soon';
  return 'valid';
}

function TypeBadge({ type }: { type: string }) {
  const workspace = useWorkspaceStore((s) => s.currentWorkspace);
  const lookupValues = useLookupValues(workspace?.id, 'compliance_item_type');
  const lookup = lookupValues.find((v) => v.value === type);
  const colour = lookup?.colour || ITEM_TYPES[type as ItemType]?.colour || '#64748b';
  const label = lookup?.label || lookup?.value || ITEM_TYPES[type as ItemType]?.label || type;
  return (
    <span
      className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium text-white"
      style={{ backgroundColor: colour }}
    >
      {label}
    </span>
  );
}

export function CompliancePage() {
  const workspace = useWorkspaceStore((s) => s.currentWorkspace);
  const lookupValues = useLookupValues(workspace?.id, 'compliance_item_type');
  const [items, setItems] = useState<ComplianceItem[]>([]);
  const [members, setMembers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [showModal, setShowModal] = useState(false);
  const [editingItem, setEditingItem] = useState<ComplianceItem | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  const loadData = async () => {
    if (!workspace) return;
    setLoading(true);
    try {
      const [itemsRes, membersRes] = await Promise.all([
        complianceApi.list(workspace.id),
        membersApi.list(workspace.id),
      ]);
      setItems(itemsRes.data);
      setMembers(membersRes.data);
    } catch (err) {
      console.error('Failed to load compliance data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [workspace]);

  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        const holder = members.find((m) => m.id === item.user_id);
        const matchesTitle = item.title.toLowerCase().includes(q);
        const matchesHolder = holder?.name.toLowerCase().includes(q);
        const matchesRef = item.reference_number?.toLowerCase().includes(q);
        if (!matchesTitle && !matchesHolder && !matchesRef) return false;
      }
      if (typeFilter !== 'all' && item.item_type !== typeFilter) return false;
      if (statusFilter !== 'all' && getItemStatus(item) !== statusFilter) return false;
      return true;
    });
  }, [items, members, searchQuery, typeFilter, statusFilter]);

  const counts = useMemo(() => {
    let total = 0, expiringSoon = 0, expired = 0, valid = 0;
    for (const item of items) {
      total++;
      const s = getItemStatus(item);
      if (s === 'expiring_soon') expiringSoon++;
      else if (s === 'expired') expired++;
      else if (s === 'valid') valid++;
    }
    return { total, expiringSoon, expired, valid };
  }, [items]);

  const statusSegments = useMemo(() => [
    { label: 'Valid', value: counts.valid, colour: COLOURS.green },
    { label: 'Expiring Soon', value: counts.expiringSoon, colour: COLOURS.amber },
    { label: 'Expired', value: counts.expired, colour: COLOURS.red },
  ], [counts]);

  const handleDelete = async (itemId: string) => {
    if (!workspace) return;
    try {
      await complianceApi.delete(workspace.id, itemId);
      setDeleteConfirm(null);
      loadData();
    } catch (err) {
      console.error('Failed to delete compliance item:', err);
    }
  };

  const getMemberName = (userId: string) => {
    return members.find((m) => m.id === userId)?.name || 'Unknown';
  };

  if (loading) return <LoadingSpinner />;

  return (
    <div className="p-4 sm:p-6 h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <Shield size={22} style={{ color: 'var(--color-primary)' }} />
          <h2 className="text-xl font-bold" style={{ color: 'var(--color-text)' }}>
            Compliance Tracking
          </h2>
        </div>
        <button
          onClick={() => { setEditingItem(null); setShowModal(true); }}
          className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-lg text-white transition-colors"
          style={{ background: 'linear-gradient(135deg, #8A00E5, #4D217A)' }}
        >
          <Plus size={14} />
          Add Item
        </button>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 mb-4">
        <SummaryCard label="Total Items" count={counts.total} colour="#3b82f6" icon={<Shield size={18} />} />
        <SummaryCard label="Expiring Soon" count={counts.expiringSoon} colour="#f59e0b" icon={<Clock size={18} />} />
        <SummaryCard label="Expired" count={counts.expired} colour="#ef4444" icon={<AlertTriangle size={18} />} />
        <SummaryCard label="Valid" count={counts.valid} colour="#10b981" icon={<CheckCircle size={18} />} />
        <div className="rounded-xl border p-5" style={{ backgroundColor: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
          <h3 className="text-sm font-semibold mb-4" style={{ color: 'var(--color-text)' }}>Status Distribution</h3>
          <DonutChart segments={statusSegments} size={120} centerValue={items.length} centerLabel="items" />
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 mb-4 flex-wrap">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--color-text-secondary)' }} />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by title, person or reference..."
            className="w-full pl-9 pr-3 py-1.5 text-sm rounded-lg border"
            style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-surface)', color: 'var(--color-text)' }}
          />
        </div>
        <div className="flex items-center gap-1.5 flex-wrap">
          <Filter size={14} style={{ color: 'var(--color-text-secondary)' }} />
          <button
            onClick={() => setTypeFilter('all')}
            className="px-2.5 py-1 text-xs font-medium rounded-full border transition-colors"
            style={{
              borderColor: typeFilter === 'all' ? 'var(--color-primary)' : 'var(--color-border)',
              backgroundColor: typeFilter === 'all' ? 'var(--color-primary)' : 'transparent',
              color: typeFilter === 'all' ? '#fff' : 'var(--color-text-secondary)',
            }}
          >
            All Types
          </button>
          {(lookupValues.length > 0 ? lookupValues : ALL_TYPES.map((t) => ({ value: t, label: ITEM_TYPES[t].label, colour: ITEM_TYPES[t].colour }))).map((lv) => {
            const val = typeof lv === 'object' && 'value' in lv ? lv.value : lv;
            const label = typeof lv === 'object' && 'label' in lv ? (lv.label || lv.value) : val;
            const colour = typeof lv === 'object' && 'colour' in lv ? (lv.colour || '#64748b') : '#64748b';
            const isActive = typeFilter === val;
            return (
              <button
                key={val}
                onClick={() => setTypeFilter(isActive ? 'all' : val)}
                className="px-2.5 py-1 text-xs font-medium rounded-full border transition-colors"
                style={{
                  borderColor: isActive ? colour : 'var(--color-border)',
                  backgroundColor: isActive ? colour : 'transparent',
                  color: isActive ? '#fff' : colour,
                }}
              >
                {label}
              </button>
            );
          })}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
            className="text-sm px-2 py-1.5 rounded-lg border"
            style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-surface)', color: 'var(--color-text)' }}
          >
            <option value="all">All Statuses</option>
            <option value="valid">Valid</option>
            <option value="expiring_soon">Expiring Soon</option>
            <option value="expired">Expired</option>
            <option value="not_applicable">N/A</option>
          </select>
        </div>
      </div>

      {/* Items */}
      {filteredItems.length === 0 ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <Shield size={48} className="mx-auto mb-3 opacity-30" style={{ color: 'var(--color-text-secondary)' }} />
            <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
              {items.length === 0
                ? 'No compliance items yet. Add one to get started.'
                : 'No items match your filters.'}
            </p>
          </div>
        </div>
      ) : (
        <div className="flex-1 overflow-auto">
          {/* Desktop table */}
          <div className="hidden md:block rounded-xl border overflow-hidden" style={{ borderColor: 'var(--color-border)' }}>
            <table className="w-full text-sm">
              <thead>
                <tr style={{ backgroundColor: 'var(--color-grey-1)' }}>
                  <th className="text-left px-4 py-2.5 font-medium" style={{ color: 'var(--color-text-secondary)' }}>Type</th>
                  <th className="text-left px-4 py-2.5 font-medium" style={{ color: 'var(--color-text-secondary)' }}>Title</th>
                  <th className="text-left px-4 py-2.5 font-medium" style={{ color: 'var(--color-text-secondary)' }}>Person</th>
                  <th className="text-left px-4 py-2.5 font-medium" style={{ color: 'var(--color-text-secondary)' }}>Reference</th>
                  <th className="text-left px-4 py-2.5 font-medium" style={{ color: 'var(--color-text-secondary)' }}>Expiry Date</th>
                  <th className="text-left px-4 py-2.5 font-medium" style={{ color: 'var(--color-text-secondary)' }}>Status</th>
                  <th className="text-right px-4 py-2.5 font-medium" style={{ color: 'var(--color-text-secondary)' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredItems.map((item) => {
                  const status = getItemStatus(item);
                  const rowBg = status === 'expired'
                    ? 'rgba(239,68,68,0.04)'
                    : status === 'expiring_soon'
                      ? 'rgba(245,158,11,0.04)'
                      : undefined;
                  return (
                    <tr
                      key={item.id}
                      className="border-t"
                      style={{ borderColor: 'var(--color-border)', backgroundColor: rowBg }}
                    >
                      <td className="px-4 py-2.5"><TypeBadge type={item.item_type} /></td>
                      <td className="px-4 py-2.5 font-medium" style={{ color: 'var(--color-text)' }}>{item.title}</td>
                      <td className="px-4 py-2.5" style={{ color: 'var(--color-text)' }}>{getMemberName(item.user_id)}</td>
                      <td className="px-4 py-2.5" style={{ color: 'var(--color-text-secondary)' }}>{item.reference_number || '-'}</td>
                      <td className="px-4 py-2.5" style={{ color: 'var(--color-text)' }}>
                        {item.expiry_date ? new Date(item.expiry_date).toLocaleDateString('en-GB') : '-'}
                      </td>
                      <td className="px-4 py-2.5"><StatusBadge status={status} /></td>
                      <td className="px-4 py-2.5 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => { setEditingItem(item); setShowModal(true); }}
                            className="p-1.5 rounded-lg hover:bg-subtle transition-colors"
                            style={{ color: 'var(--color-text-secondary)' }}
                            title="Edit"
                          >
                            <Edit2 size={14} />
                          </button>
                          {deleteConfirm === item.id ? (
                            <div className="flex items-center gap-1">
                              <button
                                onClick={() => handleDelete(item.id)}
                                className="text-xs px-2 py-1 rounded bg-red-500 text-white"
                              >
                                Yes
                              </button>
                              <button
                                onClick={() => setDeleteConfirm(null)}
                                className="text-xs px-2 py-1 rounded"
                                style={{ color: 'var(--color-text-secondary)' }}
                              >
                                No
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => setDeleteConfirm(item.id)}
                              className="p-1.5 rounded-lg hover:bg-red-50 transition-colors"
                              style={{ color: 'var(--color-danger, #ef4444)' }}
                              title="Delete"
                            >
                              <Trash2 size={14} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Mobile cards */}
          <div className="md:hidden space-y-3">
            {filteredItems.map((item) => {
              const status = getItemStatus(item);
              const cardBorder = status === 'expired'
                ? '#ef4444'
                : status === 'expiring_soon'
                  ? '#f59e0b'
                  : 'var(--color-border)';
              return (
                <div
                  key={item.id}
                  className="rounded-xl border p-4"
                  style={{ borderColor: cardBorder, backgroundColor: 'var(--color-surface)' }}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <TypeBadge type={item.item_type} />
                      <StatusBadge status={status} />
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => { setEditingItem(item); setShowModal(true); }}
                        className="p-1 rounded hover:bg-subtle"
                        style={{ color: 'var(--color-text-secondary)' }}
                      >
                        <Edit2 size={14} />
                      </button>
                      {deleteConfirm === item.id ? (
                        <div className="flex items-center gap-1">
                          <button onClick={() => handleDelete(item.id)} className="text-xs px-2 py-0.5 rounded bg-red-500 text-white">Yes</button>
                          <button onClick={() => setDeleteConfirm(null)} className="text-xs px-2 py-0.5 rounded" style={{ color: 'var(--color-text-secondary)' }}>No</button>
                        </div>
                      ) : (
                        <button
                          onClick={() => setDeleteConfirm(item.id)}
                          className="p-1 rounded hover:bg-red-50"
                          style={{ color: 'var(--color-danger, #ef4444)' }}
                        >
                          <Trash2 size={14} />
                        </button>
                      )}
                    </div>
                  </div>
                  <h3 className="font-medium text-sm mb-1" style={{ color: 'var(--color-text)' }}>{item.title}</h3>
                  <div className="text-xs space-y-0.5" style={{ color: 'var(--color-text-secondary)' }}>
                    <p>{getMemberName(item.user_id)}</p>
                    {item.reference_number && <p>Ref: {item.reference_number}</p>}
                    <p>Expires: {item.expiry_date ? new Date(item.expiry_date).toLocaleDateString('en-GB') : 'N/A'}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Create / Edit Modal */}
      {showModal && workspace && (
        <ComplianceModal
          item={editingItem}
          members={members}
          workspaceId={workspace.id}
          onClose={() => { setShowModal(false); setEditingItem(null); }}
          onSaved={loadData}
        />
      )}
    </div>
  );
}


// --- Summary Card ---

function SummaryCard({ label, count, colour, icon }: {
  label: string;
  count: number;
  colour: string;
  icon: React.ReactNode;
}) {
  return (
    <div
      className="rounded-xl border p-4 flex items-center gap-3"
      style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-surface)' }}
    >
      <div
        className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0"
        style={{ backgroundColor: colour + '15', color: colour }}
      >
        {icon}
      </div>
      <div>
        <div className="text-2xl font-bold" style={{ color: 'var(--color-text)' }}>{count}</div>
        <div className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>{label}</div>
      </div>
    </div>
  );
}


// --- Create / Edit Modal ---

function ComplianceModal({
  item, members, workspaceId, onClose, onSaved,
}: {
  item: ComplianceItem | null;
  members: User[];
  workspaceId: string;
  onClose: () => void;
  onSaved: () => void;
}) {
  const isEdit = !!item;
  const [userId, setUserId] = useState(item?.user_id || '');
  const [itemType, setItemType] = useState<string>(item?.item_type || 'certificate');
  const [title, setTitle] = useState(item?.title || '');
  const [referenceNumber, setReferenceNumber] = useState(item?.reference_number || '');
  const [issueDate, setIssueDate] = useState(item?.issue_date?.slice(0, 10) || '');
  const [expiryDate, setExpiryDate] = useState(item?.expiry_date?.slice(0, 10) || '');
  const [notes, setNotes] = useState(item?.notes || '');
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userId || !title.trim()) return;
    setSaving(true);
    try {
      const payload: Partial<ComplianceItem> = {
        user_id: userId,
        item_type: itemType,
        title: title.trim(),
        reference_number: referenceNumber.trim() || null,
        issue_date: issueDate || null,
        expiry_date: expiryDate || null,
        notes: notes.trim() || null,
      };
      if (isEdit && item) {
        await complianceApi.update(workspaceId, item.id, payload);
      } else {
        await complianceApi.create(workspaceId, payload);
      }
      onSaved();
      onClose();
    } catch (err) {
      console.error('Failed to save compliance item:', err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={onClose}>
      <div
        className="w-full max-w-lg rounded-xl shadow-2xl p-6 max-h-[90vh] overflow-y-auto"
        style={{ backgroundColor: 'var(--color-surface)' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold" style={{ color: 'var(--color-text)' }}>
            {isEdit ? 'Edit Compliance Item' : 'Add Compliance Item'}
          </h3>
          <button onClick={onClose} className="p-1 rounded hover:bg-subtle" style={{ color: 'var(--color-text-secondary)' }}>
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1" style={{ color: 'var(--color-text-secondary)' }}>Person</label>
            <select
              value={userId}
              onChange={(e) => setUserId(e.target.value)}
              required
              className="w-full px-3 py-2 text-sm rounded-lg border"
              style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-surface)', color: 'var(--color-text)' }}
            >
              <option value="">Select a member...</option>
              {members.map((m) => (
                <option key={m.id} value={m.id}>{m.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1" style={{ color: 'var(--color-text-secondary)' }}>Type</label>
            <LookupSelect
              category="compliance_item_type"
              value={itemType}
              onChange={(v) => setItemType(v)}
              placeholder="Select item type..."
              className="w-full px-3 py-2 text-sm rounded-lg border"
              style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-surface)', color: 'var(--color-text)' }}
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1" style={{ color: 'var(--color-text-secondary)' }}>Title</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              placeholder="e.g. NEBOSH General Certificate"
              className="w-full px-3 py-2 text-sm rounded-lg border"
              style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-surface)', color: 'var(--color-text)' }}
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1" style={{ color: 'var(--color-text-secondary)' }}>Reference Number</label>
            <input
              type="text"
              value={referenceNumber}
              onChange={(e) => setReferenceNumber(e.target.value)}
              placeholder="Optional"
              className="w-full px-3 py-2 text-sm rounded-lg border"
              style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-surface)', color: 'var(--color-text)' }}
            />
          </div>

          <div className="flex gap-3">
            <div className="flex-1">
              <label className="block text-sm font-medium mb-1" style={{ color: 'var(--color-text-secondary)' }}>Issue Date</label>
              <input
                type="date"
                value={issueDate}
                onChange={(e) => setIssueDate(e.target.value)}
                className="w-full px-3 py-2 text-sm rounded-lg border"
                style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-surface)', color: 'var(--color-text)' }}
              />
            </div>
            <div className="flex-1">
              <label className="block text-sm font-medium mb-1" style={{ color: 'var(--color-text-secondary)' }}>Expiry Date</label>
              <input
                type="date"
                value={expiryDate}
                onChange={(e) => setExpiryDate(e.target.value)}
                className="w-full px-3 py-2 text-sm rounded-lg border"
                style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-surface)', color: 'var(--color-text)' }}
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1" style={{ color: 'var(--color-text-secondary)' }}>Notes</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Optional notes..."
              rows={3}
              className="w-full px-3 py-2 text-sm rounded-lg border resize-none"
              style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-surface)', color: 'var(--color-text)' }}
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
              disabled={saving || !userId || !title.trim()}
              className="px-4 py-2 text-sm font-medium rounded-lg text-white disabled:opacity-50"
              style={{ background: 'linear-gradient(135deg, #8A00E5, #4D217A)' }}
            >
              {saving ? 'Saving...' : isEdit ? 'Save Changes' : 'Add Item'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
