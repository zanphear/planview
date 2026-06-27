import { useEffect, useMemo, useState } from 'react';
import {
  Activity,
  ClipboardCheck,
  Plus,
  Star,
  TrendingUp,
  Calendar,
  Users,
  ChevronDown,
  X,
} from 'lucide-react';
import { Toast } from '../components/shared/Toast';
import { useWorkspaceStore } from '../stores/workspaceStore';
import { useAuthStore } from '../stores/authStore';
import { reviewsApi } from '../api/reviews';
import { membersApi } from '../api/users';
import { LoadingSpinner } from '../components/shared/LoadingSpinner';
import { StatCard } from '../components/shared/StatCard';
import { DonutChart } from '../components/charts/DonutChart';
import { BarChart } from '../components/charts/BarChart';
import { COLOURS } from '../utils/colours';
import type { ReviewCycle, Review } from '../api/reviews';
import type { User } from '../api/users';

type Tab = 'cycles' | 'reviews';

const STATUS_COLOURS: Record<string, { bg: string; text: string; label: string }> = {
  draft: { bg: 'rgba(107,114,128,0.12)', text: '#6b7280', label: 'Draft' },
  active: { bg: 'rgba(16,185,129,0.12)', text: '#10b981', label: 'Active' },
  closed: { bg: 'rgba(239,68,68,0.12)', text: '#ef4444', label: 'Closed' },
  not_started: { bg: 'rgba(107,114,128,0.12)', text: '#6b7280', label: 'Not Started' },
  in_progress: { bg: 'rgba(59,130,246,0.12)', text: '#3b82f6', label: 'In Progress' },
  submitted: { bg: 'rgba(245,158,11,0.12)', text: '#f59e0b', label: 'Submitted' },
  completed: { bg: 'rgba(16,185,129,0.12)', text: '#10b981', label: 'Completed' },
};

function StatusBadge({ status }: { status: string }) {
  const info = STATUS_COLOURS[status] || {
    bg: 'rgba(107,114,128,0.12)',
    text: '#6b7280',
    label: status,
  };
  return (
    <span
      className="px-2 py-0.5 rounded-full text-xs font-medium"
      style={{ backgroundColor: info.bg, color: info.text }}
    >
      {info.label}
    </span>
  );
}

function StarRating({ value, onChange }: { value: number | null; onChange?: (v: number) => void }) {
  const rating = value || 0;
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          onClick={() => onChange?.(n)}
          disabled={!onChange}
          className={
            onChange ? 'cursor-pointer hover:scale-110 transition-transform' : 'cursor-default'
          }
        >
          <Star
            size={onChange ? 16 : 14}
            fill={n <= rating ? COLOURS.amber : 'none'}
            color={n <= rating ? COLOURS.amber : 'var(--color-grey-3)'}
          />
        </button>
      ))}
    </div>
  );
}

