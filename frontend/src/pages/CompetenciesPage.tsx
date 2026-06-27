import { useEffect, useState, useMemo, useRef } from 'react';
import { Award, Plus, Grid3X3, Users, ChevronDown, X, Edit3, Trash2, Shield, BookOpen, TrendingUp } from 'lucide-react';
import { useWorkspaceStore } from '../stores/workspaceStore';
import { useAuthStore } from '../stores/authStore';
import { competenciesApi } from '../api/competencies';
import type { Competency, UserCompetency } from '../api/competencies';
import { membersApi } from '../api/users';
import type { User } from '../api/users';
import { LoadingSpinner } from '../components/shared/LoadingSpinner';
import { Toast } from '../components/shared/Toast';
import { LookupSelect } from '../components/shared/LookupSelect';
import { StatCard } from '../components/shared/StatCard';
import { BarChart } from '../components/charts/BarChart';
import { COLOURS } from '../utils/colours';

type Tab = 'competencies' | 'matrix';
type Level = 'beginner' | 'intermediate' | 'advanced' | 'expert';

const LEVELS: { value: Level; label: string; colour: string; bg: string }[] = [
  { value: 'beginner', label: 'Beginner', colour: '#fff', bg: '#ef4444' },
  { value: 'intermediate', label: 'Intermediate', colour: '#fff', bg: '#f59e0b' },
  { value: 'advanced', label: 'Advanced', colour: '#fff', bg: '#22c55e' },
  { value: 'expert', label: 'Expert', colour: '#fff', bg: '#15803d' },
];

const LEVEL_MAP: Record<string, (typeof LEVELS)[number]> = Object.fromEntries(
  LEVELS.map((l) => [l.value, l]),
);

interface CompetencyFormData {
  name: string;
  category: string;
  description: string;
  requires_certification: boolean;
  certification_validity_months: string;
  levels: string;
}

const EMPTY_FORM: CompetencyFormData = {
  name: '',
  category: '',
  description: '',
  requires_certification: false,
  certification_validity_months: '',
  levels: '',
};

