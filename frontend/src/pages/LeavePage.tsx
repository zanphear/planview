import { useEffect, useState, useMemo } from 'react';
import {
  Calendar,
  Plus,
  Check,
  X,
  Clock,
  CheckCircle,
  AlertTriangle,
  RefreshCw,
} from 'lucide-react';
import { useWorkspaceStore } from '../stores/workspaceStore';
import { useAuthStore } from '../stores/authStore';
import { useLookupValues } from '../stores/lookupStore';
import { LoadingSpinner } from '../components/shared/LoadingSpinner';
import { Toast } from '../components/shared/Toast';
import { LookupSelect } from '../components/shared/LookupSelect';
import { StatCard } from '../components/shared/StatCard';
import { DonutChart } from '../components/charts/DonutChart';
import { COLOURS } from '../utils/colours';
import {
  useLeaveRequests,
  useLeaveAllowances,
  useLeaveMembers,
  useCreateLeaveRequest,
  useUpdateLeaveRequest,
  useCreateLeaveAllowance,
} from '../api/queries/leave';
import type { User } from '../api/users';

type Tab = 'requests' | 'allowances';
type LeaveType = 'annual' | 'sick' | 'compassionate' | 'unpaid' | 'other';

const LEAVE_TYPE_LABELS: Record<LeaveType, { label: string; colour: string }> = {
  annual: { label: 'Annual', colour: '#22c55e' },
  sick: { label: 'Sick', colour: '#ef4444' },
  compassionate: { label: 'Compassionate', colour: '#8b5cf6' },
  unpaid: { label: 'Unpaid', colour: '#6b7280' },
  other: { label: 'Other', colour: '#f59e0b' },
};

const STATUS_STYLES: Record<string, { bg: string; text: string; label: string }> = {
  pending: { bg: '#fef3c7', text: '#92400e', label: 'Pending' },
  approved: { bg: '#dcfce7', text: '#166534', label: 'Approved' },
  rejected: { bg: '#fee2e2', text: '#991b1b', label: 'Rejected' },
  cancelled: { bg: '#f3f4f6', text: '#6b7280', label: 'Cancelled' },
};

