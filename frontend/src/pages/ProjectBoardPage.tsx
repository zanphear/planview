import { useEffect, useState, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { Plus } from 'lucide-react';
import { Board } from '../components/board/Board';
import { TaskDetail } from '../components/task/TaskDetail';
import { useWorkspaceStore } from '../stores/workspaceStore';
import { useTaskStore } from '../stores/taskStore';
import { useProjectStore } from '../stores/projectStore';
import { tasksApi, type Task } from '../api/tasks';
import { membersApi, type User } from '../api/users';

export function ProjectBoardPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const workspace = useWorkspaceStore((s) => s.currentWorkspace);
  const tasks = useTaskStore((s) => s.tasks);
  const fetchTasks = useTaskStore((s) => s.fetchTasks);
  const addTask = useTaskStore((s) => s.addTask);
  const projects = useProjectStore((s) => s.projects);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [members, setMembers] = useState<User[]>([]);
  const [newTaskName, setNewTaskName] = useState('');

  const project = projects.find((p) => p.id === projectId);

  useEffect(() => {
    if (workspace && projectId) {
      fetchTasks(workspace.id, { project_id: projectId });
      membersApi.list(workspace.id).then((res) => setMembers(res.data));
    }
  }, [workspace, projectId, fetchTasks]);

  const handleCreateTask = useCallback(async () => {
    if (!workspace || !projectId || !newTaskName.trim()) return;
    const { data } = await tasksApi.create(workspace.id, {
      name: newTaskName.trim(),
      project_id: projectId,
      status: 'todo',
    });
    addTask(data);
    setNewTaskName('');
  }, [workspace, projectId, newTaskName, addTask]);

  const handleTaskClick = useCallback(
    (task: Task) => {
      // Refresh from store to get latest
      const latest = tasks.find((t) => t.id === task.id) || task;
      setSelectedTask(latest);
    },
    [tasks]
  );

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          {project && (
            <>
              <div className="w-4 h-4 rounded" style={{ backgroundColor: project.colour }} />
              <h2 className="text-xl font-semibold">{project.name}</h2>
            </>
          )}
        </div>

        {/* Quick add */}
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={newTaskName}
            onChange={(e) => setNewTaskName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleCreateTask()}
            placeholder="New task..."
            className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 w-60"
          />
          <button
            onClick={handleCreateTask}
            disabled={!newTaskName.trim()}
            className="flex items-center gap-1 px-3 py-1.5 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
          >
            <Plus size={16} />
            Add
          </button>
        </div>
      </div>

      {/* Board */}
      <div className="flex-1 overflow-hidden">
        <Board tasks={tasks} onTaskClick={handleTaskClick} />
      </div>

      {/* Task detail panel */}
      {selectedTask && (
        <TaskDetail
          task={selectedTask}
          members={members}
          onClose={() => setSelectedTask(null)}
        />
      )}
    </div>
  );
}
