import { useEffect, useState } from 'react';
import { dependenciesApi, type TaskDependency } from '../../api/dependencies';
import { useWorkspaceStore } from '../../stores/workspaceStore';
import type { Task } from '../../api/tasks';

interface DependencyArrowsProps {
  tasks: Task[];
  getTaskPosition: (taskId: string) => { x: number; y: number; width: number; height: number } | null;
  scrollLeft: number;
  scrollTop: number;
}

export function DependencyArrows({ tasks, getTaskPosition, scrollLeft, scrollTop }: DependencyArrowsProps) {
  const workspace = useWorkspaceStore((s) => s.currentWorkspace);
  const [deps, setDeps] = useState<TaskDependency[]>([]);

  useEffect(() => {
    if (!workspace) return;
    dependenciesApi.list(workspace.id).then((res) => setDeps(res.data)).catch(() => {});
  }, [workspace, tasks]);

  if (deps.length === 0) return null;

  const taskIds = new Set(tasks.map((t) => t.id));
  const visibleDeps = deps.filter(
    (d) => taskIds.has(d.blocker_id) && taskIds.has(d.blocked_id)
  );

  if (visibleDeps.length === 0) return null;

  const arrows = visibleDeps
    .map((dep) => {
      const from = getTaskPosition(dep.blocker_id);
      const to = getTaskPosition(dep.blocked_id);
      if (!from || !to) return null;

      const startX = from.x + from.width - scrollLeft;
      const startY = from.y + from.height / 2 - scrollTop;
      const endX = to.x - scrollLeft;
      const endY = to.y + to.height / 2 - scrollTop;

      // S-curve path
      const midX = startX + (endX - startX) / 2;
      const path = `M ${startX} ${startY} C ${midX} ${startY}, ${midX} ${endY}, ${endX} ${endY}`;

      return { id: dep.id, path, endX, endY };
    })
    .filter(Boolean) as { id: string; path: string; endX: number; endY: number }[];

  return (
    <svg
      className="absolute inset-0 pointer-events-none"
      style={{ overflow: 'visible', zIndex: 5 }}
    >
      <defs>
        <marker
          id="arrowhead"
          markerWidth="8"
          markerHeight="6"
          refX="8"
          refY="3"
          orient="auto"
        >
          <polygon
            points="0 0, 8 3, 0 6"
            fill="var(--color-danger, #ef4444)"
            fillOpacity="0.7"
          />
        </marker>
      </defs>
      {arrows.map((arrow) => (
        <path
          key={arrow.id}
          d={arrow.path}
          fill="none"
          stroke="var(--color-danger, #ef4444)"
          strokeWidth="1.5"
          strokeOpacity="0.5"
          markerEnd="url(#arrowhead)"
        />
      ))}
    </svg>
  );
}