export function LeavePage() {
  const workspace = useWorkspaceStore((s) => s.currentWorkspace);
  const user = useAuthStore((s) => s.user);

  // ── Client/UI state stays local ──────────────────────────────────────────────
  const [activeTab, setActiveTab] = useState<Tab>('requests');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [userFilter, setUserFilter] = useState<string>('');
  const [allowanceYear, setAllowanceYear] = useState(new Date().getFullYear());
  const [showRequestModal, setShowRequestModal] = useState(false);
  const [showAllowanceModal, setShowAllowanceModal] = useState(false);

  // ── Server state: TanStack Query (ADR 0003) ──────────────────────────────────
  const requestsQuery = useLeaveRequests(workspace?.id, {
    ...(statusFilter ? { status: statusFilter } : {}),
    ...(userFilter ? { user_id: userFilter } : {}),
  });
  const allowancesQuery = useLeaveAllowances(workspace?.id, { year: allowanceYear });
  const membersQuery = useLeaveMembers(workspace?.id);

  const requests = requestsQuery.data ?? [];
  const allowances = allowancesQuery.data ?? [];
  const members = membersQuery.data ?? [];

  const updateRequest = useUpdateLeaveRequest(workspace?.id);

  const isManager = user?.role === 'owner' || user?.role === 'admin';

  const lookupValues = useLookupValues(workspace?.id, 'leave_type');

  const totalRequests = requests.length;
  const pendingCount = requests.filter((r) => r.status === 'pending').length;
  const daysUsed = useMemo(
    () => requests.filter((r) => r.status === 'approved').reduce((sum, r) => sum + r.days, 0),
    [requests],
  );
  const daysRemaining = useMemo(
    () => allowances.reduce((sum, a) => sum + a.remaining, 0),
    [allowances],
  );

  const COLOUR_CYCLE = [
    COLOURS.green,
    COLOURS.blue,
    COLOURS.purple,
    COLOURS.amber,
    COLOURS.red,
    COLOURS.teal,
    COLOURS.pink,
    COLOURS.indigo,
    COLOURS.cyan,
    COLOURS.slate,
  ];

  const getLeaveTypeColour = (type: string): string => {
    const lookup = lookupValues.find((v) => v.value === type);
    if (lookup?.colour) return lookup.colour;
    const fallback = LEAVE_TYPE_LABELS[type as LeaveType];
    if (fallback) return fallback.colour;
    const idx = Object.keys(leaveTypeGroups).indexOf(type);
    return COLOUR_CYCLE[idx % COLOUR_CYCLE.length];
  };

  const leaveTypeGroups = useMemo(() => {
    const groups: Record<string, number> = {};
    for (const r of requests) {
      groups[r.leave_type] = (groups[r.leave_type] || 0) + 1;
    }
    return groups;
  }, [requests]);

  const leaveTypeSegments = useMemo(() => {
    return Object.entries(leaveTypeGroups).map(([type, count]) => {
      const lookup = lookupValues.find((v) => v.value === type);
      const label = lookup?.label || LEAVE_TYPE_LABELS[type as LeaveType]?.label || type;
      return { label, value: count, colour: getLeaveTypeColour(type) };
    });
  }, [leaveTypeGroups, lookupValues]);

  const handleApprove = async (requestId: string) => {
    try {
      await updateRequest.mutateAsync({ requestId, data: { status: 'approved' } });
    } catch (err) {
      console.error('Failed to approve request:', err);
      Toast.show('Failed to approve request');
    }
  };

  const handleReject = async (requestId: string) => {
    try {
      await updateRequest.mutateAsync({ requestId, data: { status: 'rejected' } });
    } catch (err) {
      console.error('Failed to reject request:', err);
      Toast.show('Failed to reject request');
    }
  };

  const getMemberName = (userId: string) => {
    const member = members.find((m) => m.id === userId);
    return member?.name || 'Unknown';
  };

  const getMember = (userId: string) => {
    return members.find((m) => m.id === userId);
  };

  const filteredRequests = requests;

  // ── Reusable error-with-retry block for the four-state renders ───────────────
  const renderError = (label: string, error: unknown, isFetching: boolean, retry: () => void) => (
    <div className="flex-1 flex flex-col items-center justify-center text-center px-6">
      <AlertTriangle size={48} className="mb-4" style={{ color: 'var(--color-danger)' }} />
      <h3 className="text-base font-semibold mb-1" style={{ color: 'var(--color-text)' }}>
        {label}
      </h3>
      <p className="text-sm max-w-xs mb-4" style={{ color: 'var(--color-text-secondary)' }}>
        {error instanceof Error ? error.message : 'Something went wrong fetching this data.'}
      </p>
      <button
        onClick={retry}
        disabled={isFetching}
        className="flex items-center gap-2 px-4 py-2 text-white rounded-lg text-sm font-medium disabled:opacity-50"
        style={{ backgroundColor: 'var(--color-primary)' }}
      >
        <RefreshCw size={14} className={isFetching ? 'animate-spin' : ''} />
        Retry
      </button>
    </div>
  );

  // Requests tab content: pending / error / empty-with-CTA / success.
  const renderRequests = () => {
    if (requestsQuery.isPending || membersQuery.isPending) {
      return (
        <div className="flex-1 flex items-center justify-center">
          <LoadingSpinner />
        </div>
      );
    }
    if (requestsQuery.isError) {
      return renderError(
        "Couldn't load leave requests",
        requestsQuery.error,
        requestsQuery.isFetching,
        () => requestsQuery.refetch(),
      );
    }
    if (filteredRequests.length === 0) {
      return (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <Calendar
              size={48}
              className="mx-auto mb-3 opacity-30"
              style={{ color: 'var(--color-text-secondary)' }}
            />
            <p className="text-sm mb-4" style={{ color: 'var(--color-text-secondary)' }}>
              No leave requests found.
            </p>
            <button
              onClick={() => setShowRequestModal(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-lg text-white transition-colors"
              style={{ background: 'linear-gradient(135deg, #8A00E5, #4D217A)' }}
            >
              <Plus size={14} />
              Request Leave
            </button>
          </div>
        </div>
      );
    }
    return (
      <div className="flex-1 overflow-auto space-y-2">
        {filteredRequests.map((req) => {
          const member = getMember(req.user_id);
          const lookupMatch = lookupValues.find((v) => v.value === req.leave_type);
          const fallback = LEAVE_TYPE_LABELS[req.leave_type as LeaveType] || {
            label: req.leave_type,
            colour: '#6b7280',
          };
          const leaveType = {
            label: lookupMatch?.label || fallback.label,
            colour: lookupMatch?.colour || fallback.colour,
          };
          const status = STATUS_STYLES[req.status] || STATUS_STYLES.pending;
          const isPending = req.status === 'pending';

          return (
            <div
              key={req.id}
              className="rounded-lg border p-4 flex items-center gap-4 flex-wrap"
              style={{
                borderColor: isPending ? '#f59e0b' : 'var(--color-border)',
                borderWidth: isPending ? '1.5px' : '1px',
                borderLeftWidth: '4px',
                borderLeftColor: leaveType.colour,
                backgroundColor: 'var(--color-surface)',
              }}
            >
              {/* User avatar + name */}
              <div className="flex items-center gap-2 min-w-[140px]">
                <div
                  className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0"
                  style={{ backgroundColor: member?.colour || '#999' }}
                >
                  {member?.initials || member?.name?.charAt(0) || '?'}
                </div>
                <span
                  className="text-sm font-medium truncate"
                  style={{ color: 'var(--color-text)' }}
                >
                  {getMemberName(req.user_id)}
                </span>
              </div>

              {/* Leave type pill */}
              <span
                className="text-xs font-medium px-2 py-0.5 rounded-full"
                style={{ backgroundColor: leaveType.colour + '20', color: leaveType.colour }}
              >
                {leaveType.label}
              </span>

              {/* Date range */}
              <div
                className="flex items-center gap-1.5 text-sm"
                style={{ color: 'var(--color-text-secondary)' }}
              >
                <Calendar size={14} />
                <span>
                  {req.start_date}, {req.end_date}
                </span>
              </div>

              {/* Days count */}
              <div
                className="flex items-center gap-1 text-sm"
                style={{ color: 'var(--color-text-secondary)' }}
              >
                <Clock size={14} />
                <span>
                  {req.days} day{req.days !== 1 ? 's' : ''}
                </span>
              </div>

              {/* Notes */}
              {req.notes && (
                <span
                  className="text-xs italic truncate max-w-[200px]"
                  style={{ color: 'var(--color-text-secondary)' }}
                >
                  {req.notes}
                </span>
              )}

              <div className="flex-1" />

              {/* Status badge */}
              <span
                className="text-xs font-medium px-2 py-0.5 rounded-full"
                style={{ backgroundColor: status.bg, color: status.text }}
              >
                {status.label}
              </span>

              {/* Approve / Reject buttons */}
              {isPending && isManager && (
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => handleApprove(req.id)}
                    disabled={updateRequest.isPending}
                    className="p-1.5 rounded-lg hover:bg-green-50 transition-colors disabled:opacity-50"
                    style={{ color: '#16a34a' }}
                    title="Approve"
                  >
                    <Check size={18} />
                  </button>
                  <button
                    onClick={() => handleReject(req.id)}
                    disabled={updateRequest.isPending}
                    className="p-1.5 rounded-lg hover:bg-red-50 transition-colors disabled:opacity-50"
                    style={{ color: '#dc2626' }}
                    title="Reject"
                  >
                    <X size={18} />
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    );
  };

  // Allowances tab content: pending / error / empty-with-CTA / success.
  const renderAllowances = () => {
    if (allowancesQuery.isPending || membersQuery.isPending) {
      return (
        <div className="flex-1 flex items-center justify-center">
          <LoadingSpinner />
        </div>
      );
    }
    if (allowancesQuery.isError) {
      return renderError(
        "Couldn't load allowances",
        allowancesQuery.error,
        allowancesQuery.isFetching,
        () => allowancesQuery.refetch(),
      );
    }
    if (allowances.length === 0) {
      return (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <Calendar
              size={48}
              className="mx-auto mb-3 opacity-30"
              style={{ color: 'var(--color-text-secondary)' }}
            />
            <p className="text-sm mb-4" style={{ color: 'var(--color-text-secondary)' }}>
              No allowances configured for {allowanceYear}.
            </p>
            {isManager && (
              <button
                onClick={() => setShowAllowanceModal(true)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-lg text-white transition-colors"
                style={{ background: 'linear-gradient(135deg, #8A00E5, #4D217A)' }}
              >
                <Plus size={14} />
                Set Allowance
              </button>
            )}
          </div>
        </div>
      );
    }
    return (
      <div className="flex-1 overflow-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b" style={{ borderColor: 'var(--color-border)' }}>
              <th
                className="text-left px-3 py-2 font-medium"
                style={{ color: 'var(--color-text-secondary)' }}
              >
                Person
              </th>
              <th
                className="text-right px-3 py-2 font-medium"
                style={{ color: 'var(--color-text-secondary)' }}
              >
                Entitlement
              </th>
              <th
                className="text-right px-3 py-2 font-medium"
                style={{ color: 'var(--color-text-secondary)' }}
              >
                Carried Forward
              </th>
              <th
                className="text-right px-3 py-2 font-medium"
                style={{ color: 'var(--color-text-secondary)' }}
              >
                Used
              </th>
              <th
                className="text-right px-3 py-2 font-medium"
                style={{ color: 'var(--color-text-secondary)' }}
              >
                Booked
              </th>
              <th
                className="text-right px-3 py-2 font-medium"
                style={{ color: 'var(--color-text-secondary)' }}
              >
                Remaining
              </th>
            </tr>
          </thead>
          <tbody>
            {allowances.map((a) => {
              const member = getMember(a.user_id);
              const remainingColour =
                a.remaining <= 0 ? '#dc2626' : a.remaining <= 5 ? '#f59e0b' : '#16a34a';

              return (
                <tr
                  key={a.id}
                  className="border-b last:border-b-0"
                  style={{ borderColor: 'var(--color-border)' }}
                >
                  <td className="px-3 py-2.5">
                    <div className="flex items-center gap-2">
                      <div
                        className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold text-white shrink-0"
                        style={{ backgroundColor: member?.colour || '#999' }}
                      >
                        {member?.initials || member?.name?.charAt(0) || '?'}
                      </div>
                      <span style={{ color: 'var(--color-text)' }}>{getMemberName(a.user_id)}</span>
                    </div>
                  </td>
                  <td className="text-right px-3 py-2.5" style={{ color: 'var(--color-text)' }}>
                    {a.entitlement_days}
                  </td>
                  <td className="text-right px-3 py-2.5" style={{ color: 'var(--color-text)' }}>
                    {a.carried_forward}
                  </td>
                  <td className="text-right px-3 py-2.5" style={{ color: 'var(--color-text)' }}>
                    {a.used_days}
                  </td>
                  <td className="text-right px-3 py-2.5" style={{ color: 'var(--color-text)' }}>
                    {a.booked_days}
                  </td>
                  <td
                    className="text-right px-3 py-2.5 font-semibold"
                    style={{ color: remainingColour }}
                  >
                    {a.remaining}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    );
  };

  return (
    <div className="p-4 sm:p-6 h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <div className="flex items-center gap-4">
          <h2 className="text-xl font-bold" style={{ color: 'var(--color-text)' }}>
            Leave Management
          </h2>
          <div className="flex rounded-lg border" style={{ borderColor: 'var(--color-border)' }}>
            <button
              onClick={() => setActiveTab('requests')}
              className="px-3 py-1.5 text-sm font-medium rounded-l-lg transition-colors"
              style={{
                backgroundColor:
                  activeTab === 'requests' ? 'var(--color-primary)' : 'var(--color-surface)',
                color: activeTab === 'requests' ? '#fff' : 'var(--color-text-secondary)',
              }}
            >
              Requests
            </button>
            <button
              onClick={() => setActiveTab('allowances')}
              className="px-3 py-1.5 text-sm font-medium rounded-r-lg transition-colors"
              style={{
                backgroundColor:
                  activeTab === 'allowances' ? 'var(--color-primary)' : 'var(--color-surface)',
                color: activeTab === 'allowances' ? '#fff' : 'var(--color-text-secondary)',
              }}
            >
              Allowances
            </button>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {activeTab === 'requests' && (
            <button
              onClick={() => setShowRequestModal(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-lg text-white transition-colors"
              style={{ background: 'linear-gradient(135deg, #8A00E5, #4D217A)' }}
            >
              <Plus size={14} />
              Request Leave
            </button>
          )}
          {activeTab === 'allowances' && isManager && (
            <button
              onClick={() => setShowAllowanceModal(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-lg text-white transition-colors"
              style={{ background: 'linear-gradient(135deg, #8A00E5, #4D217A)' }}
            >
              <Plus size={14} />
              Set Allowance
            </button>
          )}
        </div>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard
          label="Total Requests"
          value={totalRequests}
          icon={<Calendar size={20} />}
          colour={COLOURS.blue}
        />
        <StatCard
          label="Pending Approvals"
          value={pendingCount}
          icon={<Clock size={20} />}
          colour={COLOURS.amber}
        />
        <StatCard
          label="Days Used"
          value={daysUsed}
          icon={<CheckCircle size={20} />}
          colour={COLOURS.green}
        />
        <StatCard
          label="Days Remaining"
          value={daysRemaining}
          icon={<AlertTriangle size={20} />}
          colour={COLOURS.teal}
        />
      </div>

      {/* Leave by Type Chart */}
      {requests.length > 0 && (
        <div
          className="rounded-xl border p-5 mb-6"
          style={{ backgroundColor: 'var(--color-surface)', borderColor: 'var(--color-border)' }}
        >
          <h3 className="text-sm font-semibold mb-4" style={{ color: 'var(--color-text)' }}>
            Leave by Type
          </h3>
          <DonutChart
            segments={leaveTypeSegments}
            size={120}
            centerValue={requests.length}
            centerLabel="requests"
          />
        </div>
      )}

      {/* Requests Tab */}
      {activeTab === 'requests' && (
        <>
          {/* Filters */}
          <div className="flex items-center gap-3 mb-4">
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
              <option value="">All Statuses</option>
              <option value="pending">Pending</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
              <option value="cancelled">Cancelled</option>
            </select>
            <select
              value={userFilter}
              onChange={(e) => setUserFilter(e.target.value)}
              className="text-sm px-2 py-1.5 rounded-lg border"
              style={{
                borderColor: 'var(--color-border)',
                backgroundColor: 'var(--color-surface)',
                color: 'var(--color-text)',
              }}
            >
              <option value="">All People</option>
              {members.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name}
                </option>
              ))}
            </select>
          </div>

          {/* Request List (four states: pending / error / empty / success) */}
          {renderRequests()}
        </>
      )}

      {/* Allowances Tab */}
      {activeTab === 'allowances' && (
        <>
          {/* Year selector */}
          <div className="flex items-center gap-3 mb-4">
            <select
              value={allowanceYear}
              onChange={(e) => setAllowanceYear(Number(e.target.value))}
              className="text-sm px-2 py-1.5 rounded-lg border"
              style={{
                borderColor: 'var(--color-border)',
                backgroundColor: 'var(--color-surface)',
                color: 'var(--color-text)',
              }}
            >
              {[allowanceYear - 1, allowanceYear, allowanceYear + 1].map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
          </div>

          {/* Allowances table (four states: pending / error / empty / success) */}
          {renderAllowances()}
        </>
      )}

      {/* Create Request Modal */}
      {showRequestModal && workspace && (
        <CreateRequestModal
          workspaceId={workspace.id}
          onClose={() => setShowRequestModal(false)}
          onCreated={() => setShowRequestModal(false)}
        />
      )}

      {/* Create Allowance Modal */}
      {showAllowanceModal && workspace && (
        <CreateAllowanceModal
          workspaceId={workspace.id}
          members={members}
          year={allowanceYear}
          onClose={() => setShowAllowanceModal(false)}
          onCreated={() => setShowAllowanceModal(false)}
        />
      )}
    </div>
  );
}

// --- Create Request Modal ---

function CreateRequestModal({
  workspaceId,
  onClose,
  onCreated,
}: {
  workspaceId: string;
  onClose: () => void;
  onCreated: () => void;
}) {
  const [leaveType, setLeaveType] = useState<LeaveType>('annual');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [days, setDays] = useState<number>(1);
  const [notes, setNotes] = useState('');
  const createRequest = useCreateLeaveRequest(workspaceId);
  const saving = createRequest.isPending;

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await createRequest.mutateAsync({
        leave_type: leaveType,
        start_date: startDate,
        end_date: endDate,
        days,
        notes: notes || undefined,
      });
      onCreated();
    } catch (err) {
      console.error('Failed to create leave request:', err);
      Toast.show('Failed to create leave request');
    }
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
          <h3 className="text-lg font-bold" style={{ color: 'var(--color-text)' }}>
            Request Leave
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
              Leave Type
            </label>
            <LookupSelect
              category="leave_type"
              value={leaveType}
              onChange={(v) => setLeaveType(v as LeaveType)}
              placeholder="Select leave type..."
              className="w-full px-3 py-2 text-sm rounded-lg border"
              style={{
                borderColor: 'var(--color-border)',
                backgroundColor: 'var(--color-surface)',
                color: 'var(--color-text)',
              }}
            />
          </div>

          <div className="flex gap-3">
            <div className="flex-1">
              <label
                className="block text-sm font-medium mb-1"
                style={{ color: 'var(--color-text-secondary)' }}
              >
                Start Date
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                required
                className="w-full px-3 py-2 text-sm rounded-lg border"
                style={{
                  borderColor: 'var(--color-border)',
                  backgroundColor: 'var(--color-surface)',
                  color: 'var(--color-text)',
                }}
              />
            </div>
            <div className="flex-1">
              <label
                className="block text-sm font-medium mb-1"
                style={{ color: 'var(--color-text-secondary)' }}
              >
                End Date
              </label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                required
                className="w-full px-3 py-2 text-sm rounded-lg border"
                style={{
                  borderColor: 'var(--color-border)',
                  backgroundColor: 'var(--color-surface)',
                  color: 'var(--color-text)',
                }}
              />
            </div>
          </div>

          <div>
            <label
              className="block text-sm font-medium mb-1"
              style={{ color: 'var(--color-text-secondary)' }}
            >
              Days
            </label>
            <input
              type="number"
              value={days}
              onChange={(e) => setDays(Number(e.target.value))}
              min={0.5}
              step={0.5}
              required
              className="w-full px-3 py-2 text-sm rounded-lg border"
              style={{
                borderColor: 'var(--color-border)',
                backgroundColor: 'var(--color-surface)',
                color: 'var(--color-text)',
              }}
            />
          </div>

          <div>
            <label
              className="block text-sm font-medium mb-1"
              style={{ color: 'var(--color-text-secondary)' }}
            >
              Notes
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Optional"
              rows={2}
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
              disabled={saving || !startDate || !endDate}
              className="px-4 py-2 text-sm font-medium rounded-lg text-white disabled:opacity-50"
              style={{ background: 'linear-gradient(135deg, #8A00E5, #4D217A)' }}
            >
              {saving ? 'Submitting...' : 'Submit Request'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// --- Create Allowance Modal ---

function CreateAllowanceModal({
  workspaceId,
  members,
  year,
  onClose,
  onCreated,
}: {
  workspaceId: string;
  members: User[];
  year: number;
  onClose: () => void;
  onCreated: () => void;
}) {
  const [userId, setUserId] = useState('');
  const [entitlementDays, setEntitlementDays] = useState<number>(25);
  const [carriedForward, setCarriedForward] = useState<number>(0);
  const createAllowance = useCreateLeaveAllowance(workspaceId);
  const saving = createAllowance.isPending;

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userId) return;
    try {
      await createAllowance.mutateAsync({
        user_id: userId,
        year,
        entitlement_days: entitlementDays,
        carried_forward: carriedForward,
      });
      onCreated();
    } catch (err) {
      console.error('Failed to create allowance:', err);
      Toast.show('Failed to create allowance');
    }
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
          <h3 className="text-lg font-bold" style={{ color: 'var(--color-text)' }}>
            Set Allowance, {year}
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
              Person
            </label>
            <select
              value={userId}
              onChange={(e) => setUserId(e.target.value)}
              required
              className="w-full px-3 py-2 text-sm rounded-lg border"
              style={{
                borderColor: 'var(--color-border)',
                backgroundColor: 'var(--color-surface)',
                color: 'var(--color-text)',
              }}
            >
              <option value="">Select person...</option>
              {members.map((m) => (
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
              Entitlement Days
            </label>
            <input
              type="number"
              value={entitlementDays}
              onChange={(e) => setEntitlementDays(Number(e.target.value))}
              min={0}
              required
              className="w-full px-3 py-2 text-sm rounded-lg border"
              style={{
                borderColor: 'var(--color-border)',
                backgroundColor: 'var(--color-surface)',
                color: 'var(--color-text)',
              }}
            />
          </div>

          <div>
            <label
              className="block text-sm font-medium mb-1"
              style={{ color: 'var(--color-text-secondary)' }}
            >
              Carried Forward
            </label>
            <input
              type="number"
              value={carriedForward}
              onChange={(e) => setCarriedForward(Number(e.target.value))}
              min={0}
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
              disabled={saving || !userId}
              className="px-4 py-2 text-sm font-medium rounded-lg text-white disabled:opacity-50"
              style={{ background: 'linear-gradient(135deg, #8A00E5, #4D217A)' }}
            >
              {saving ? 'Saving...' : 'Save Allowance'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
