import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
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
const CourseLibraryPage = lazy(() => import('./pages/CourseLibraryPage'));
const ParcoursPage = lazy(() => import('./pages/ParcoursPage'));
const ResultsPage = lazy(() => import('./pages/ResultsPage'));
const AdminPage = lazy(() => import('./pages/AdminPage'));
const SettingsPage = lazy(() => import('./pages/SettingsPage'));
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

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <BrowserRouter>
          <Suspense fallback={<FullPageLoader />}>
          <Routes>
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
                <Route path="/settings" element={<SettingsPage />} />
                <Route element={<RequireRole level="cadre" />}>
                  <Route path="/admin" element={<AdminPage />} />
                </Route>
                <Route element={<RequireRole level="admin" />}>
                  <Route path="/modules" element={<ContentAdminPage />} />
                </Route>
              </Route>
            </Route>
          </Routes>
          </Suspense>
        </BrowserRouter>
        <Toaster position="top-right" richColors />
      </AuthProvider>
    </QueryClientProvider>
  );
}
