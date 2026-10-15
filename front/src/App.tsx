import { lazy, Suspense } from 'react';
import { createBrowserRouter, createRoutesFromElements, RouterProvider, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'sonner';
import { AuthProvider } from './contexts/AuthContext';
import { ApiError } from './lib/api';
import AppLayout from './components/AppLayout';
import { FullPageLoader, RequireAuth, RequireRole } from './components/RouteGuards';

// Chaque écran est chargé à la demande : le lecteur de séance et ses exercices ne pèsent que lorsqu'on s'en sert
const DashboardPage = lazy(() => import('./pages/DashboardPage'));
const PatientsPage = lazy(() => import('./pages/PatientsPage'));
const PatientDetailPage = lazy(() => import('./pages/PatientDetailPage'));
const SessionsPage = lazy(() => import('./pages/SessionsPage'));
const NewSessionPage = lazy(() => import('./pages/NewSessionPage'));
const TrainingSessionPage = lazy(() => import('./pages/TrainingSessionPage'));
const ContentAdminPage = lazy(() => import('./pages/ContentAdminPage'));
const CourseEditorPage = lazy(() => import('./pages/CourseEditorPage'));
const CourseLibraryPage = lazy(() => import('./pages/CourseLibraryPage'));
const ParcoursPage = lazy(() => import('./pages/ParcoursPage'));
const ResultsPage = lazy(() => import('./pages/ResultsPage'));
const CenterDetailPage = lazy(() => import('./pages/CenterDetailPage'));
const AdminPage = lazy(() => import('./pages/AdminPage'));
const AccountPage = lazy(() => import('./pages/AccountPage'));
const CodexTestPage = lazy(() => import('./pages/CodexTestPage'));
import LoginPage from './pages/LoginPage';
import './App.css';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60,
      // Inutile de réessayer un refus d'accès ou un élément introuvable
      retry: (failureCount, error) => !(error instanceof ApiError && error.status < 500) && failureCount < 1,
    },
  },
});

const router = createBrowserRouter(createRoutesFromElements(<>
            <Route path="/login" element={<LoginPage />} />
            <Route element={<RequireAuth />}>
              <Route path="/sessions/run" element={<TrainingSessionPage />} />
              <Route path="/patients/:id/codex" element={<CodexTestPage />} />
              <Route element={<AppLayout />}>
                <Route path="/" element={<Navigate to="/dashboard" replace />} />
                <Route path="/dashboard" element={<DashboardPage />} />
                <Route path="/patients" element={<PatientsPage />} />
                <Route path="/patients/:id" element={<PatientDetailPage />} />
                <Route path="/parcours" element={<ParcoursPage />} />
                <Route path="/sessions" element={<SessionsPage />} />
                <Route path="/sessions/new" element={<NewSessionPage />} />
                <Route path="/courses" element={<CourseLibraryPage />} />
                <Route path="/results" element={<ResultsPage />} />
                <Route path="/account" element={<AccountPage />} />
                <Route path="/settings" element={<Navigate to="/account" replace />} />
                <Route element={<RequireRole level="cadre" />}>
                  <Route path="/admin" element={<Navigate to="/admin/users" replace />} />
                  <Route path="/admin/users" element={<AdminPage />} />
                  <Route path="/admin/accounts" element={<Navigate to="/admin/users" replace />} />
                </Route>
                <Route element={<RequireRole level="admin" />}>
                  <Route path="/admin/centers/:id" element={<CenterDetailPage />} />
                  <Route path="/admin/centers" element={<AdminPage section="centers" />} />
                  <Route path="/admin/security" element={<AdminPage section="security" />} />
                  <Route path="/admin/access-logs" element={<AdminPage section="logs" />} />
                  <Route path="/modules" element={<ContentAdminPage />} />
                  <Route path="/modules/:code/edit" element={<CourseEditorPage />} />
                </Route>
              </Route>
            </Route>
</>));

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <Suspense fallback={<FullPageLoader />}>
          <RouterProvider router={router} />
        </Suspense>
        <Toaster position="top-right" richColors />
      </AuthProvider>
    </QueryClientProvider>
  );
}
