import { useWorkspaceStore } from '../../stores/workspaceStore';

export function WorkspaceSwitcher() {
  const workspaces = useWorkspaceStore((s) => s.workspaces);
  const current = useWorkspaceStore((s) => s.currentWorkspace);
  const setCurrent = useWorkspaceStore((s) => s.setCurrentWorkspace);

  if (workspaces.length <= 1) return null;

  return (
    <div className="p-2">
      {workspaces.map((ws) => (
        <button
          key={ws.id}
          onClick={() => setCurrent(ws)}
          className={`w-full text-left px-3 py-2 rounded text-sm ${
            ws.id === current?.id ? 'bg-white/10 text-white' : 'hover:bg-white/5'
          }`}
        >
          {ws.name}
        </button>
      ))}
    </div>
  );
}
