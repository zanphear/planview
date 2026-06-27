import { useState, useEffect } from 'react';
import {
  ClipboardList, Plus, Check, Square, CheckSquare, Trash2, UserPlus, X,
  ClipboardCheck, CheckCircle, FileText, TrendingUp,
} from 'lucide-react';
import { useWorkspaceStore } from '../stores/workspaceStore';
import { useAuthStore } from '../stores/authStore';
import {
  onboardingApi,
  type OnboardingTemplate,
  type OnboardingChecklist,
} from '../api/onboarding';
import { membersApi } from '../api/users';
import type { User } from '../api/users';
import { LookupSelect } from '../components/shared/LookupSelect';
import { StatCard } from '../components/shared/StatCard';
import { StatusBadge } from '../components/shared/StatusBadge';
import { ProgressRing } from '../components/charts/ProgressRing';
import { COLOURS } from '../utils/colours';

type Tab = 'templates' | 'checklists';
type ChecklistType = 'onboarding' | 'offboarding';

interface NewTemplateItem {
  title: string;
  description: string;
  sort_order: number;
  default_assignee_role: string;
}

const TYPE_COLOURS: Record<ChecklistType, { bg: string; text: string }> = {
  onboarding: { bg: '#dbeafe', text: '#2563eb' },
  offboarding: { bg: '#ede9fe', text: '#7c3aed' },
};

function TypePill({ type }: { type: string }) {
  const colours = TYPE_COLOURS[type as ChecklistType] ?? { bg: 'var(--color-grey-1)', text: 'var(--color-text-secondary)' };
  return (
    <span
      className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium"
      style={{ backgroundColor: colours.bg, color: colours.text }}
    >
      {type}
    </span>
  );
}


function ProgressBar({ completed, total }: { completed: number; total: number }) {
  const pct = total === 0 ? 0 : Math.round((completed / total) * 100);
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-2 rounded-full overflow-hidden" style={{ backgroundColor: 'var(--color-border)' }}>
        <div
          className="h-full rounded-full transition-colors duration-300"
          style={{ width: `${pct}%`, backgroundColor: '#16a34a' }}
        />
      </div>
      <span className="text-xs whitespace-nowrap" style={{ color: 'var(--color-text-secondary)' }}>
        {completed}/{total} ({pct}%)
      </span>
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  backgroundColor: 'var(--color-surface)',
  borderColor: 'var(--color-border)',
  color: 'var(--color-text)',
};

