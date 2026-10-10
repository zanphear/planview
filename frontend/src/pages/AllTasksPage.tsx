import { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { ListTodo, AlertTriangle, Search } from 'lucide-react';
import { useWorkspaceStore } from '../stores/workspaceStore';
import { useWorkspaceTasks, useSetTaskProject, useBulkSetTaskProject } from '../api/queries/tasks';
import { useProjects } from '../api/queries/projects';
import type { Task } from '../api/tasks';
import { StatusBadge } from '../components/shared/StatusBadge';
import { LoadingSpinner } from '../components/shared/LoadingSpinner';
import { EmptyState } from '../components/shared/EmptyState';

const UNASSIGNED = '__none__';

function Assignees({ task }: { task: Task }) {
  if (task.assignees.length === 0)
    return <span className="text-xs text-muted-foreground">Unassigned</span>;
  return (
    <div className="flex -space-x-1.5">
      {task.assignees.slice(0, 4).map((a) => (
        <span
          key={a.id}
          title={a.name}
          className="inline-flex h-6 w-6 items-center justify-center rounded-full text-[10px] font-semibold text-white ring-2 ring-card"
          style={{ backgroundColor: a.colour }}
        >
          {a.initials}
        </span>
      ))}
      {task.assignees.length > 4 && (
        <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-muted text-[10px] font-medium text-muted-foreground ring-2 ring-card">
          +{task.assignees.length - 4}
        </span>
      )}
    </div>
  );
}

export function AllTasksPage() {
  const workspace = useWorkspaceStore((s) => s.currentWorkspace);
  const tasksQuery = useWorkspaceTasks(workspace?.id);
  const projectsQuery = useProjects(workspace?.id);
  const setProject = useSetTaskProject(workspace?.id);
  const bulkSetProject = useBulkSetTaskProject(workspace?.id);

  const [params, setParams] = useSearchParams();
  const search = params.get('q') ?? '';
  const statusFilter = params.get('status') ?? '';
  const projectFilter = params.get('project') ?? '';
  const setParam = (k: string, v: string) => {
    setParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        if (v) next.set(k, v);
        else next.delete(k);
        return next;
      },
      { replace: true },
    );
  };

  const [selected, setSelected] = useState<Set<string>>(new Set());
  const toggle = (id: string) =>
    setSelected((s) => {
      const n = new Set(s);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });

  const projects = projectsQuery.data ?? [];
  const tasks = tasksQuery.data ?? [];

  const statuses = useMemo(() => [...new Set(tasks.map((t) => t.status))].sort(), [tasks]);

  const filtered = useMemo(() => {
    return tasks.filter((t) => {
      if (search && !t.name.toLowerCase().includes(search.toLowerCase())) return false;
      if (statusFilter && t.status !== statusFilter) return false;
      if (projectFilter === UNASSIGNED && t.project_id) return false;
      if (projectFilter && projectFilter !== UNASSIGNED && t.project_id !== projectFilter)
        return false;
      return true;
    });
  }, [tasks, search, statusFilter, projectFilter]);

  // Group by project, Unassigned pinned to the top.
  const groups = useMemo(() => {
    const byProject = new Map<string, Task[]>();
    for (const t of filtered) {
      const key = t.project_id ?? UNASSIGNED;
      if (!byProject.has(key)) byProject.set(key, []);
      byProject.get(key)!.push(t);
    }
    const ordered: { id: string; label: string; colour: string | null; tasks: Task[] }[] = [];
    const orphans = byProject.get(UNASSIGNED);
    if (orphans?.length)
      ordered.push({
        id: UNASSIGNED,
        label: 'Unassigned (no project)',
        colour: null,
        tasks: orphans,
      });
    for (const p of projects) {
      const ts = byProject.get(p.id);
      if (ts?.length) ordered.push({ id: p.id, label: p.name, colour: p.colour, tasks: ts });
    }
    return ordered;
  }, [filtered, projects]);

  const moveSelected = (projectId: string | null) => {
    if (selected.size === 0) return;
    bulkSetProject.mutate(
      { taskIds: [...selected], projectId },
      { onSuccess: () => setSelected(new Set()) },
    );
  };

  const fmtDate = (d: string | null) =>
    d ? new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) : '';

  const renderBody = () => {
    if (tasksQuery.isPending || projectsQuery.isPending) return <LoadingSpinner fullPage />;
    if (tasksQuery.isError)
      return (
        <div className="flex flex-col items-center gap-3 py-16 text-muted-foreground">
          <AlertTriangle size={32} />
          <p>Couldn't load tasks.</p>
          <button
            onClick={() => tasksQuery.refetch()}
            disabled={tasksQuery.isFetching}
            className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white"
          >
            Retry
          </button>
        </div>
      );
    if (tasks.length === 0)
      return (
        <EmptyState
          icon={<ListTodo size={32} className="text-muted-foreground" />}
          title="No tasks yet"
          description="Tasks you create, with or without a project, will all appear here."
        />
      );
    if (filtered.length === 0)
      return (
        <p className="py-16 text-center text-sm text-muted-foreground">
          No tasks match your filters.
        </p>
      );

    return (
      <div className="space-y-6">
        {groups.map((g) => (
          <div key={g.id} className="overflow-hidden rounded-xl border border-outline bg-card">
            <div className="flex items-center gap-2 border-b border-outline bg-muted/40 px-4 py-2.5">
              {g.colour && (
                <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: g.colour }} />
              )}
              <span className="text-sm font-semibold text-foreground">{g.label}</span>
              <span className="text-xs text-muted-foreground">{g.tasks.length}</span>
            </div>
            <table className="w-full text-sm">
              <tbody>
                {g.tasks.map((t) => (
                  <tr
                    key={t.id}
                    className="border-b border-outline/60 last:border-0 hover:bg-muted/30"
                  >
                    <td className="w-10 pl-4">
                      <input
                        type="checkbox"
                        checked={selected.has(t.id)}
                        onChange={() => toggle(t.id)}
                        aria-label={`Select ${t.name}`}
                      />
                    </td>
                    <td className="py-2.5 pr-4 font-medium text-foreground">{t.name}</td>
                    <td className="py-2.5 pr-4">
                      <select
                        value={t.project_id ?? ''}
                        onChange={(e) =>
                          setProject.mutate({ taskId: t.id, projectId: e.target.value || null })
                        }
                        className="rounded-md border border-outline bg-background px-2 py-1 text-xs text-foreground"
                        aria-label={`Project for ${t.name}`}
                      >
                        <option value="">No project</option>
                        {projects.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.name}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="py-2.5 pr-4">
                      <Assignees task={t} />
                    </td>
                    <td className="py-2.5 pr-4">
                      <StatusBadge status={t.status} />
                    </td>
                    <td className="whitespace-nowrap py-2.5 pr-4 text-xs text-muted-foreground">
                      {fmtDate(t.date_from)}
                      {t.date_to && t.date_to !== t.date_from ? ` - ${fmtDate(t.date_to)}` : ''}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="mx-auto max-w-6xl space-y-5 p-6">
      <div className="flex items-center gap-3">
        <ListTodo size={22} className="text-accent" />
        <h1 className="text-2xl font-bold text-foreground">All Tasks</h1>
        <span className="text-sm text-muted-foreground">{tasks.length} total</span>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative">
          <Search
            size={15}
            className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground"
          />
          <input
            value={search}
            onChange={(e) => setParam('q', e.target.value)}
            placeholder="Search tasks"
            className="rounded-lg border border-outline bg-card py-1.5 pl-8 pr-3 text-sm text-foreground"
          />
        </div>
        <select
          value={projectFilter}
          onChange={(e) => setParam('project', e.target.value)}
          className="rounded-lg border border-outline bg-card px-2.5 py-1.5 text-sm text-foreground"
        >
          <option value="">All projects</option>
          <option value={UNASSIGNED}>No project</option>
          {projects.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
        <select
          value={statusFilter}
          onChange={(e) => setParam('status', e.target.value)}
          className="rounded-lg border border-outline bg-card px-2.5 py-1.5 text-sm text-foreground"
        >
          <option value="">All statuses</option>
          {statuses.map((s) => (
            <option key={s} value={s}>
              {s.replace(/_/g, ' ')}
            </option>
          ))}
        </select>
      </div>

      {selected.size > 0 && (
        <div className="flex flex-wrap items-center gap-2 rounded-lg border border-outline bg-card px-4 py-2.5">
          <span className="text-sm font-medium text-foreground">{selected.size} selected</span>
          <span className="text-sm text-muted-foreground">Move to</span>
          <select
            defaultValue=""
            onChange={(e) => {
              if (e.target.value)
                moveSelected(e.target.value === UNASSIGNED ? null : e.target.value);
              e.target.value = '';
            }}
            disabled={bulkSetProject.isPending}
            className="rounded-md border border-outline bg-background px-2 py-1 text-sm text-foreground"
          >
            <option value="" disabled>
              Choose project
            </option>
            <option value={UNASSIGNED}>No project (unassign)</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
          <button
            onClick={() => setSelected(new Set())}
            className="ml-auto text-sm text-muted-foreground hover:text-foreground"
          >
            Clear
          </button>
        </div>
      )}

      {renderBody()}
    </div>
  );
}
