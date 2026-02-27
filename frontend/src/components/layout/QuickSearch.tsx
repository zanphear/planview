import { useState, useEffect, useRef, useCallback } from 'react';
import { Search, X, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { tasksApi, type Task } from '../../api/tasks';
import { membersApi } from '../../api/users';
import { useWorkspaceStore } from '../../stores/workspaceStore';
import { useProjectStore } from '../../stores/projectStore';
import { useTeamStore } from '../../stores/teamStore';

interface SearchResult {
  type: 'task' | 'project' | 'team' | 'member';
  id: string;
  name: string;
  meta?: string;
  link: string;
}

export function QuickSearch() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [selectedIdx, setSelectedIdx] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();
  const workspace = useWorkspaceStore((s) => s.currentWorkspace);
  const projects = useProjectStore((s) => s.projects);
  const teams = useTeamStore((s) => s.teams);

  // Open with Cmd+K / Ctrl+K
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setOpen(true);
      }
      if (e.key === 'Escape') {
        setOpen(false);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  useEffect(() => {
    if (open) {
      inputRef.current?.focus();
      setQuery('');
      setResults([]);
    }
  }, [open]);

  const search = useCallback(
    async (q: string) => {
      if (!workspace || !q.trim()) {
        setResults([]);
        return;
      }

      const lowerQ = q.toLowerCase();
      const matched: SearchResult[] = [];

      // Search projects locally
      projects
        .filter((p) => p.name.toLowerCase().includes(lowerQ))
        .slice(0, 3)
        .forEach((p) => {
          matched.push({ type: 'project', id: p.id, name: p.name, link: `/projects/${p.id}/board` });
        });

      // Search teams locally
      teams
        .filter((t) => t.name.toLowerCase().includes(lowerQ))
        .slice(0, 3)
        .forEach((t) => {
          matched.push({ type: 'team', id: t.id, name: t.name, link: `/teams/${t.id}` });
        });

      // Search members via API
      try {
        const { data: memberData } = await membersApi.list(workspace.id);
        memberData
          .filter((m) => m.name.toLowerCase().includes(lowerQ) || m.email?.toLowerCase().includes(lowerQ))
          .slice(0, 3)
          .forEach((m) => {
            matched.push({ type: 'member', id: m.id, name: m.name, meta: m.email || undefined, link: '/settings' });
          });
      } catch {
        // Ignore
      }

      // Search tasks via API
      try {
        const { data } = await tasksApi.list(workspace.id, { search: q });
        (data as Task[]).slice(0, 5).forEach((t) => {
          matched.push({
            type: 'task',
            id: t.id,
            name: t.name,
            meta: t.project?.name,
            link: `/projects/${t.project_id}/board`,
          });
        });
      } catch {
        // Ignore search errors
      }

      setResults(matched);
      setSelectedIdx(0);
    },
    [workspace, projects, teams]
  );

  useEffect(() => {
    const timer = setTimeout(() => search(query), 200);
    return () => clearTimeout(timer);
  }, [query, search]);

  const handleSelect = (result: SearchResult) => {
    setOpen(false);
    navigate(result.link);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIdx((i) => Math.min(i + 1, results.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIdx((i) => Math.max(i - 1, 0));
    } else if (e.key === 'Enter' && results[selectedIdx]) {
      handleSelect(results[selectedIdx]);
    }
  };

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[200] flex items-start justify-center pt-[15vh]"
      onClick={() => setOpen(false)}
    >
      <div className="absolute inset-0 bg-black/30" />
      <div
        className="relative rounded-xl shadow-2xl w-full max-w-lg overflow-hidden border"
        style={{ backgroundColor: 'var(--color-surface)', borderColor: 'var(--color-border)' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-3 px-4 py-3 border-b" style={{ borderColor: 'var(--color-border)' }}>
          <Search size={18} style={{ color: 'var(--color-text-secondary)' }} />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Search tasks, projects, teams..."
            className="flex-1 text-sm outline-none bg-transparent"
            style={{ color: 'var(--color-text)' }}
          />
          <button onClick={() => setOpen(false)} style={{ color: 'var(--color-text-secondary)' }} className="hover:opacity-80">
            <X size={16} />
          </button>
        </div>

        {results.length > 0 && (
          <div className="max-h-80 overflow-y-auto py-2">
            {results.map((r, idx) => (
              <button
                key={`${r.type}-${r.id}`}
                onClick={() => handleSelect(r)}
                className="w-full text-left px-4 py-2.5 flex items-center gap-3 text-sm hover:opacity-90"
                style={{
                  backgroundColor: idx === selectedIdx ? 'var(--color-primary-light)' : undefined,
                }}
              >
                <span className="text-[10px] font-medium uppercase w-14" style={{ color: 'var(--color-text-secondary)' }}>
                  {r.type}
                </span>
                <span className="flex-1 truncate" style={{ color: 'var(--color-text)' }}>{r.name}</span>
                {r.meta && <span className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>{r.meta}</span>}
                <ArrowRight size={14} style={{ color: 'var(--color-text-secondary)' }} />
              </button>
            ))}
          </div>
        )}

        {query && results.length === 0 && (
          <div className="px-4 py-8 text-center text-sm" style={{ color: 'var(--color-text-secondary)' }}>No results found</div>
        )}

        <div className="px-4 py-2 border-t text-[11px] flex gap-4" style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-secondary)' }}>
          <span><kbd className="px-1 py-0.5 rounded text-[10px]" style={{ backgroundColor: 'var(--color-grey-2)' }}>↑↓</kbd> Navigate</span>
          <span><kbd className="px-1 py-0.5 rounded text-[10px]" style={{ backgroundColor: 'var(--color-grey-2)' }}>↵</kbd> Select</span>
          <span><kbd className="px-1 py-0.5 rounded text-[10px]" style={{ backgroundColor: 'var(--color-grey-2)' }}>Esc</kbd> Close</span>
        </div>
      </div>
    </div>
  );
}