export function ReviewsPage() {
  const workspace = useWorkspaceStore((s) => s.currentWorkspace);
  const user = useAuthStore((s) => s.user);
  const [tab, setTab] = useState<Tab>('cycles');
  const [cycles, setCycles] = useState<ReviewCycle[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [members, setMembers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCycleId, setSelectedCycleId] = useState<string | null>(null);
  const [showCreateCycle, setShowCreateCycle] = useState(false);
  const [showCreateReview, setShowCreateReview] = useState(false);
  const [expandedReviewId, setExpandedReviewId] = useState<string | null>(null);

  const loadData = async () => {
    if (!workspace) return;
    setLoading(true);
    try {
      const [cyclesRes, membersRes] = await Promise.all([
        reviewsApi.listCycles(workspace.id),
        membersApi.list(workspace.id),
      ]);
      setCycles(cyclesRes.data);
      setMembers(membersRes.data);

      const params = selectedCycleId ? { cycle_id: selectedCycleId } : undefined;
      const reviewsRes = await reviewsApi.list(workspace.id, params);
      setReviews(reviewsRes.data);
    } catch (err) {
      console.error('Failed to load reviews data:', err);
      Toast.show('Failed to load reviews data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [workspace]);

  useEffect(() => {
    if (!workspace) return;
    const params = selectedCycleId ? { cycle_id: selectedCycleId } : undefined;
    reviewsApi
      .list(workspace.id, params)
      .then((res) => setReviews(res.data))
      .catch((err) => {
        console.error('Failed to filter reviews:', err);
        Toast.show('Failed to load reviews');
      });
  }, [selectedCycleId, workspace]);

  const getMember = (id: string) => members.find((m) => m.id === id);

  const reviewCountForCycle = (cycleId: string) =>
    reviews.filter((r) => r.cycle_id === cycleId).length;

  const handleCycleClick = (cycleId: string) => {
    setSelectedCycleId(cycleId);
    setTab('reviews');
  };

  const handleStatusUpdate = async (cycleId: string, status: string) => {
    if (!workspace) return;
    try {
      await reviewsApi.updateCycle(workspace.id, cycleId, { status });
      loadData();
    } catch (err) {
      console.error('Failed to update cycle status:', err);
      Toast.show('Failed to update cycle status');
    }
  };

  // Computed stats
  const activeCycles = useMemo(
    () => cycles.filter((c) => c.status === 'active' || c.status === 'in_progress').length,
    [cycles],
  );
  const totalReviews = reviews.length;
  const avgRating = useMemo(() => {
    const rated = reviews.filter((r) => r.overall_rating != null);
    if (rated.length === 0) return '\u2014';
    return (rated.reduce((sum, r) => sum + (r.overall_rating as number), 0) / rated.length).toFixed(
      1,
    );
  }, [reviews]);
  const completionRate = useMemo(() => {
    if (reviews.length === 0) return 0;
    return Math.round(
      (reviews.filter((r) => r.status === 'completed').length / reviews.length) * 100,
    );
  }, [reviews]);

  // Chart data
  const reviewStatusSegments = useMemo(() => {
    const counts: Record<string, number> = {};
    reviews.forEach((r) => {
      counts[r.status] = (counts[r.status] || 0) + 1;
    });
    const colourMap: Record<string, string> = {
      not_started: COLOURS.slate,
      pending: COLOURS.amber,
      in_progress: COLOURS.blue,
      submitted: COLOURS.purple,
      completed: COLOURS.green,
    };
    return Object.entries(counts).map(([status, value]) => ({
      label: status.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()),
      value,
      colour: colourMap[status] || COLOURS.slate,
    }));
  }, [reviews]);

  const ratingBars = useMemo(() => {
    const counts = [0, 0, 0, 0, 0];
    reviews.forEach((r) => {
      if (r.overall_rating && r.overall_rating >= 1 && r.overall_rating <= 5)
        counts[r.overall_rating - 1]++;
    });
    const barColours = [COLOURS.red, '#f97316', COLOURS.amber, '#84cc16', COLOURS.green];
    return counts.map((value, i) => ({ label: `${i + 1} Star`, value, colour: barColours[i] }));
  }, [reviews]);

  // Per-cycle completion helper
  const getCycleCompletion = (cycleId: string) => {
    const cycleReviews = reviews.filter((r) => r.cycle_id === cycleId);
    if (cycleReviews.length === 0) return 0;
    return Math.round(
      (cycleReviews.filter((r) => r.status === 'completed').length / cycleReviews.length) * 100,
    );
  };

  if (loading) return <LoadingSpinner />;

  return (
    <div className="p-4 sm:p-6 h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <div className="flex items-center gap-3">
          <ClipboardCheck size={24} style={{ color: 'var(--color-primary)' }} />
          <h2 className="text-xl font-bold" style={{ color: 'var(--color-text)' }}>
            Performance Reviews
          </h2>
        </div>

        {/* Tab switcher */}
        <div
          className="flex items-center gap-1 p-1 rounded-lg"
          style={{ backgroundColor: 'var(--color-grey-1)' }}
        >
          <button
            onClick={() => setTab('cycles')}
            className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
              tab === 'cycles' ? 'shadow-sm' : ''
            }`}
            style={{
              backgroundColor: tab === 'cycles' ? 'var(--color-surface)' : 'transparent',
              color: tab === 'cycles' ? 'var(--color-text)' : 'var(--color-text-secondary)',
            }}
          >
            <Calendar size={14} className="inline mr-1.5" />
            Cycles
          </button>
          <button
            onClick={() => setTab('reviews')}
            className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
              tab === 'reviews' ? 'shadow-sm' : ''
            }`}
            style={{
              backgroundColor: tab === 'reviews' ? 'var(--color-surface)' : 'transparent',
              color: tab === 'reviews' ? 'var(--color-text)' : 'var(--color-text-secondary)',
            }}
          >
            <Users size={14} className="inline mr-1.5" />
            Reviews
          </button>
        </div>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard
          label="Active Cycles"
          value={activeCycles}
          icon={<Activity size={20} />}
          colour={COLOURS.blue}
        />
        <StatCard
          label="Total Reviews"
          value={totalReviews}
          icon={<ClipboardCheck size={20} />}
          colour={COLOURS.purple}
        />
        <StatCard
          label="Avg Rating"
          value={avgRating}
          icon={<Star size={20} />}
          colour={COLOURS.amber}
        />
        <StatCard
          label="Completion Rate"
          value={completionRate + '%'}
          icon={<TrendingUp size={20} />}
          colour={COLOURS.green}
        />
      </div>

      {/* Charts */}
      {(cycles.length > 0 || reviews.length > 0) && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
          <div
            className="rounded-xl border p-5"
            style={{ backgroundColor: 'var(--color-surface)', borderColor: 'var(--color-border)' }}
          >
            <h3 className="text-sm font-semibold mb-4" style={{ color: 'var(--color-text)' }}>
              Review Status
            </h3>
            <DonutChart
              segments={reviewStatusSegments}
              size={120}
              centerValue={totalReviews}
              centerLabel="reviews"
            />
          </div>
          <div
            className="rounded-xl border p-5"
            style={{ backgroundColor: 'var(--color-surface)', borderColor: 'var(--color-border)' }}
          >
            <h3 className="text-sm font-semibold mb-4" style={{ color: 'var(--color-text)' }}>
              Rating Distribution
            </h3>
            <BarChart bars={ratingBars} height={130} />
          </div>
        </div>
      )}

      {/* Cycles Tab */}
      {tab === 'cycles' && (
        <div className="flex-1 overflow-auto">
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
              {cycles.length} cycle{cycles.length !== 1 ? 's' : ''}
            </p>
            <button
              onClick={() => setShowCreateCycle(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-lg text-white transition-colors"
              style={{ background: 'linear-gradient(135deg, #8A00E5, #4D217A)' }}
            >
              <Plus size={14} />
              New Cycle
            </button>
          </div>

          {cycles.length === 0 ? (
            <div className="flex-1 flex items-center justify-center py-16">
              <div className="text-center">
                <Calendar
                  size={48}
                  className="mx-auto mb-3 opacity-30"
                  style={{ color: 'var(--color-text-secondary)' }}
                />
                <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
                  No review cycles yet. Create one to get started.
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              {cycles.map((cycle) => (
                <div
                  key={cycle.id}
                  className="rounded-xl border p-4 cursor-pointer hover:shadow-md transition-shadow"
                  style={{
                    borderColor: 'var(--color-border)',
                    backgroundColor: 'var(--color-surface)',
                  }}
                  onClick={() => handleCycleClick(cycle.id)}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-semibold text-sm" style={{ color: 'var(--color-text)' }}>
                        {cycle.name}
                      </div>
                      <div
                        className="text-xs mt-1 flex items-center gap-2"
                        style={{ color: 'var(--color-text-secondary)' }}
                      >
                        <Calendar size={12} />
                        {cycle.period_start}, {cycle.period_end}
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>
                        {reviewCountForCycle(cycle.id)} review
                        {reviewCountForCycle(cycle.id) !== 1 ? 's' : ''}
                      </span>
                      <StatusBadge status={cycle.status} />
                      <select
                        value={cycle.status}
                        onClick={(e) => e.stopPropagation()}
                        onChange={(e) => handleStatusUpdate(cycle.id, e.target.value)}
                        className="text-xs px-1.5 py-1 rounded border"
                        style={{
                          borderColor: 'var(--color-border)',
                          backgroundColor: 'var(--color-surface)',
                          color: 'var(--color-text)',
                        }}
                      >
                        <option value="draft">Draft</option>
                        <option value="active">Active</option>
                        <option value="closed">Closed</option>
                      </select>
                    </div>
                  </div>
                  <div
                    className="w-full h-1.5 rounded-full mt-2"
                    style={{ backgroundColor: 'var(--color-grey-2)' }}
                  >
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: `${getCycleCompletion(cycle.id)}%`,
                        backgroundColor: COLOURS.green,
                      }}
                    />
                  </div>
                  <span className="text-xs mt-1" style={{ color: 'var(--color-text-secondary)' }}>
                    {getCycleCompletion(cycle.id)}% complete
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Reviews Tab */}
      {tab === 'reviews' && (
        <div className="flex-1 overflow-auto">
          <div className="flex items-center justify-between mb-4">
            {/* Cycle selector */}
            <div className="relative">
              <select
                value={selectedCycleId || ''}
                onChange={(e) => setSelectedCycleId(e.target.value || null)}
                className="text-sm pl-3 pr-8 py-1.5 rounded-lg border appearance-none"
                style={{
                  borderColor: 'var(--color-border)',
                  backgroundColor: 'var(--color-surface)',
                  color: 'var(--color-text)',
                }}
              >
                <option value="">All Cycles</option>
                {cycles.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
              <ChevronDown
                size={14}
                className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none"
                style={{ color: 'var(--color-text-secondary)' }}
              />
            </div>

            <button
              onClick={() => setShowCreateReview(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-lg text-white transition-colors"
              style={{ background: 'linear-gradient(135deg, #8A00E5, #4D217A)' }}
            >
              <Plus size={14} />
              New Review
            </button>
          </div>

          {reviews.length === 0 ? (
            <div className="flex-1 flex items-center justify-center py-16">
              <div className="text-center">
                <ClipboardCheck
                  size={48}
                  className="mx-auto mb-3 opacity-30"
                  style={{ color: 'var(--color-text-secondary)' }}
                />
                <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
                  No reviews found{selectedCycleId ? ' for this cycle' : ''}. Create one to get
                  started.
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              {reviews.map((review) => (
                <ReviewCard
                  key={review.id}
                  review={review}
                  getMember={getMember}
                  expanded={expandedReviewId === review.id}
                  onToggle={() =>
                    setExpandedReviewId(expandedReviewId === review.id ? null : review.id)
                  }
                  workspaceId={workspace!.id}
                  onUpdated={loadData}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Create Cycle Modal */}
      {showCreateCycle && workspace && (
        <CreateCycleModal
          workspaceId={workspace.id}
          onClose={() => setShowCreateCycle(false)}
          onCreated={loadData}
        />
      )}

      {/* Create Review Modal */}
      {showCreateReview && workspace && (
        <CreateReviewModal
          workspaceId={workspace.id}
          cycles={cycles}
          members={members}
          selectedCycleId={selectedCycleId}
          currentUserId={user?.id || null}
          onClose={() => setShowCreateReview(false)}
          onCreated={loadData}
        />
      )}
    </div>
  );
}

// --- Review Card ---

function ReviewCard({
  review,
  getMember,
  expanded,
  onToggle,
  workspaceId,
  onUpdated,
}: {
  review: Review;
  getMember: (id: string) => User | undefined;
  expanded: boolean;
  onToggle: () => void;
  workspaceId: string;
  onUpdated: () => void;
}) {
  const reviewee = getMember(review.user_id);
  const reviewer = getMember(review.reviewer_id);
  const [strengths, setStrengths] = useState(review.strengths || '');
  const [areasForImprovement, setAreasForImprovement] = useState(
    review.areas_for_improvement || '',
  );
  const [rating, setRating] = useState(review.overall_rating);
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      await reviewsApi.update(workspaceId, review.id, {
        strengths: strengths || null,
        areas_for_improvement: areasForImprovement || null,
        overall_rating: rating,
        status: 'in_progress',
      });
      onUpdated();
    } catch (err) {
      console.error('Failed to update review:', err);
      Toast.show('Failed to save review');
    } finally {
      setSaving(false);
    }
  };

  const handleSubmit = async () => {
    setSaving(true);
    try {
      await reviewsApi.update(workspaceId, review.id, {
        strengths: strengths || null,
        areas_for_improvement: areasForImprovement || null,
        overall_rating: rating,
        status: 'submitted',
      });
      onUpdated();
    } catch (err) {
      console.error('Failed to submit review:', err);
      Toast.show('Failed to submit review');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="rounded-xl border overflow-hidden transition-shadow"
      style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-surface)' }}
    >
      {/* Summary row */}
      <div
        className="flex items-center gap-3 p-4 cursor-pointer hover:bg-subtle transition-colors"
        onClick={onToggle}
      >
        {/* Reviewee avatar */}
        <div
          className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0"
          style={{ backgroundColor: reviewee?.colour || '#999' }}
        >
          {reviewee?.initials || reviewee?.name?.charAt(0) || '?'}
        </div>

        <div className="flex-1 min-w-0">
          <div className="text-sm font-medium" style={{ color: 'var(--color-text)' }}>
            {reviewee?.name || 'Unknown'}
          </div>
          <div className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>
            Reviewer: {reviewer?.name || 'Unknown'}
          </div>
        </div>

        <div className="flex items-center gap-3">
          <StarRating value={review.overall_rating} />
          <StatusBadge status={review.status} />
          <ChevronDown
            size={16}
            className={`transition-transform ${expanded ? 'rotate-180' : ''}`}
            style={{ color: 'var(--color-text-secondary)' }}
          />
        </div>
      </div>

      {/* Expanded edit view */}
      {expanded && (
        <div
          className="px-4 pb-4 border-t space-y-4"
          style={{ borderColor: 'var(--color-border)' }}
        >
          <div className="pt-4">
            <label
              className="block text-sm font-medium mb-1"
              style={{ color: 'var(--color-text-secondary)' }}
            >
              Overall Rating
            </label>
            <StarRating value={rating} onChange={setRating} />
          </div>

          <div>
            <label
              className="block text-sm font-medium mb-1"
              style={{ color: 'var(--color-text-secondary)' }}
            >
              Strengths
            </label>
            <textarea
              value={strengths}
              onChange={(e) => setStrengths(e.target.value)}
              rows={3}
              placeholder="Key strengths observed..."
              className="w-full px-3 py-2 text-sm rounded-lg border resize-none"
              style={{
                borderColor: 'var(--color-border)',
                backgroundColor: 'var(--color-bg)',
                color: 'var(--color-text)',
              }}
            />
          </div>

          <div>
            <label
              className="block text-sm font-medium mb-1"
              style={{ color: 'var(--color-text-secondary)' }}
            >
              Areas for Improvement
            </label>
            <textarea
              value={areasForImprovement}
              onChange={(e) => setAreasForImprovement(e.target.value)}
              rows={3}
              placeholder="Areas where growth is needed..."
              className="w-full px-3 py-2 text-sm rounded-lg border resize-none"
              style={{
                borderColor: 'var(--color-border)',
                backgroundColor: 'var(--color-bg)',
                color: 'var(--color-text)',
              }}
            />
          </div>

          <div className="flex justify-end gap-2">
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-4 py-2 text-sm rounded-lg border disabled:opacity-50"
              style={{ borderColor: 'var(--color-border)', color: 'var(--color-text)' }}
            >
              {saving ? 'Saving...' : 'Save Draft'}
            </button>
            <button
              onClick={handleSubmit}
              disabled={saving}
              className="px-4 py-2 text-sm font-medium rounded-lg text-white disabled:opacity-50"
              style={{ background: 'linear-gradient(135deg, #8A00E5, #4D217A)' }}
            >
              {saving ? 'Submitting...' : 'Submit Review'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// --- Create Cycle Modal ---

function CreateCycleModal({
  workspaceId,
  onClose,
  onCreated,
}: {
  workspaceId: string;
  onClose: () => void;
  onCreated: () => void;
}) {
  const [name, setName] = useState('');
  const [periodStart, setPeriodStart] = useState('');
  const [periodEnd, setPeriodEnd] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await reviewsApi.createCycle(workspaceId, {
        name,
        period_start: periodStart,
        period_end: periodEnd,
      });
      onCreated();
      onClose();
    } catch (err) {
      console.error('Failed to create cycle:', err);
      Toast.show('Failed to create cycle');
    } finally {
      setSaving(false);
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
            New Review Cycle
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
              Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              placeholder="e.g. Q1 2026 Review"
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
                Period Start
              </label>
              <input
                type="date"
                value={periodStart}
                onChange={(e) => setPeriodStart(e.target.value)}
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
                Period End
              </label>
              <input
                type="date"
                value={periodEnd}
                onChange={(e) => setPeriodEnd(e.target.value)}
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
              disabled={saving || !name.trim() || !periodStart || !periodEnd}
              className="px-4 py-2 text-sm font-medium rounded-lg text-white disabled:opacity-50"
              style={{ background: 'linear-gradient(135deg, #8A00E5, #4D217A)' }}
            >
              {saving ? 'Creating...' : 'Create Cycle'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// --- Create Review Modal ---

function CreateReviewModal({
  workspaceId,
  cycles,
  members,
  selectedCycleId,
  currentUserId,
  onClose,
  onCreated,
}: {
  workspaceId: string;
  cycles: ReviewCycle[];
  members: User[];
  selectedCycleId: string | null;
  currentUserId: string | null;
  onClose: () => void;
  onCreated: () => void;
}) {
  const [cycleId, setCycleId] = useState(selectedCycleId || '');
  const [userId, setUserId] = useState('');
  const [reviewerId, setReviewerId] = useState(currentUserId || '');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cycleId || !userId || !reviewerId) return;
    setSaving(true);
    try {
      await reviewsApi.create(workspaceId, cycleId, {
        user_id: userId,
        reviewer_id: reviewerId,
      });
      onCreated();
      onClose();
    } catch (err) {
      console.error('Failed to create review:', err);
      Toast.show('Failed to create review');
    } finally {
      setSaving(false);
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
            New Review
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
              Cycle
            </label>
            <select
              value={cycleId}
              onChange={(e) => setCycleId(e.target.value)}
              required
              className="w-full px-3 py-2 text-sm rounded-lg border"
              style={{
                borderColor: 'var(--color-border)',
                backgroundColor: 'var(--color-surface)',
                color: 'var(--color-text)',
              }}
            >
              <option value="">Select cycle...</option>
              {cycles.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label
              className="block text-sm font-medium mb-1"
              style={{ color: 'var(--color-text-secondary)' }}
            >
              Reviewee
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
              Reviewer
            </label>
            <select
              value={reviewerId}
              onChange={(e) => setReviewerId(e.target.value)}
              required
              className="w-full px-3 py-2 text-sm rounded-lg border"
              style={{
                borderColor: 'var(--color-border)',
                backgroundColor: 'var(--color-surface)',
                color: 'var(--color-text)',
              }}
            >
              <option value="">Select reviewer...</option>
              {members.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name}
                </option>
              ))}
            </select>
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
              disabled={saving || !cycleId || !userId || !reviewerId}
              className="px-4 py-2 text-sm font-medium rounded-lg text-white disabled:opacity-50"
              style={{ background: 'linear-gradient(135deg, #8A00E5, #4D217A)' }}
            >
              {saving ? 'Creating...' : 'Create Review'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
