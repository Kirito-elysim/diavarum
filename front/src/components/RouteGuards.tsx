import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export function FullPageLoader() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-white">
      <div className="flex flex-col items-center gap-3">
        <div className="w-8 h-8 border-[3px] border-orange-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-gray-500 text-sm">Chargement…</p>
      </div>
    </div>
  );
}

/** Routes réservées aux utilisateurs connectés (redirige vers /login en gardant la destination) */
export function RequireAuth() {
  const { user, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) return <FullPageLoader />;
  if (!user) return <Navigate to="/login" replace state={{ from: location }} />;

  return <Outlet />;
}

/** Routes réservées aux cadres (et administrateurs nationaux) ou aux seuls administrateurs */
export function RequireRole({ level }: { level: 'cadre' | 'admin' }) {
  const { isCadre, isAdmin } = useAuth();
  const allowed = level === 'admin' ? isAdmin : isCadre;

  return allowed ? <Outlet /> : <Navigate to="/dashboard" replace />;
}
