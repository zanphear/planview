import { BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { useEffect, useMemo, useState } from 'react';
import { useAuthStore } from './stores/authStore';
import { useWorkspaceStore } from './stores/workspaceStore';
import { useTeamStore } from './stores/teamStore';
import { useProjectStore } from './stores/projectStore';
import { useUIStore } from './stores/uiStore';
import { useNotificationStore } from './stores/notificationStore';
import { WebSocketProvider, useWSEvent } from './hooks/WebSocketContext';
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts';
import { LoginPage } from './pages/LoginPage';
import { ProjectBoardPage } from './pages/ProjectBoardPage';
import { TeamTimelinePage } from './pages/TeamTimelinePage';
import { ProjectTimelinePage } from './pages/ProjectTimelinePage';
import { MyWorkPage } from './pages/MyWorkPage';
import { SettingsPage } from './pages/SettingsPage';
import { SharedTimelinePage } from './pages/SharedTimelinePage';
import { DashboardPage } from './pages/DashboardPage';
import { ActivityPage } from './pages/ActivityPage';
import { CalendarPage } from './pages/CalendarPage';
import { BurndownPage } from './pages/BurndownPage';
import { RotaPage } from './pages/RotaPage';
import { Sidebar } from './components/layout/Sidebar';
import { TopBar } from './components/layout/TopBar';
import { QuickSearch } from './components/layout/QuickSearch';
import { Taskbox } from './components/taskbox/Taskbox';
import { KeyboardShortcutsHelp } from './components/shared/KeyboardShortcutsHelp';
import { Toast } from './components/shared/Toast';
import { ErrorBoundary } from './components/shared/ErrorBoundary';

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
  const setTaskboxOpen = useUIStore((s) => s.setTaskboxOpen);
  const incrementUnread = useNotificationStore((s) => s.incrementUnread);
  const [showShortcuts, setShowShortcuts] = useState(false);

  // Global keyboard shortcuts
  const shortcuts = useMemo(() => ({
    'w': () => setZoom('W'),
    'm': () => setZoom('M'),
    'q': () => setZoom('Q'),
    'a': () => setZoom('A'),
    'mod+b': () => toggleSidebar(),
    'n': () => setTaskboxOpen(true),
    '?': () => setShowShortcuts((s) => !s),
  }), [setZoom, toggleSidebar, setTaskboxOpen]);
  useKeyboardShortcuts(shortcuts);

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
  useWSEvent('notification.new', (data) => {
    if (data.user_id === user?.id) {
      incrementUnread();
      Toast.show(data.title as string);
    }
  }, [user, incrementUnread]);

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return (
    <div className="flex h-full w-full overflow-hidden">
      <Sidebar />
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        <TopBar />
        <main className="flex-1 overflow-auto" style={{ backgroundColor: 'var(--color-bg)' }}>
          <ErrorBoundary>
            <Outlet />
          </ErrorBoundary>
        </main>
      </div>
      <QuickSearch />
      <Taskbox />
      {showShortcuts && <KeyboardShortcutsHelp onClose={() => setShowShortcuts(false)} />}
    </div>
  );
}

export default function App() {
  const currentWorkspace = useWorkspaceStore((s) => s.currentWorkspace);

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/shared/:token" element={<SharedTimelinePage />} />
        <Route path="/" element={
          <WebSocketProvider workspaceId={currentWorkspace?.id}>
            <ProtectedLayout />
          </WebSocketProvider>
        }>
          <Route index element={<DashboardPage />} />
          <Route path="my-work" element={<MyWorkPage />} />
          <Route path="teams/:teamId" element={<TeamTimelinePage />} />
          <Route path="projects/:projectId/board" element={<ProjectBoardPage />} />
          <Route path="projects/:projectId/timeline" element={<ProjectTimelinePage />} />
          <Route path="activity" element={<ActivityPage />} />
          <Route path="calendar" element={<CalendarPage />} />
          <Route path="burndown" element={<BurndownPage />} />
          <Route path="rotas" element={<RotaPage />} />
          <Route path="settings" element={<SettingsPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
