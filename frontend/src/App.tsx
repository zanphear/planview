import { BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { Suspense, lazy, useEffect, useMemo, useState } from 'react';
import { useAuthStore } from './stores/authStore';
import { useWorkspaceStore } from './stores/workspaceStore';
import { useTeamStore } from './stores/teamStore';
import { useProjectStore } from './stores/projectStore';
import { useUIStore } from './stores/uiStore';
import { useNotificationStore } from './stores/notificationStore';
import { WebSocketProvider, useWSEvent } from './hooks/WebSocketContext';
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts';
import { Sidebar } from './components/layout/Sidebar';
import { TopBar } from './components/layout/TopBar';
import { QuickSearch } from './components/layout/QuickSearch';
import { Taskbox } from './components/taskbox/Taskbox';
import { KeyboardShortcutsHelp } from './components/shared/KeyboardShortcutsHelp';
import { Toast } from './components/shared/Toast';
import { ErrorBoundary } from './components/shared/ErrorBoundary';
import { LoadingSpinner } from './components/shared/LoadingSpinner';

// Every route is lazy-loaded (forbidden-27: no eager page imports in the router).
const LoginPage = lazy(() => import('./pages/LoginPage').then(m => ({ default: m.LoginPage })));
const ProjectBoardPage = lazy(() => import('./pages/ProjectBoardPage').then(m => ({ default: m.ProjectBoardPage })));
const TeamTimelinePage = lazy(() => import('./pages/TeamTimelinePage').then(m => ({ default: m.TeamTimelinePage })));
const ProjectTimelinePage = lazy(() => import('./pages/ProjectTimelinePage').then(m => ({ default: m.ProjectTimelinePage })));
const MyWorkPage = lazy(() => import('./pages/MyWorkPage').then(m => ({ default: m.MyWorkPage })));
const SettingsPage = lazy(() => import('./pages/SettingsPage').then(m => ({ default: m.SettingsPage })));
const SharedTimelinePage = lazy(() => import('./pages/SharedTimelinePage').then(m => ({ default: m.SharedTimelinePage })));
const DashboardPage = lazy(() => import('./pages/DashboardPage').then(m => ({ default: m.DashboardPage })));
const ActivityPage = lazy(() => import('./pages/ActivityPage').then(m => ({ default: m.ActivityPage })));
const CalendarPage = lazy(() => import('./pages/CalendarPage').then(m => ({ default: m.CalendarPage })));
const BurndownPage = lazy(() => import('./pages/BurndownPage').then(m => ({ default: m.BurndownPage })));
const RotaPage = lazy(() => import('./pages/RotaPage').then(m => ({ default: m.RotaPage })));
const PeoplePage = lazy(() => import('./pages/PeoplePage').then(m => ({ default: m.PeoplePage })));
const OneToOnesPage = lazy(() => import('./pages/OneToOnesPage').then(m => ({ default: m.OneToOnesPage })));
const ObjectivesPage = lazy(() => import('./pages/ObjectivesPage').then(m => ({ default: m.ObjectivesPage })));
const CompliancePage = lazy(() => import('./pages/CompliancePage').then(m => ({ default: m.CompliancePage })));
const CompetenciesPage = lazy(() => import('./pages/CompetenciesPage').then(m => ({ default: m.CompetenciesPage })));
const LeavePage = lazy(() => import('./pages/LeavePage').then(m => ({ default: m.LeavePage })));
const RecruitmentPage = lazy(() => import('./pages/RecruitmentPage').then(m => ({ default: m.RecruitmentPage })));
const DevelopmentPage = lazy(() => import('./pages/DevelopmentPage').then(m => ({ default: m.DevelopmentPage })));
const ReviewsPage = lazy(() => import('./pages/ReviewsPage').then(m => ({ default: m.ReviewsPage })));
const WellbeingPage = lazy(() => import('./pages/WellbeingPage').then(m => ({ default: m.WellbeingPage })));
const OnboardingPage = lazy(() => import('./pages/OnboardingPage').then(m => ({ default: m.OnboardingPage })));
const ReportingPage = lazy(() => import('./pages/ReportingPage').then(m => ({ default: m.ReportingPage })));
const GuidePage = lazy(() => import('./pages/GuidePage').then(m => ({ default: m.GuidePage })));
const AIAssistantPage = lazy(() => import('./pages/AIAssistantPage').then(m => ({ default: m.AIAssistantPage })));
const AnalysisReportsPage = lazy(() => import('./pages/AnalysisReportsPage').then(m => ({ default: m.AnalysisReportsPage })));
const EarlyTalentPage = lazy(() => import('./pages/EarlyTalentPage').then(m => ({ default: m.EarlyTalentPage })));
const OIDCCallbackPage = lazy(() => import('./pages/OIDCCallbackPage').then(m => ({ default: m.OIDCCallbackPage })));
const AbsenceCalendarPage = lazy(() => import('./pages/AbsenceCalendarPage').then(m => ({ default: m.AbsenceCalendarPage })));
const ResourcePage = lazy(() => import('./pages/ResourcePage').then(m => ({ default: m.ResourcePage })));

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
            <Suspense fallback={<LoadingSpinner fullPage />}>
              <Outlet />
            </Suspense>
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
        <Route path="/login" element={<Suspense fallback={<LoadingSpinner fullPage />}><LoginPage /></Suspense>} />
        <Route path="/auth/oidc/callback" element={<Suspense fallback={<LoadingSpinner fullPage />}><OIDCCallbackPage /></Suspense>} />
        <Route path="/shared/:token" element={<Suspense fallback={<LoadingSpinner fullPage />}><SharedTimelinePage /></Suspense>} />
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
          <Route path="people" element={<PeoplePage />} />
          <Route path="people/:userId" element={<PeoplePage />} />
          <Route path="one-to-ones" element={<OneToOnesPage />} />
          <Route path="objectives" element={<ObjectivesPage />} />
          <Route path="compliance" element={<CompliancePage />} />
          <Route path="competencies" element={<CompetenciesPage />} />
          <Route path="leave" element={<LeavePage />} />
          <Route path="recruitment" element={<RecruitmentPage />} />
          <Route path="development" element={<DevelopmentPage />} />
          <Route path="reviews" element={<ReviewsPage />} />
          <Route path="wellbeing" element={<WellbeingPage />} />
          <Route path="onboarding" element={<OnboardingPage />} />
          <Route path="reporting" element={<ReportingPage />} />
          <Route path="guide" element={<GuidePage />} />
          <Route path="ai" element={<AIAssistantPage />} />
          <Route path="analysis" element={<AnalysisReportsPage />} />
          <Route path="early-talent" element={<EarlyTalentPage />} />
          <Route path="absences" element={<AbsenceCalendarPage />} />
          <Route path="resources" element={<ResourcePage />} />
          <Route path="settings" element={<SettingsPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
