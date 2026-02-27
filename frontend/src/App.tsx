import { BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { useEffect, useMemo } from 'react';
import { useAuthStore } from './stores/authStore';
import { useWorkspaceStore } from './stores/workspaceStore';
import { useTeamStore } from './stores/teamStore';
import { useProjectStore } from './stores/projectStore';
import { useUIStore } from './stores/uiStore';
import { useNotificationStore } from './stores/notificationStore';
import { useWebSocket } from './hooks/useWebSocket';
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts';
import { LoginPage } from './pages/LoginPage';
import { ProjectBoardPage } from './pages/ProjectBoardPage';
import { TeamTimelinePage } from './pages/TeamTimelinePage';
import { ProjectTimelinePage } from './pages/ProjectTimelinePage';
import { MyWorkPage } from './pages/MyWorkPage';
import { SettingsPage } from './pages/SettingsPage';
import { SharedTimelinePage } from './pages/SharedTimelinePage';
import { Sidebar } from './components/layout/Sidebar';
import { TopBar } from './components/layout/TopBar';
import { QuickSearch } from './components/layout/QuickSearch';
import { Toast } from './components/shared/Toast';

function ProtectedLayout() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const user = useAuthStore((s) => s.user);
  const fetchMe = useAuthStore((s) => s.fetchMe);
  const fetchWorkspaces = useWorkspaceStore((s) => s.fetchWorkspaces);
  const currentWorkspace = useWorkspaceStore((s) => s.currentWorkspace);
  const fetchTeams = useTeamStore((s) => s.fetchTeams);
  const fetchProjects = useProjectStore((s) => s.fetchProjects);
  const setZoom = useUIStore((s) => s.setZoomLevel);
  const toggleSidebar = useUIStore((s) => s.toggleSidebar);
  const incrementUnread = useNotificationStore((s) => s.incrementUnread);

  // Global keyboard shortcuts
  const shortcuts = useMemo(() => ({
    'w': () => setZoom('W'),
    'm': () => setZoom('M'),
    'q': () => setZoom('Q'),
    'a': () => setZoom('A'),
    'mod+b': () => toggleSidebar(),
  }), [setZoom, toggleSidebar]);
  useKeyboardShortcuts(shortcuts);

  // WebSocket connection for the current workspace
  const { on } = useWebSocket(currentWorkspace?.id);

  useEffect(() => {
    if (isAuthenticated && !user) {
      fetchMe();
    }
  }, [isAuthenticated, user, fetchMe]);

  useEffect(() => {
    if (user) {
      fetchWorkspaces();
    }
  }, [user, fetchWorkspaces]);

  useEffect(() => {
    if (currentWorkspace) {
      fetchTeams(currentWorkspace.id);
      fetchProjects(currentWorkspace.id);
    }
  }, [currentWorkspace, fetchTeams, fetchProjects]);

  // Listen for real-time notification events
  useEffect(() => {
    const unsub = on('notification.new', (data) => {
      if (data.user_id === user?.id) {
        incrementUnread();
        Toast.show(data.title as string);
      }
    });
    return unsub;
  }, [on, user, incrementUnread]);

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return (
    <div className="flex h-screen w-screen overflow-hidden">
      <Sidebar />
      <div className="flex flex-col flex-1 overflow-hidden">
        <TopBar />
        <main className="flex-1 overflow-auto bg-gray-50 p-6">
          <Outlet />
        </main>
      </div>
      <QuickSearch />
    </div>
  );
}

function DashboardPage() {
  return (
    <div className="text-gray-500">
      <h2 className="text-xl font-semibold text-gray-800 mb-2">Welcome to Planview</h2>
      <p>Select a team or project from the sidebar to get started.</p>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/shared/:token" element={<SharedTimelinePage />} />
        <Route path="/" element={<ProtectedLayout />}>
          <Route index element={<DashboardPage />} />
          <Route path="my-work" element={<MyWorkPage />} />
          <Route path="teams/:teamId" element={<TeamTimelinePage />} />
          <Route path="projects/:projectId/board" element={<ProjectBoardPage />} />
          <Route path="projects/:projectId/timeline" element={<ProjectTimelinePage />} />
          <Route path="settings" element={<SettingsPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
