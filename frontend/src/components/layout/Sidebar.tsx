import { useState } from 'react';
import { Users, FolderKanban, Star, Settings, User, ChevronDown, Plus, LayoutGrid, Calendar } from 'lucide-react';
import { NavLink, useLocation } from 'react-router-dom';
import { useUIStore } from '../../stores/uiStore';
import { useWorkspaceStore } from '../../stores/workspaceStore';
import { useTeamStore } from '../../stores/teamStore';
import { useProjectStore } from '../../stores/projectStore';
import { teamsApi } from '../../api/teams';
import { projectsApi } from '../../api/projects';

export function Sidebar() {
  const collapsed = useUIStore((s) => s.sidebarCollapsed);
  const workspace = useWorkspaceStore((s) => s.currentWorkspace);
  const teams = useTeamStore((s) => s.teams);
  const addTeam = useTeamStore((s) => s.addTeam);
  const projects = useProjectStore((s) => s.projects);
  const addProject = useProjectStore((s) => s.addProject);
  const location = useLocation();

  const [creatingTeam, setCreatingTeam] = useState(false);
  const [newTeamName, setNewTeamName] = useState('');
  const [creatingProject, setCreatingProject] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');

  if (collapsed) return null;

  const favouriteTeams = teams.filter((t) => t.is_favourite);
  const favouriteProjects = projects.filter((p) => p.is_favourite);

  const handleCreateTeam = async () => {
    if (!workspace || !newTeamName.trim()) return;
    try {
      const { data } = await teamsApi.create(workspace.id, { name: newTeamName.trim() });
      addTeam(data);
      setNewTeamName('');
      setCreatingTeam(false);
    } catch (err) {
      console.error('Failed to create team:', err);
    }
  };

  const handleCreateProject = async () => {
    if (!workspace || !newProjectName.trim()) return;
    try {
      const { data } = await projectsApi.create(workspace.id, { name: newProjectName.trim() });
      addProject(data);
      setNewProjectName('');
      setCreatingProject(false);
    } catch (err) {
      console.error('Failed to create project:', err);
    }
  };

  return (
    <aside className="w-60 bg-[#1e1e2e] text-[#cdd6f4] flex flex-col shrink-0 overflow-y-auto">
      {/* Workspace switcher */}
      <div className="px-4 py-3 border-b border-white/10">
        <button className="flex items-center gap-2 w-full hover:bg-white/5 rounded px-2 py-1.5">
          <span className="font-semibold text-sm truncate">{workspace?.name || 'Workspace'}</span>
          <ChevronDown size={14} className="ml-auto opacity-60" />
        </button>
      </div>

      {/* My Work */}
      <nav className="px-2 py-2">
        <NavLink
          to="/my-work"
          className={({ isActive }) =>
            `flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm ${isActive ? 'bg-white/10 text-white' : 'hover:bg-white/5'}`
          }
        >
          <User size={16} />
          My Work
        </NavLink>
      </nav>

      {/* Favourites */}
      {(favouriteTeams.length > 0 || favouriteProjects.length > 0) && (
        <div className="px-2 py-1">
          <div className="px-3 py-1.5 text-xs uppercase tracking-wider text-white/40 flex items-center gap-1.5">
            <Star size={12} />
            Favourites
          </div>
          {favouriteTeams.map((team) => (
            <NavLink
              key={team.id}
              to={`/teams/${team.id}`}
              className="flex items-center gap-2.5 px-3 py-1.5 rounded-lg text-sm hover:bg-white/5"
            >
              {team.name}
            </NavLink>
          ))}
          {favouriteProjects.map((project) => (
            <NavLink
              key={project.id}
              to={`/projects/${project.id}/board`}
              className="flex items-center gap-2.5 px-3 py-1.5 rounded-lg text-sm hover:bg-white/5"
            >
              <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: project.colour }} />
              {project.name}
            </NavLink>
          ))}
        </div>
      )}

      {/* Teams */}
      <div className="px-2 py-1">
        <div className="px-3 py-1.5 text-xs uppercase tracking-wider text-white/40 flex items-center gap-1.5">
          <Users size={12} />
          Teams
          <button
            onClick={() => setCreatingTeam(true)}
            className="ml-auto opacity-40 hover:opacity-100 transition-opacity"
            title="Create team"
          >
            <Plus size={12} />
          </button>
        </div>
        {teams.map((team) => (
          <NavLink
            key={team.id}
            to={`/teams/${team.id}`}
            className={({ isActive }) =>
              `flex items-center gap-2.5 px-3 py-1.5 rounded-lg text-sm ${isActive ? 'bg-white/10 text-white' : 'hover:bg-white/5'}`
            }
          >
            {team.name}
          </NavLink>
        ))}
        {creatingTeam && (
          <div className="px-2 py-1">
            <input
              autoFocus
              value={newTeamName}
              onChange={(e) => setNewTeamName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleCreateTeam();
                if (e.key === 'Escape') { setCreatingTeam(false); setNewTeamName(''); }
              }}
              onBlur={() => { setCreatingTeam(false); setNewTeamName(''); }}
              placeholder="Team name..."
              className="w-full px-2 py-1 text-sm bg-white/10 rounded border border-white/20 outline-none text-white placeholder-white/40"
            />
          </div>
        )}
      </div>

      {/* Projects */}
      <div className="px-2 py-1 flex-1">
        <div className="px-3 py-1.5 text-xs uppercase tracking-wider text-white/40 flex items-center gap-1.5">
          <FolderKanban size={12} />
          Projects
          <button
            onClick={() => setCreatingProject(true)}
            className="ml-auto opacity-40 hover:opacity-100 transition-opacity"
            title="Create project"
          >
            <Plus size={12} />
          </button>
        </div>
        {projects.map((project) => {
          const isBoardActive = location.pathname === `/projects/${project.id}/board`;
          const isTimelineActive = location.pathname === `/projects/${project.id}/timeline`;
          const isProjectActive = isBoardActive || isTimelineActive;

          return (
            <div
              key={project.id}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm group ${isProjectActive ? 'bg-white/10 text-white' : 'hover:bg-white/5'}`}
            >
              <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: project.colour }} />
              <NavLink
                to={`/projects/${project.id}/board`}
                className="truncate flex-1"
              >
                {project.name}
              </NavLink>
              <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                <NavLink
                  to={`/projects/${project.id}/board`}
                  className={`p-1 rounded ${isBoardActive ? 'text-white bg-white/10' : 'hover:bg-white/10 text-white/50'}`}
                  title="Board view"
                >
                  <LayoutGrid size={12} />
                </NavLink>
                <NavLink
                  to={`/projects/${project.id}/timeline`}
                  className={`p-1 rounded ${isTimelineActive ? 'text-white bg-white/10' : 'hover:bg-white/10 text-white/50'}`}
                  title="Timeline view"
                >
                  <Calendar size={12} />
                </NavLink>
              </div>
            </div>
          );
        })}
        {creatingProject && (
          <div className="px-2 py-1">
            <input
              autoFocus
              value={newProjectName}
              onChange={(e) => setNewProjectName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleCreateProject();
                if (e.key === 'Escape') { setCreatingProject(false); setNewProjectName(''); }
              }}
              onBlur={() => { setCreatingProject(false); setNewProjectName(''); }}
              placeholder="Project name..."
              className="w-full px-2 py-1 text-sm bg-white/10 rounded border border-white/20 outline-none text-white placeholder-white/40"
            />
          </div>
        )}
      </div>

      {/* Settings */}
      <div className="px-2 py-2 border-t border-white/10">
        <NavLink
          to="/settings"
          className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm hover:bg-white/5"
        >
          <Settings size={16} />
          Settings
        </NavLink>
      </div>
    </aside>
  );
}