export function OnboardingPage() {
  const workspace = useWorkspaceStore((s) => s.currentWorkspace);
  const user = useAuthStore((s) => s.user);

  const [tab, setTab] = useState<Tab>('templates');
  const [templates, setTemplates] = useState<OnboardingTemplate[]>([]);
  const [checklists, setChecklists] = useState<OnboardingChecklist[]>([]);
  const [members, setMembers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [tmplName, setTmplName] = useState('');
  const [tmplType, setTmplType] = useState<ChecklistType>('onboarding');
  const [tmplDescription, setTmplDescription] = useState('');
  const [tmplItems, setTmplItems] = useState<NewTemplateItem[]>([]);

  const [expandedTemplateId, setExpandedTemplateId] = useState<string | null>(null);

  const [showChecklistModal, setShowChecklistModal] = useState(false);
  const [clUserId, setClUserId] = useState('');
  const [clTemplateId, setClTemplateId] = useState('');

  const [expandedChecklistId, setExpandedChecklistId] = useState<string | null>(null);

  useEffect(() => {
    if (!workspace) return;
    setLoading(true);
    Promise.all([
      onboardingApi.listTemplates(workspace.id).then((res) => setTemplates(res.data)),
      onboardingApi.listChecklists(workspace.id).then((res) => setChecklists(res.data)),
      membersApi.list(workspace.id).then((res) => setMembers(res.data)),
    ]).catch((err) => console.error('Failed to load onboarding data:', err))
      .finally(() => setLoading(false));
  }, [workspace]);

  const getMemberName = (userId: string): string => {
    const m = members.find((u) => u.id === userId);
    return m?.name ?? 'Unknown';
  };

  const handleCreateTemplate = async () => {
    if (!workspace || !tmplName.trim()) return;
    try {
      const { data } = await onboardingApi.createTemplate(workspace.id, {
        name: tmplName.trim(),
        template_type: tmplType,
        description: tmplDescription.trim() || undefined,
        items: tmplItems.map((item, i) => ({
          title: item.title,
          description: item.description || null,
          sort_order: item.sort_order || i + 1,
          default_assignee_role: item.default_assignee_role || null,
        })),
      });
      setTemplates((prev) => [...prev, data]);
      resetTemplateModal();
    } catch (err) {
      console.error('Failed to create template:', err);
    }
  };

  const handleDeleteTemplate = async (templateId: string) => {
    if (!workspace) return;
    try {
      await onboardingApi.deleteTemplate(workspace.id, templateId);
      setTemplates((prev) => prev.filter((t) => t.id !== templateId));
      if (expandedTemplateId === templateId) setExpandedTemplateId(null);
    } catch (err) {
      console.error('Failed to delete template:', err);
    }
  };

  const resetTemplateModal = () => {
    setShowTemplateModal(false);
    setTmplName('');
    setTmplType('onboarding');
    setTmplDescription('');
    setTmplItems([]);
  };

  const addTemplateItem = () => {
    setTmplItems((prev) => [
      ...prev,
      { title: '', description: '', sort_order: prev.length + 1, default_assignee_role: '' },
    ]);
  };

  const updateTemplateItem = (index: number, field: keyof NewTemplateItem, value: string | number) => {
    setTmplItems((prev) => prev.map((item, i) => (i === index ? { ...item, [field]: value } : item)));
  };

  const removeTemplateItem = (index: number) => {
    setTmplItems((prev) => prev.filter((_, i) => i !== index));
  };

  const handleCreateChecklist = async () => {
    if (!workspace || !clUserId) return;
    try {
      const { data } = await onboardingApi.createChecklist(workspace.id, {
        user_id: clUserId,
        template_id: clTemplateId || undefined,
      });
      setChecklists((prev) => [...prev, data]);
      resetChecklistModal();
    } catch (err) {
      console.error('Failed to create checklist:', err);
    }
  };

  const resetChecklistModal = () => {
    setShowChecklistModal(false);
    setClUserId('');
    setClTemplateId('');
  };

  const handleToggleItem = async (checklistId: string, itemId: string) => {
    if (!workspace) return;
    try {
      const { data } = await onboardingApi.toggleItem(workspace.id, checklistId, itemId);
      setChecklists((prev) => prev.map((cl) => (cl.id === data.id ? data : cl)));
    } catch (err) {
      console.error('Failed to toggle item:', err);
    }
  };

  const completedChecklists = checklists.filter((cl) => cl.status === 'completed').length;
  const activeChecklists = checklists.length - completedChecklists;
  const avgCompletion = checklists.length === 0
    ? 0
    : Math.round(
        checklists.reduce((sum, cl) => {
          const total = cl.checklist_items.length;
          const done = cl.checklist_items.filter((i) => i.completed).length;
          return sum + (total === 0 ? 0 : (done / total) * 100);
        }, 0) / checklists.length,
      );

  if (!workspace || !user) {
    return (
      <div className="flex items-center justify-center h-full" style={{ color: 'var(--color-text-secondary)' }}>
        Select a workspace to continue
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b" style={{ borderColor: 'var(--color-border)' }}>
        <div className="flex items-center gap-3">
          <ClipboardList size={24} style={{ color: 'var(--color-text-secondary)' }} />
          <h1 className="text-xl font-semibold" style={{ color: 'var(--color-text)' }}>Onboarding &amp; Offboarding</h1>
        </div>
        <div className="flex items-center gap-1 rounded-lg p-0.5" style={{ backgroundColor: 'var(--color-grey-1)' }}>
          <button
            onClick={() => setTab('templates')}
            className="px-4 py-1.5 text-sm font-medium rounded-md transition-colors"
            style={{
              backgroundColor: tab === 'templates' ? 'var(--color-surface)' : 'transparent',
              color: tab === 'templates' ? 'var(--color-text)' : 'var(--color-text-secondary)',
              boxShadow: tab === 'templates' ? '0 1px 2px rgba(0,0,0,0.05)' : 'none',
            }}
          >
            Templates
          </button>
          <button
            onClick={() => setTab('checklists')}
            className="px-4 py-1.5 text-sm font-medium rounded-md transition-colors"
            style={{
              backgroundColor: tab === 'checklists' ? 'var(--color-surface)' : 'transparent',
              color: tab === 'checklists' ? 'var(--color-text)' : 'var(--color-text-secondary)',
              boxShadow: tab === 'checklists' ? '0 1px 2px rgba(0,0,0,0.05)' : 'none',
            }}
          >
            Active Checklists
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6">
        {/* Stat Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <StatCard label="Active Checklists" value={activeChecklists} icon={<ClipboardCheck size={20} />} colour={COLOURS.blue} />
          <StatCard label="Completed" value={completedChecklists} icon={<CheckCircle size={20} />} colour={COLOURS.green} />
          <StatCard label="Templates" value={templates.length} icon={<FileText size={20} />} colour={COLOURS.purple} />
          <StatCard label="Avg Completion" value={avgCompletion + '%'} icon={<TrendingUp size={20} />} colour={COLOURS.teal} />
        </div>

        {/* Overall Progress Ring */}
        {checklists.length > 0 && (
          <div className="rounded-xl border p-5 mb-6 flex items-center gap-6" style={{ backgroundColor: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
            <ProgressRing value={avgCompletion} size={80} colour={COLOURS.teal} label="Overall" />
            <div>
              <h3 className="text-sm font-semibold" style={{ color: 'var(--color-text)' }}>Overall Completion</h3>
              <p className="text-xs mt-1" style={{ color: 'var(--color-text-secondary)' }}>{completedChecklists} of {checklists.length} checklists fully complete</p>
            </div>
          </div>
        )}
        {loading ? (
          <div className="flex items-center justify-center h-40">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2" style={{ borderColor: 'var(--color-primary)' }} />
          </div>
        ) : tab === 'templates' ? (
          <div className="space-y-4">
            <div className="flex justify-end">
              <button
                onClick={() => setShowTemplateModal(true)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-white rounded-lg transition-colors"
                style={{ backgroundColor: 'var(--color-primary)' }}
              >
                <Plus size={16} />
                New Template
              </button>
            </div>

            {templates.length === 0 ? (
              <div className="text-center py-16" style={{ color: 'var(--color-text-secondary)' }}>
                <ClipboardList size={48} className="mx-auto mb-3 opacity-40" />
                <p>No templates yet. Create one to get started.</p>
              </div>
            ) : (
              <div className="grid gap-3">
                {templates.map((tmpl) => (
                  <div
                    key={tmpl.id}
                    className="border rounded-lg p-4 hover:shadow-sm transition-shadow"
                    style={{ backgroundColor: 'var(--color-surface)', borderColor: 'var(--color-border)' }}
                  >
                    <div className="flex items-start justify-between">
                      <button
                        className="flex-1 text-left"
                        onClick={() => setExpandedTemplateId(expandedTemplateId === tmpl.id ? null : tmpl.id)}
                      >
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-medium" style={{ color: 'var(--color-text)' }}>{tmpl.name}</span>
                          <TypePill type={tmpl.template_type} />
                        </div>
                        {tmpl.description && (
                          <p className="text-sm line-clamp-1" style={{ color: 'var(--color-text-secondary)' }}>{tmpl.description}</p>
                        )}
                        <p className="text-xs mt-1" style={{ color: 'var(--color-text-secondary)' }}>
                          {tmpl.items.length} item{tmpl.items.length !== 1 && 's'}
                        </p>
                      </button>
                      <button
                        onClick={() => handleDeleteTemplate(tmpl.id)}
                        className="p-1.5 transition-colors rounded hover:bg-muted"
                        style={{ color: 'var(--color-text-secondary)' }}
                        title="Delete template"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>

                    {expandedTemplateId === tmpl.id && tmpl.items.length > 0 && (
                      <div className="mt-3 pt-3 border-t" style={{ borderColor: 'var(--color-border)' }}>
                        <ol className="space-y-2">
                          {[...tmpl.items]
                            .sort((a, b) => a.sort_order - b.sort_order)
                            .map((item, idx) => (
                              <li key={item.id} className="flex items-start gap-2 text-sm">
                                <span className="font-mono text-xs mt-0.5 w-5 text-right shrink-0" style={{ color: 'var(--color-text-secondary)' }}>
                                  {idx + 1}.
                                </span>
                                <div>
                                  <span style={{ color: 'var(--color-text)' }}>{item.title}</span>
                                  {item.default_assignee_role && (
                                    <span className="ml-2 text-xs" style={{ color: 'var(--color-text-secondary)' }}>
                                      ({item.default_assignee_role})
                                    </span>
                                  )}
                                  {item.description && (
                                    <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-secondary)' }}>{item.description}</p>
                                  )}
                                </div>
                              </li>
                            ))}
                        </ol>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex justify-end">
              <button
                onClick={() => setShowChecklistModal(true)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-white rounded-lg transition-colors"
                style={{ backgroundColor: 'var(--color-primary)' }}
              >
                <UserPlus size={16} />
                Start Checklist
              </button>
            </div>

            {checklists.length === 0 ? (
              <div className="text-center py-16" style={{ color: 'var(--color-text-secondary)' }}>
                <Check size={48} className="mx-auto mb-3 opacity-40" />
                <p>No active checklists. Start one from a template.</p>
              </div>
            ) : (
              <div className="grid gap-3">
                {checklists.map((cl) => {
                  const totalItems = cl.checklist_items.length;
                  const completedItems = cl.checklist_items.filter((i) => i.completed).length;
                  const isExpanded = expandedChecklistId === cl.id;
                  const isComplete = cl.status === 'completed';

                  return (
                    <div
                      key={cl.id}
                      className="border rounded-lg p-4 hover:shadow-sm transition-shadow"
                      style={{
                        backgroundColor: 'var(--color-surface)',
                        borderColor: isComplete ? '#86efac' : 'var(--color-border)',
                      }}
                    >
                      <button
                        className="w-full text-left"
                        onClick={() => setExpandedChecklistId(isExpanded ? null : cl.id)}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <span className="font-medium" style={{ color: 'var(--color-text)' }}>
                              {getMemberName(cl.user_id)}
                            </span>
                            <TypePill type={cl.checklist_type} />
                            <StatusBadge status={cl.status} />
                          </div>
                        </div>
                        <ProgressBar completed={completedItems} total={totalItems} />
                        <div className="w-full h-1.5 rounded-full mt-2" style={{ backgroundColor: 'var(--color-grey-2)' }}>
                          <div className="h-full rounded-full" style={{ width: `${totalItems === 0 ? 0 : Math.round((completedItems / totalItems) * 100)}%`, backgroundColor: COLOURS.teal }} />
                        </div>
                      </button>

                      {isExpanded && (
                        <div className="mt-3 pt-3 border-t" style={{ borderColor: 'var(--color-border)' }}>
                          <ol className="space-y-1.5">
                            {[...cl.checklist_items]
                              .sort((a, b) => a.sort_order - b.sort_order)
                              .map((item) => (
                                <li key={item.id} className="flex items-start gap-2">
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleToggleItem(cl.id, item.id);
                                    }}
                                    className="mt-0.5 shrink-0 transition-colors"
                                    style={{ color: item.completed ? '#16a34a' : 'var(--color-text-secondary)' }}
                                    title={item.completed ? 'Mark incomplete' : 'Mark complete'}
                                  >
                                    {item.completed ? (
                                      <CheckSquare size={16} />
                                    ) : (
                                      <Square size={16} />
                                    )}
                                  </button>
                                  <div>
                                    <span
                                      className="text-sm"
                                      style={{
                                        color: item.completed ? 'var(--color-text-secondary)' : 'var(--color-text)',
                                        textDecoration: item.completed ? 'line-through' : 'none',
                                      }}
                                    >
                                      {item.title}
                                    </span>
                                    {item.description && (
                                      <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-secondary)' }}>
                                        {item.description}
                                      </p>
                                    )}
                                  </div>
                                </li>
                              ))}
                          </ol>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Create Template Modal */}
      {showTemplateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="rounded-xl shadow-xl w-full max-w-lg max-h-[85vh] overflow-y-auto p-6" style={{ backgroundColor: 'var(--color-surface)' }}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold" style={{ color: 'var(--color-text)' }}>New Template</h2>
              <button onClick={resetTemplateModal} className="p-1 rounded hover:bg-muted" style={{ color: 'var(--color-text-secondary)' }}>
                <X size={18} />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium mb-1" style={{ color: 'var(--color-text-secondary)' }}>Name</label>
                <input type="text" value={tmplName} onChange={(e) => setTmplName(e.target.value)} className="w-full px-3 py-1.5 border rounded-lg text-sm focus:outline-none focus:ring-2" style={{ ...inputStyle, '--tw-ring-color': 'var(--color-primary)' } as React.CSSProperties} placeholder="e.g. Standard Onboarding" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1" style={{ color: 'var(--color-text-secondary)' }}>Type</label>
                <select value={tmplType} onChange={(e) => setTmplType(e.target.value as ChecklistType)} className="w-full px-3 py-1.5 border rounded-lg text-sm" style={inputStyle}>
                  <option value="onboarding">Onboarding</option>
                  <option value="offboarding">Offboarding</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1" style={{ color: 'var(--color-text-secondary)' }}>Description</label>
                <textarea value={tmplDescription} onChange={(e) => setTmplDescription(e.target.value)} rows={2} className="w-full px-3 py-1.5 border rounded-lg text-sm resize-none" style={inputStyle} placeholder="Optional description..." />
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm font-medium" style={{ color: 'var(--color-text-secondary)' }}>Checklist Items</label>
                  <button onClick={addTemplateItem} className="inline-flex items-center gap-1 text-xs" style={{ color: 'var(--color-primary)' }}>
                    <Plus size={12} /> Add Item
                  </button>
                </div>

                {tmplItems.length === 0 ? (
                  <p className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>No items yet. Add some above.</p>
                ) : (
                  <div className="space-y-3">
                    {tmplItems.map((item, idx) => (
                      <div key={idx} className="border rounded-lg p-3 space-y-2" style={{ borderColor: 'var(--color-border)' }}>
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-medium" style={{ color: 'var(--color-text-secondary)' }}>Item {idx + 1}</span>
                          <button onClick={() => removeTemplateItem(idx)} style={{ color: '#ef4444' }}>
                            <Trash2 size={14} />
                          </button>
                        </div>
                        <input type="text" value={item.title} onChange={(e) => updateTemplateItem(idx, 'title', e.target.value)} className="w-full px-2 py-1 border rounded text-sm" style={inputStyle} placeholder="Item title" />
                        <input type="text" value={item.description} onChange={(e) => updateTemplateItem(idx, 'description', e.target.value)} className="w-full px-2 py-1 border rounded text-sm" style={inputStyle} placeholder="Description (optional)" />
                        <div className="flex gap-2">
                          <input type="number" value={item.sort_order} onChange={(e) => updateTemplateItem(idx, 'sort_order', parseInt(e.target.value, 10) || 0)} className="w-20 px-2 py-1 border rounded text-sm" style={inputStyle} placeholder="Order" min={1} />
                          <LookupSelect category="onboarding_assignee_role" value={item.default_assignee_role} onChange={(v) => updateTemplateItem(idx, 'default_assignee_role', v)} placeholder="Select role..." className="flex-1 px-2 py-1 border rounded text-sm" style={inputStyle} />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="flex justify-end gap-2 mt-5">
              <button onClick={resetTemplateModal} className="px-4 py-1.5 text-sm transition-colors" style={{ color: 'var(--color-text-secondary)' }}>Cancel</button>
              <button onClick={handleCreateTemplate} disabled={!tmplName.trim()} className="px-4 py-1.5 text-sm font-medium text-white rounded-lg disabled:opacity-50 transition-colors" style={{ backgroundColor: 'var(--color-primary)' }}>Create Template</button>
            </div>
          </div>
        </div>
      )}

      {/* Start Checklist Modal */}
      {showChecklistModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="rounded-xl shadow-xl w-full max-w-md p-6" style={{ backgroundColor: 'var(--color-surface)' }}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold" style={{ color: 'var(--color-text)' }}>Start Checklist</h2>
              <button onClick={resetChecklistModal} className="p-1 rounded hover:bg-muted" style={{ color: 'var(--color-text-secondary)' }}>
                <X size={18} />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium mb-1" style={{ color: 'var(--color-text-secondary)' }}>Person</label>
                <select value={clUserId} onChange={(e) => setClUserId(e.target.value)} className="w-full px-3 py-1.5 border rounded-lg text-sm" style={inputStyle}>
                  <option value="">Select a person...</option>
                  {members.map((m) => <option key={m.id} value={m.id}>{m.name} {m.email ? `(${m.email})` : ''}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1" style={{ color: 'var(--color-text-secondary)' }}>Template (optional)</label>
                <select value={clTemplateId} onChange={(e) => setClTemplateId(e.target.value)} className="w-full px-3 py-1.5 border rounded-lg text-sm" style={inputStyle}>
                  <option value="">No template - blank checklist</option>
                  {templates.map((t) => <option key={t.id} value={t.id}>{t.name} ({t.template_type})</option>)}
                </select>
              </div>
            </div>

            <div className="flex justify-end gap-2 mt-5">
              <button onClick={resetChecklistModal} className="px-4 py-1.5 text-sm transition-colors" style={{ color: 'var(--color-text-secondary)' }}>Cancel</button>
              <button onClick={handleCreateChecklist} disabled={!clUserId} className="px-4 py-1.5 text-sm font-medium text-white rounded-lg disabled:opacity-50 transition-colors" style={{ backgroundColor: 'var(--color-primary)' }}>Start Checklist</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