export function CompetenciesPage() {
  const workspace = useWorkspaceStore((s) => s.currentWorkspace);
  const user = useAuthStore((s) => s.user);
  const [tab, setTab] = useState<Tab>('competencies');
  const [competencies, setCompetencies] = useState<Competency[]>([]);
  const [members, setMembers] = useState<User[]>([]);
  const [matrix, setMatrix] = useState<UserCompetency[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal state
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<CompetencyFormData>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  // Popover state for matrix cell
  const [popover, setPopover] = useState<{ userId: string; competencyId: string; rect: DOMRect } | null>(null);
  const popoverRef = useRef<HTMLDivElement>(null);

  // Category filter
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [showCategoryDropdown, setShowCategoryDropdown] = useState(false);

  const loadData = async () => {
    if (!workspace) return;
    setLoading(true);
    try {
      const [compRes, membersRes, matrixRes] = await Promise.all([
        competenciesApi.list(workspace.id),
        membersApi.list(workspace.id),
        competenciesApi.matrix(workspace.id),
      ]);
      setCompetencies(compRes.data);
      setMembers(membersRes.data);
      setMatrix(matrixRes.data);
    } catch (err) {
      console.error('Failed to load competencies:', err);
      Toast.show('Failed to load competencies data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [workspace]);

  // Close popover on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        setPopover(null);
      }
    };
    if (popover) document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [popover]);

  const categories = useMemo(() => {
    const cats = new Set<string>();
    competencies.forEach((c) => {
      if (c.category) cats.add(c.category);
    });
    return Array.from(cats).sort();
  }, [competencies]);

  const filteredCompetencies = useMemo(() => {
    if (categoryFilter === 'all') return competencies;
    return competencies.filter((c) => c.category === categoryFilter);
  }, [competencies, categoryFilter]);

  const grouped = useMemo(() => {
    const groups: Record<string, Competency[]> = {};
    filteredCompetencies.forEach((c) => {
      const cat = c.category || 'Uncategorised';
      if (!groups[cat]) groups[cat] = [];
      groups[cat].push(c);
    });
    return Object.entries(groups).sort(([a], [b]) => a.localeCompare(b));
  }, [filteredCompetencies]);

  const matrixLookup = useMemo(() => {
    const map: Record<string, UserCompetency> = {};
    matrix.forEach((uc) => {
      map[`${uc.user_id}:${uc.competency_id}`] = uc;
    });
    return map;
  }, [matrix]);

  const uniqueCategories = useMemo(() => {
    const cats = new Set<string>();
    competencies.forEach((c) => { if (c.category) cats.add(c.category); });
    return cats.size;
  }, [competencies]);

  const assessedMembers = useMemo(() => {
    const userIds = new Set<string>();
    matrix.forEach((uc) => userIds.add(uc.user_id));
    return userIds.size;
  }, [matrix]);

  const avgCoverage = useMemo(() => {
    if (competencies.length === 0 || members.length === 0) return 0;
    const totalCells = competencies.length * members.length;
    const filledCells = matrix.length;
    return Math.round((filledCells / totalCells) * 100);
  }, [competencies, members, matrix]);

  const categoryBars = useMemo(() => {
    const counts: Record<string, number> = {};
    competencies.forEach((c) => {
      const cat = c.category || 'Uncategorised';
      counts[cat] = (counts[cat] || 0) + 1;
    });
    const palette = [COLOURS.blue, COLOURS.purple, COLOURS.teal, COLOURS.amber, COLOURS.green, COLOURS.pink, COLOURS.indigo, COLOURS.cyan, COLOURS.red, COLOURS.slate];
    return Object.entries(counts)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([label, value], i) => ({ label, value, colour: palette[i % palette.length] }));
  }, [competencies]);

  const categoryColourMap = useMemo(() => {
    const map: Record<string, string> = {};
    const palette = [COLOURS.blue, COLOURS.purple, COLOURS.teal, COLOURS.amber, COLOURS.green, COLOURS.pink, COLOURS.indigo, COLOURS.cyan, COLOURS.red, COLOURS.slate];
    const cats = Array.from(new Set(competencies.map((c) => c.category || 'Uncategorised'))).sort();
    cats.forEach((cat, i) => { map[cat] = palette[i % palette.length]; });
    return map;
  }, [competencies]);

  const openCreate = () => {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setShowModal(true);
  };

  const openEdit = (c: Competency) => {
    setEditingId(c.id);
    setForm({
      name: c.name,
      category: c.category || '',
      description: c.description || '',
      requires_certification: c.requires_certification,
      certification_validity_months: c.certification_validity_months?.toString() || '',
      levels: c.levels ? c.levels.join('\n') : '',
    });
    setShowModal(true);
  };

  const parseLevels = (text: string): string[] | null => {
    if (!text.trim()) return null;
    const result = text.split('\n').map((l) => l.trim()).filter(Boolean);
    return result.length > 0 ? result : null;
  };

  const handleSave = async () => {
    if (!workspace || !form.name.trim()) return;
    setSaving(true);
    try {
      const payload: Partial<Competency> = {
        name: form.name.trim(),
        category: form.category.trim() || null,
        description: form.description.trim() || null,
        requires_certification: form.requires_certification,
        certification_validity_months: form.certification_validity_months
          ? parseInt(form.certification_validity_months, 10)
          : null,
        levels: parseLevels(form.levels),
      };
      if (editingId) {
        await competenciesApi.update(workspace.id, editingId, payload);
        Toast.show('Competency updated');
      } else {
        await competenciesApi.create(workspace.id, payload);
        Toast.show('Competency created');
      }
      setShowModal(false);
      await loadData();
    } catch (err) {
      console.error('Failed to save competency:', err);
      Toast.show('Failed to save competency');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!workspace) return;
    try {
      await competenciesApi.delete(workspace.id, id);
      Toast.show('Competency deleted');
      await loadData();
    } catch (err) {
      console.error('Failed to delete competency:', err);
      Toast.show('Failed to delete competency');
    }
  };

  const handleAssess = async (userId: string, competencyId: string, level: Level) => {
    if (!workspace || !user) return;
    try {
      await competenciesApi.assess(workspace.id, competencyId, {
        user_id: userId,
        level,
      });
      setPopover(null);
      Toast.show('Assessment saved');
      // Reload matrix
      const res = await competenciesApi.matrix(workspace.id);
      setMatrix(res.data);
    } catch (err) {
      console.error('Failed to save assessment:', err);
      Toast.show('Failed to save assessment');
    }
  };

  const handleClearAssessment = async (userId: string, competencyId: string) => {
    if (!workspace) return;
    const uc = matrixLookup[`${userId}:${competencyId}`];
    if (!uc) return;
    try {
      await competenciesApi.updateAssessment(workspace.id, competencyId, uc.id, { level: '' });
      setPopover(null);
      Toast.show('Assessment cleared');
      const res = await competenciesApi.matrix(workspace.id);
      setMatrix(res.data);
    } catch (err) {
      console.error('Failed to clear assessment:', err);
      Toast.show('Failed to clear assessment');
    }
  };

  if (loading) return <LoadingSpinner fullPage />;

  return (
    <div className="p-4 sm:p-6 h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <div className="flex items-center gap-3">
          <Award size={24} style={{ color: 'var(--color-primary)' }} />
          <h2 className="text-xl font-bold" style={{ color: 'var(--color-text)' }}>
            Competencies
          </h2>
        </div>
        <div className="flex items-center gap-2">
          {/* Tab switcher */}
          <div
            className="flex rounded-lg overflow-hidden border"
            style={{ borderColor: 'var(--color-border)' }}
          >
            <button
              onClick={() => setTab('competencies')}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium transition-colors"
              style={{
                background: tab === 'competencies' ? 'var(--color-primary)' : 'transparent',
                color: tab === 'competencies' ? '#fff' : 'var(--color-text-secondary)',
              }}
            >
              <Award size={14} />
              Competencies
            </button>
            <button
              onClick={() => setTab('matrix')}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium transition-colors"
              style={{
                background: tab === 'matrix' ? 'var(--color-primary)' : 'transparent',
                color: tab === 'matrix' ? '#fff' : 'var(--color-text-secondary)',
              }}
            >
              <Grid3X3 size={14} />
              Skills Matrix
            </button>
          </div>

          {tab === 'competencies' && (
            <button
              onClick={openCreate}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium text-white transition-colors hover:opacity-90"
              style={{ background: 'var(--color-primary)' }}
            >
              <Plus size={14} />
              Add Competency
            </button>
          )}
        </div>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard label="Total Competencies" value={competencies.length} icon={<Award size={20} />} colour={COLOURS.blue} />
        <StatCard label="Categories" value={uniqueCategories} icon={<BookOpen size={20} />} colour={COLOURS.purple} />
        <StatCard label="Team Members Assessed" value={assessedMembers} icon={<Users size={20} />} colour={COLOURS.teal} />
        <StatCard label="Avg Coverage" value={avgCoverage + '%'} icon={<TrendingUp size={20} />} colour={COLOURS.green} />
      </div>

      {/* Category Chart */}
      {competencies.length > 0 && (
        <div className="rounded-xl border p-5 mb-6" style={{ backgroundColor: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
          <h3 className="text-sm font-semibold mb-4" style={{ color: 'var(--color-text)' }}>Competencies by Category</h3>
          <BarChart bars={categoryBars} height={150} />
        </div>
      )}

      {/* Content */}
      {tab === 'competencies' ? (
        <CompetenciesTab
          grouped={grouped}
          categories={categories}
          categoryFilter={categoryFilter}
          setCategoryFilter={setCategoryFilter}
          showCategoryDropdown={showCategoryDropdown}
          setShowCategoryDropdown={setShowCategoryDropdown}
          categoryColourMap={categoryColourMap}
          onEdit={openEdit}
          onDelete={handleDelete}
        />
      ) : (
        <MatrixTab
          competencies={competencies}
          members={members}
          matrixLookup={matrixLookup}
          popover={popover}
          popoverRef={popoverRef}
          onCellClick={(userId, competencyId, rect) =>
            setPopover({ userId, competencyId, rect })
          }
          onAssess={handleAssess}
          onClear={handleClearAssessment}
          onClosePopover={() => setPopover(null)}
        />
      )}

      {/* Create/Edit Modal */}
      {showModal && (
        <CompetencyModal
          form={form}
          setForm={setForm}
          isEditing={!!editingId}
          saving={saving}
          onSave={handleSave}
          onClose={() => setShowModal(false)}
        />
      )}
    </div>
  );
}

/* ─── Competencies Tab ──────────────────────────────────────────────── */

function CompetenciesTab({
  grouped,
  categories,
  categoryFilter,
  setCategoryFilter,
  showCategoryDropdown,
  setShowCategoryDropdown,
  categoryColourMap,
  onEdit,
  onDelete,
}: {
  grouped: [string, Competency[]][];
  categories: string[];
  categoryFilter: string;
  setCategoryFilter: (v: string) => void;
  showCategoryDropdown: boolean;
  setShowCategoryDropdown: (v: boolean) => void;
  categoryColourMap: Record<string, string>;
  onEdit: (c: Competency) => void;
  onDelete: (id: string) => void;
}) {
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowCategoryDropdown(false);
      }
    };
    if (showCategoryDropdown) document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [showCategoryDropdown, setShowCategoryDropdown]);

  return (
    <div className="flex-1 overflow-auto">
      {/* Category filter */}
      {categories.length > 0 && (
        <div className="mb-4 relative" ref={dropdownRef}>
          <button
            onClick={() => setShowCategoryDropdown(!showCategoryDropdown)}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm border transition-colors hover:bg-subtle"
            style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-secondary)' }}
          >
            <Users size={14} />
            {categoryFilter === 'all' ? 'All Categories' : categoryFilter}
            <ChevronDown size={14} />
          </button>
          {showCategoryDropdown && (
            <div
              className="absolute top-full mt-1 left-0 rounded-lg shadow-lg border z-20 py-1 min-w-[180px]"
              style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}
            >
              <button
                onClick={() => { setCategoryFilter('all'); setShowCategoryDropdown(false); }}
                className="w-full text-left px-3 py-1.5 text-sm hover:bg-subtle transition-colors"
                style={{ color: categoryFilter === 'all' ? 'var(--color-primary)' : 'var(--color-text)' }}
              >
                All Categories
              </button>
              {categories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => { setCategoryFilter(cat); setShowCategoryDropdown(false); }}
                  className="w-full text-left px-3 py-1.5 text-sm hover:bg-subtle transition-colors"
                  style={{ color: categoryFilter === cat ? 'var(--color-primary)' : 'var(--color-text)' }}
                >
                  {cat}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {grouped.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16">
          <Award size={48} style={{ color: 'var(--color-text-secondary)', opacity: 0.4 }} />
          <p className="mt-3 text-sm" style={{ color: 'var(--color-text-secondary)' }}>
            No competencies defined yet. Click "Add Competency" to get started.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {grouped.map(([category, comps]) => {
            const catColour = categoryColourMap[category] || 'var(--color-text-secondary)';
            return (
            <div key={category}>
              <div className="mb-3">
                <span
                  className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium"
                  style={{ backgroundColor: catColour + '18', color: catColour }}
                >
                  {category}
                </span>
              </div>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {comps.map((comp) => (
                  <div
                    key={comp.id}
                    className="rounded-lg border p-4 hover:shadow-md transition-shadow"
                    style={{
                      background: 'var(--color-surface)',
                      borderColor: 'var(--color-border)',
                    }}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <h4
                            className="font-medium truncate"
                            style={{ color: 'var(--color-text)' }}
                          >
                            {comp.name}
                          </h4>
                          {comp.requires_certification && (
                            <span
                              className="flex items-center gap-1 text-xs px-1.5 py-0.5 rounded-full shrink-0"
                              style={{ background: '#dbeafe', color: '#1d4ed8' }}
                              title={
                                comp.certification_validity_months
                                  ? `Certification valid for ${comp.certification_validity_months} months`
                                  : 'Certification required'
                              }
                            >
                              <Shield size={10} />
                              Cert
                            </span>
                          )}
                        </div>
                        {comp.description && (
                          <p
                            className="text-sm mt-1 line-clamp-2"
                            style={{ color: 'var(--color-text-secondary)' }}
                          >
                            {comp.description}
                          </p>
                        )}
                        {comp.levels && comp.levels.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-2">
                            {comp.levels.map((lvl) => (
                              <span
                                key={lvl}
                                className="text-xs px-1.5 py-0.5 rounded"
                                style={{
                                  background: 'var(--color-grey-1)',
                                  color: 'var(--color-text-secondary)',
                                }}
                              >
                                {lvl}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          onClick={() => onEdit(comp)}
                          className="p-1.5 rounded hover:bg-subtle transition-colors"
                          style={{ color: 'var(--color-text-secondary)' }}
                          title="Edit"
                        >
                          <Edit3 size={14} />
                        </button>
                        <button
                          onClick={() => onDelete(comp.id)}
                          className="p-1.5 rounded hover:bg-red-50 transition-colors text-red-500"
                          title="Delete"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )})}
        </div>
      )}
    </div>
  );
}

/* ─── Skills Matrix Tab ─────────────────────────────────────────────── */

function MatrixTab({
  competencies,
  members,
  matrixLookup,
  popover,
  popoverRef,
  onCellClick,
  onAssess,
  onClear,
  onClosePopover,
}: {
  competencies: Competency[];
  members: User[];
  matrixLookup: Record<string, UserCompetency>;
  popover: { userId: string; competencyId: string; rect: DOMRect } | null;
  popoverRef: React.RefObject<HTMLDivElement | null>;
  onCellClick: (userId: string, competencyId: string, rect: DOMRect) => void;
  onAssess: (userId: string, competencyId: string, level: Level) => void;
  onClear: (userId: string, competencyId: string) => void;
  onClosePopover: () => void;
}) {
  if (competencies.length === 0 || members.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16">
        <Grid3X3 size={48} style={{ color: 'var(--color-text-secondary)', opacity: 0.4 }} />
        <p className="mt-3 text-sm" style={{ color: 'var(--color-text-secondary)' }}>
          {competencies.length === 0
            ? 'Define some competencies first to use the skills matrix.'
            : 'No team members found.'}
        </p>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-auto relative">
      <div className="min-w-max">
        <table className="w-full border-collapse">
          <thead>
            <tr>
              <th
                className="sticky left-0 z-10 text-left text-sm font-semibold px-4 py-3 border-b"
                style={{
                  background: 'var(--color-surface)',
                  borderColor: 'var(--color-border)',
                  color: 'var(--color-text)',
                  minWidth: 200,
                }}
              >
                Team Member
              </th>
              {competencies.map((comp) => (
                <th
                  key={comp.id}
                  className="text-center text-xs font-medium px-2 py-3 border-b"
                  style={{
                    borderColor: 'var(--color-border)',
                    color: 'var(--color-text-secondary)',
                    minWidth: 100,
                    maxWidth: 140,
                  }}
                  title={comp.description || comp.name}
                >
                  <div className="truncate">{comp.name}</div>
                  {comp.category && (
                    <div className="text-[10px] opacity-60 truncate">{comp.category}</div>
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {members.map((member) => (
              <tr key={member.id} className="hover:bg-subtle transition-colors">
                <td
                  className="sticky left-0 z-10 px-4 py-2.5 border-b"
                  style={{
                    background: 'var(--color-surface)',
                    borderColor: 'var(--color-border)',
                  }}
                >
                  <div className="flex items-center gap-2.5">
                    <div
                      className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-semibold shrink-0"
                      style={{ background: member.colour || '#6b7280' }}
                    >
                      {member.initials || member.name.charAt(0).toUpperCase()}
                    </div>
                    <span
                      className="text-sm font-medium truncate"
                      style={{ color: 'var(--color-text)' }}
                    >
                      {member.name}
                    </span>
                  </div>
                </td>
                {competencies.map((comp) => {
                  const uc = matrixLookup[`${member.id}:${comp.id}`];
                  const level = uc?.level ? LEVEL_MAP[uc.level] : null;
                  const isActive =
                    popover?.userId === member.id && popover?.competencyId === comp.id;

                  return (
                    <td
                      key={comp.id}
                      className="text-center px-2 py-2.5 border-b"
                      style={{ borderColor: 'var(--color-border)' }}
                    >
                      <button
                        onClick={(e) => {
                          const rect = (e.target as HTMLElement).getBoundingClientRect();
                          onCellClick(member.id, comp.id, rect);
                        }}
                        className="w-full h-8 rounded text-xs font-medium transition-colors hover:scale-105"
                        style={{
                          background: level ? level.bg : 'var(--color-grey-1)',
                          color: level ? level.colour : 'var(--color-text-secondary)',
                          outline: isActive ? '2px solid var(--color-primary)' : 'none',
                          outlineOffset: 1,
                        }}
                        title={level ? level.label : 'Not assessed'}
                      >
                        {level ? level.label.charAt(0) : '-'}
                      </button>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Level popover */}
      {popover && (
        <div
          ref={popoverRef}
          className="fixed z-50 rounded-lg shadow-xl border p-2 min-w-[160px]"
          style={{
            background: 'var(--color-surface)',
            borderColor: 'var(--color-border)',
            top: popover.rect.bottom + 8,
            left: popover.rect.left + popover.rect.width / 2 - 80,
          }}
        >
          <div className="flex items-center justify-between mb-1 px-1">
            <span className="text-xs font-medium" style={{ color: 'var(--color-text-secondary)' }}>
              Set Level
            </span>
            <button
              onClick={onClosePopover}
              className="p-0.5 rounded hover:bg-subtle"
              style={{ color: 'var(--color-text-secondary)' }}
            >
              <X size={12} />
            </button>
          </div>
          <div className="space-y-1">
            {LEVELS.map((lvl) => (
              <button
                key={lvl.value}
                onClick={() => onAssess(popover.userId, popover.competencyId, lvl.value)}
                className="w-full flex items-center gap-2 px-2 py-1.5 rounded text-sm hover:opacity-80 transition-opacity"
                style={{ background: lvl.bg, color: lvl.colour }}
              >
                <div className="w-2 h-2 rounded-full bg-white/40" />
                {lvl.label}
              </button>
            ))}
            {matrixLookup[`${popover.userId}:${popover.competencyId}`] && (
              <button
                onClick={() => onClear(popover.userId, popover.competencyId)}
                className="w-full flex items-center gap-2 px-2 py-1.5 rounded text-sm hover:bg-subtle transition-colors"
                style={{ color: 'var(--color-text-secondary)' }}
              >
                <X size={12} />
                Clear Assessment
              </button>
            )}
          </div>
        </div>
      )}

      {/* Legend */}
      <div
        className="flex items-center gap-4 mt-4 pt-3 border-t"
        style={{ borderColor: 'var(--color-border)' }}
      >
        <span className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>
          Legend:
        </span>
        {LEVELS.map((lvl) => (
          <div key={lvl.value} className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded" style={{ background: lvl.bg }} />
            <span className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>
              {lvl.label}
            </span>
          </div>
        ))}
        <div className="flex items-center gap-1.5">
          <div
            className="w-3 h-3 rounded"
            style={{ background: 'var(--color-grey-1)' }}
          />
          <span className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>
            Not Assessed
          </span>
        </div>
      </div>
    </div>
  );
}

/* ─── Create / Edit Modal ───────────────────────────────────────────── */

function CompetencyModal({
  form,
  setForm,
  isEditing,
  saving,
  onSave,
  onClose,
}: {
  form: CompetencyFormData;
  setForm: React.Dispatch<React.SetStateAction<CompetencyFormData>>;
  isEditing: boolean;
  saving: boolean;
  onSave: () => void;
  onClose: () => void;
}) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <form
        onSubmit={handleSubmit}
        className="rounded-xl shadow-2xl border w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto"
        style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}
      >
        {/* Modal header */}
        <div
          className="flex items-center justify-between px-6 py-4 border-b"
          style={{ borderColor: 'var(--color-border)' }}
        >
          <h3 className="font-semibold text-lg" style={{ color: 'var(--color-text)' }}>
            {isEditing ? 'Edit Competency' : 'New Competency'}
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded hover:bg-subtle transition-colors"
            style={{ color: 'var(--color-text-secondary)' }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Modal body */}
        <div className="px-6 py-4 space-y-4">
          {/* Name */}
          <div>
            <label
              className="block text-sm font-medium mb-1"
              style={{ color: 'var(--color-text)' }}
            >
              Name *
            </label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              placeholder="e.g. Electrical Safety"
              className="w-full rounded-lg border px-3 py-2 text-sm outline-none focus:ring-2 transition-shadow"
              style={{
                borderColor: 'var(--color-border)',
                background: 'var(--color-surface)',
                color: 'var(--color-text)',
              }}
            />
          </div>

          {/* Category */}
          <div>
            <label
              className="block text-sm font-medium mb-1"
              style={{ color: 'var(--color-text)' }}
            >
              Category
            </label>
            <LookupSelect
              category="competency_category"
              value={form.category}
              onChange={(v) => setForm((f) => ({ ...f, category: v }))}
              placeholder="Select category..."
              className="w-full rounded-lg border px-3 py-2 text-sm outline-none focus:ring-2 transition-shadow"
              style={{
                borderColor: 'var(--color-border)',
                background: 'var(--color-surface)',
                color: 'var(--color-text)',
              }}
            />
          </div>

          {/* Description */}
          <div>
            <label
              className="block text-sm font-medium mb-1"
              style={{ color: 'var(--color-text)' }}
            >
              Description
            </label>
            <textarea
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              placeholder="Brief description of this competency"
              rows={3}
              className="w-full rounded-lg border px-3 py-2 text-sm outline-none focus:ring-2 transition-shadow resize-none"
              style={{
                borderColor: 'var(--color-border)',
                background: 'var(--color-surface)',
                color: 'var(--color-text)',
              }}
            />
          </div>

          {/* Certification toggle */}
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setForm((f) => ({ ...f, requires_certification: !f.requires_certification }))}
              className="relative w-10 h-5 rounded-full transition-colors"
              style={{
                background: form.requires_certification ? 'var(--color-primary)' : 'var(--color-grey-2, #d1d5db)',
              }}
            >
              <span
                className="absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform"
                style={{
                  left: form.requires_certification ? 22 : 2,
                }}
              />
            </button>
            <label className="text-sm" style={{ color: 'var(--color-text)' }}>
              Requires certification
            </label>
          </div>

          {/* Certification validity */}
          {form.requires_certification && (
            <div>
              <label
                className="block text-sm font-medium mb-1"
                style={{ color: 'var(--color-text)' }}
              >
                Certification Validity (months)
              </label>
              <input
                type="number"
                value={form.certification_validity_months}
                onChange={(e) =>
                  setForm((f) => ({ ...f, certification_validity_months: e.target.value }))
                }
                placeholder="e.g. 12"
                min={1}
                className="w-full rounded-lg border px-3 py-2 text-sm outline-none focus:ring-2 transition-shadow"
                style={{
                  borderColor: 'var(--color-border)',
                  background: 'var(--color-surface)',
                  color: 'var(--color-text)',
                }}
              />
            </div>
          )}

          {/* Levels */}
          <div>
            <label
              className="block text-sm font-medium mb-1"
              style={{ color: 'var(--color-text)' }}
            >
              Custom Levels
            </label>
            <p className="text-xs mb-1.5" style={{ color: 'var(--color-text-secondary)' }}>
              One per line
            </p>
            <textarea
              value={form.levels}
              onChange={(e) => setForm((f) => ({ ...f, levels: e.target.value }))}
              placeholder={`awareness\npractitioner\nexpert`}
              rows={4}
              className="w-full rounded-lg border px-3 py-2 text-sm font-mono outline-none focus:ring-2 transition-shadow resize-none"
              style={{
                borderColor: 'var(--color-border)',
                background: 'var(--color-surface)',
                color: 'var(--color-text)',
              }}
            />
          </div>
        </div>

        {/* Modal footer */}
        <div
          className="flex items-center justify-end gap-2 px-6 py-4 border-t"
          style={{ borderColor: 'var(--color-border)' }}
        >
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-lg text-sm font-medium hover:bg-subtle transition-colors"
            style={{ color: 'var(--color-text-secondary)' }}
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving || !form.name.trim()}
            className="px-4 py-2 rounded-lg text-sm font-medium text-white transition-colors hover:opacity-90 disabled:opacity-50"
            style={{ background: 'var(--color-primary)' }}
          >
            {saving ? 'Saving...' : isEditing ? 'Update' : 'Create'}
          </button>
        </div>
      </form>
    </div>
  );
}
