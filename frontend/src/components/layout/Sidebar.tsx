import { useState } from 'react';
import { Users, FolderKanban, Star, Settings, User, ChevronDown, Plus, LayoutGrid, Calendar, MoreHorizontal, Activity, TrendingDown, Phone } from 'lucide-react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { useUIStore } from '../../stores/uiStore';
import { useWorkspaceStore } from '../../stores/workspaceStore';
import { useTeamStore } from '../../stores/teamStore';
import { useProjectStore } from '../../stores/projectStore';
import { teamsApi, type Team } from '../../api/teams';
import { projectsApi, type Project } from '../../api/projects';
import { ProjectEditModal } from '../modals/ProjectEditModal';
import { TeamManageModal } from '../modals/TeamManageModal';
import { Toast } from '../shared/Toast';

export function Sidebar() {
  const collapsed = useUIStore((s) => s.sidebarCollapsed);
  const workspace = useWorkspaceStore((s) => s.currentWorkspace);
  const teams = useTeamStore((s) => s.teams);
  const addTeam = useTeamStore((s) => s.addTeam);
  const updateTeam = useTeamStore((s) => s.updateTeam);
  const removeTeam = useTeamStore((s) => s.removeTeam);
  const projects = useProjectStore((s) => s.projects);
  const addProject = useProjectStore((s) => s.addProject);
  const updateProject = useProjectStore((s) => s.updateProject);
  const removeProject = useProjectStore((s) => s.removeProject);
  const location = useLocation();
  const navigate = useNavigate();

  const [creatingTeam, setCreatingTeam] = useState(false);
  const [newTeamName, setNewTeamName] = useState('');
  const [creatingProject, setCreatingProject] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [managingTeam, setManagingTeam] = useState<Team | null>(null);

  const toggleSidebar = useUIStore((s) => s.toggleSidebar);
  const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;

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

  const handleSaveProject = async (updates: Partial<Project>) => {
    if (!workspace || !editingProject) return;
    try {
      const { data } = await projectsApi.update(workspace.id, editingProject.id, updates);
      updateProject(data);
      Toast.show('Project updated');
    } catch {
      Toast.show('Failed to update project');
    }
  };

  const handleDeleteProject = async () => {
    if (!workspace || !editingProject) return;
    try {
      await projectsApi.delete(workspace.id, editingProject.id);
      removeProject(editingProject.id);
      setEditingProject(null);
      navigate('/my-work');
      Toast.show('Project deleted');
    } catch {
      Toast.show('Failed to delete project');
    }
  };

  const handleSaveTeam = async (updates: Partial<Team>) => {
    if (!workspace || !managingTeam) return;
    try {
      const { data } = await teamsApi.update(workspace.id, managingTeam.id, updates);
      updateTeam(data);
      Toast.show('Team updated');
    } catch {
      Toast.show('Failed to update team');
    }
  };

  const handleDeleteTeam = async () => {
    if (!workspace || !managingTeam) return;
    try {
      await teamsApi.delete(workspace.id, managingTeam.id);
      removeTeam(managingTeam.id);
      setManagingTeam(null);
      navigate('/my-work');
      Toast.show('Team deleted');
    } catch {
      Toast.show('Failed to delete team');
    }
  };

  const handleToggleProjectFavourite = async (project: Project, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!workspace) return;
    try {
      const { data } = await projectsApi.update(workspace.id, project.id, { is_favourite: !project.is_favourite });
      updateProject(data);
    } catch (err) {
      console.error('Failed to toggle favourite:', err);
    }
  };

  const handleToggleTeamFavourite = async (team: Team, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!workspace) return;
    try {
      const { data } = await teamsApi.update(workspace.id, team.id, { is_favourite: !team.is_favourite });
      updateTeam(data);
    } catch (err) {
      console.error('Failed to toggle favourite:', err);
    }
  };

  return (
    <>
      {/* Mobile overlay backdrop */}
      {isMobile && (
        <div className="fixed inset-0 bg-black/40 z-30" onClick={toggleSidebar} />
      )}
    <aside
      className={`${isMobile ? 'fixed inset-y-0 left-0 z-40' : ''} w-60 flex flex-col shrink-0 overflow-y-auto`}
      style={{ background: 'linear-gradient(180deg, var(--color-sidebar-bg) 0%, #2D1B4E 100%)' }}
    >
      {/* Logo + Workspace */}
      <div className="px-5 pt-5 pb-3 border-b border-white/10">
        <div className="flex justify-center mb-2">
          <img src="/logo-white.png" alt="Siemens Energy" className="h-8 opacity-90" />
        </div>
        <button className="flex items-center gap-2 w-full hover:bg-white/5 rounded px-2 py-1.5 text-[var(--color-sidebar-text)]">
          <span className="font-semibold text-sm truncate">{workspace?.name || 'Workspace'}</span>
          <ChevronDown size={14} className="ml-auto opacity-60" />
        </button>
      </div>

      {/* My Work */}
      <nav className="px-3 py-2">
        <NavLink
          to="/my-work"
          className={({ isActive }) =>
            `flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors ${
              isActive
                ? 'bg-[var(--color-sidebar-active)] text-white'
                : 'text-[var(--color-sidebar-text)] hover:bg-[var(--color-sidebar-hover)]'
            }`
          }
        >
          <User size={16} />
          My Work
        </NavLink>
        <NavLink
          to="/activity"
          className={({ isActive }) =>
            `flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors ${
              isActive
                ? 'bg-[var(--color-sidebar-active)] text-white'
                : 'text-[var(--color-sidebar-text)] hover:bg-[var(--color-sidebar-hover)]'
            }`
          }
        >
          <Activity size={16} />
          Activity
        </NavLink>
        <NavLink
          to="/calendar"
          className={({ isActive }) =>
            `flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors ${
              isActive
                ? 'bg-[var(--color-sidebar-active)] text-white'
                : 'text-[var(--color-sidebar-text)] hover:bg-[var(--color-sidebar-hover)]'
            }`
          }
        >
          <Calendar size={16} />
          Calendar
        </NavLink>
        <NavLink
          to="/burndown"
          className={({ isActive }) =>
            `flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors ${
              isActive
                ? 'bg-[var(--color-sidebar-active)] text-white'
                : 'text-[var(--color-sidebar-text)] hover:bg-[var(--color-sidebar-hover)]'
            }`
          }
        >
          <TrendingDown size={16} />
          Burndown
        </NavLink>
        <NavLink
          to="/rotas"
          className={({ isActive }) =>
            `flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors ${
              isActive
                ? 'bg-[var(--color-sidebar-active)] text-white'
                : 'text-[var(--color-sidebar-text)] hover:bg-[var(--color-sidebar-hover)]'
            }`
          }
        >
          <Phone size={16} />
          Rotas
        </NavLink>
      </nav>

      {/* Favourites */}
      {(favouriteTeams.length > 0 || favouriteProjects.length > 0) && (
        <div className="px-3 py-1">
          <div className="px-3 py-1.5 text-xs uppercase tracking-wider text-white/40 flex items-center gap-1.5">
            <Star size={12} />
            Favourites
          </div>
          {favouriteTeams.map((team) => (
            <NavLink
              key={team.id}
              to={`/teams/${team.id}`}
              className="flex items-center gap-2.5 pl-9 pr-3 py-1.5 rounded-lg text-sm text-[var(--color-sidebar-text)] hover:bg-[var(--color-sidebar-hover)]"
            >
              {team.name}
            </NavLink>
          ))}
          {favouriteProjects.map((project) => (
            <NavLink
              key={project.id}
              to={`/projects/${project.id}/board`}
              className="flex items-center gap-2.5 pl-9 pr-3 py-1.5 rounded-lg text-sm text-[var(--color-sidebar-text)] hover:bg-[var(--color-sidebar-hover)]"
            >
              <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: project.colour }} />
              {project.name}
            </NavLink>
          ))}
        </div>
      )}

      {/* Teams */}
      <div className="px-3 py-1">
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
          <div
            key={team.id}
            className="flex items-center gap-2.5 pl-9 pr-2 py-1.5 rounded-lg text-sm group transition-colors text-[var(--color-sidebar-text)] hover:bg-[var(--color-sidebar-hover)]"
          >
            <NavLink
              to={`/teams/${team.id}`}
              className="truncate flex-1"
            >
              {team.name}
            </NavLink>
            <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
              <button
                onClick={(e) => handleToggleTeamFavourite(team, e)}
                className="p-1 rounded hover:bg-white/10"
                title={team.is_favourite ? 'Remove from favourites' : 'Add to favourites'}
              >
                <Star size={12} fill={team.is_favourite ? 'currentColor' : 'none'} style={{ color: team.is_favourite ? '#f59e0b' : undefined }} />
              </button>
              <button
                onClick={(e) => { e.preventDefault(); e.stopPropagation(); setManagingTeam(team); }}
                className="p-1 rounded hover:bg-white/10"
                title="Manage team"
              >
                <MoreHorizontal size={12} />
              </button>
            </div>
          </div>
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
      <div className="px-3 py-1 flex-1">
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
              className={`flex items-center gap-2 pl-9 pr-2 py-1.5 rounded-lg text-sm group transition-colors ${
                isProjectActive
                  ? 'bg-[var(--color-sidebar-active)] text-white'
                  : 'text-[var(--color-sidebar-text)] hover:bg-[var(--color-sidebar-hover)]'
              }`}
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
                <button
                  onClick={(e) => handleToggleProjectFavourite(project, e)}
                  className="p-1 rounded hover:bg-white/10"
                  title={project.is_favourite ? 'Remove from favourites' : 'Add to favourites'}
                >
                  <Star size={12} fill={project.is_favourite ? 'currentColor' : 'none'} style={{ color: project.is_favourite ? '#f59e0b' : undefined }} />
                </button>
                <button
                  onClick={(e) => { e.preventDefault(); e.stopPropagation(); setEditingProject(project); }}
                  className="p-1 rounded hover:bg-white/10"
                  title="Edit project"
                >
                  <MoreHorizontal size={12} />
                </button>
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
      <div className="px-3 py-3 border-t border-white/10">
        <NavLink
          to="/settings"
          className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-[var(--color-sidebar-text)] hover:bg-[var(--color-sidebar-hover)] transition-colors"
        >
          <Settings size={16} />
          Settings
        </NavLink>
      </div>

      {/* Modals */}
      {editingProject && (
        <ProjectEditModal
          project={editingProject}
          onSave={handleSaveProject}
          onDelete={handleDeleteProject}
          onClose={() => setEditingProject(null)}
        />
      )}
      {managingTeam && (
        <TeamManageModal
          team={managingTeam}
          onSave={handleSaveTeam}
          onDelete={handleDeleteTeam}
          onClose={() => setManagingTeam(null)}
          onTeamUpdated={updateTeam}
        />
      )}
    </aside>
    </>
  );
}
