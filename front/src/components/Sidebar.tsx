import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { cn } from '../lib/utils';
import { ROLE_LABELS } from '../api/types';
import {
  LayoutDashboard,
  Users,
  BarChart2,
  Settings,
  Activity,
  UserCog,
  Building2,
  GraduationCap,
  LogOut,
  ChevronRight,
  Route,
  Library,
  type LucideIcon,
} from 'lucide-react';
import { Avatar, AvatarFallback } from './ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from './ui/dropdown-menu';
import { Badge } from './ui/badge';

interface NavItem {
  to: string;
  icon: LucideIcon;
  label: string;
}

const navItems: NavItem[] = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Tableau de bord' },
  { to: '/patients', icon: Users, label: 'Patients' },
  { to: '/parcours', icon: Route, label: 'Parcours' },
  { to: '/sessions', icon: Activity, label: 'Séances' },
  { to: '/courses', icon: Library, label: 'Bibliothèque' },
  { to: '/results', icon: BarChart2, label: 'Résultats' },
  { to: '/settings', icon: Settings, label: 'Paramètres' },
];

function NavEntry({ to, icon: Icon, label, onNavigate }: NavItem & { onNavigate?: () => void }) {
  return (
    <NavLink
      to={to}
      onClick={onNavigate}
      className={({ isActive }) =>
        cn(
          'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150',
          isActive ? 'bg-orange-50 text-orange-600' : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
        )
      }
    >
      {({ isActive }) => (
        <>
          <Icon className={cn('w-5 h-5 flex-shrink-0', isActive ? 'text-orange-500' : 'text-gray-400')} />
          <span className="flex-1">{label}</span>
          {isActive && <ChevronRight className="w-4 h-4 text-orange-400" />}
        </>
      )}
    </NavLink>
  );
}

export default function Sidebar({ onNavigate, drawer = false }: { onNavigate?: () => void; drawer?: boolean }) {
  const { user, isCadre, isAdmin, logout } = useAuth();
  const navigate = useNavigate();

  const adminItems: NavItem[] = [
    ...(isCadre ? [{ to: '/admin/accounts', icon: UserCog, label: 'Comptes' }] : []),
    ...(isAdmin ? [{ to: '/admin/centers', icon: Building2, label: 'Centres' }, { to: '/modules', icon: GraduationCap, label: 'Contenus des séances' }] : []),
  ];

  // Quitter d'abord les pages protégées : sinon la page en cours serait mémorisée comme destination
  // et la personne suivante (tablette partagée) y serait renvoyée après sa connexion
  const handleLogout = async () => {
    navigate('/login', { replace: true });
    await logout();
  };

  const initials = user ? `${user.firstName[0] ?? ''}${user.lastName[0] ?? ''}`.toUpperCase() : '';
  const centersLabel = user?.role === 'admin_national' ? 'Tous les centres' : user?.centers.map((c) => c.name).join(', ');

  return (
    <aside className={cn("flex flex-col bg-white border-r border-gray-100 shadow-sm", drawer ? "h-full w-full" : "fixed inset-y-0 left-0 z-40 hidden xl:flex w-64")}>
      <div className="flex items-center gap-3 px-6 py-5 pr-14 border-b border-gray-100">
        <div className="flex items-center justify-center w-9 h-9 bg-orange-500 rounded-xl shadow-sm shadow-orange-200">
          <GraduationCap className="w-5 h-5 text-white" />
        </div>
        <div>
          <span className="font-bold text-diaverum-green text-base leading-tight block">Diaverum</span>
          <span className="text-xs text-orange-500 font-medium">Programme d'entraînement</span>
        </div>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {navItems.map((item) => <NavEntry key={item.to} {...item} onNavigate={onNavigate} />)}

        {adminItems.length > 0 && (
          <>
            <div className="px-3 pt-4 pb-2">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Administration</p>
            </div>
            {adminItems.map((item) => <NavEntry key={item.to} {...item} onNavigate={onNavigate} />)}
          </>
        )}
      </nav>

      <div className="px-3 py-4 border-t border-gray-100">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-gray-50 transition-colors text-left">
              <Avatar className="w-9 h-9 flex-shrink-0">
                <AvatarFallback className="bg-orange-100 text-orange-700 text-sm font-semibold">{initials}</AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-gray-900 truncate">{user?.firstName} {user?.lastName}</p>
                {user && (
                  <Badge
                    variant="secondary"
                    className={cn('text-xs px-1.5 py-0 h-4', isCadre ? 'bg-orange-100 text-orange-700' : 'bg-blue-100 text-blue-700')}
                  >
                    {ROLE_LABELS[user.role]}
                  </Badge>
                )}
              </div>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <div className="px-2 py-1.5">
              <p className="text-xs text-gray-500">{user?.email}</p>
              <p className="text-xs text-gray-400">{centersLabel}</p>
            </div>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleLogout} className="text-red-600 focus:text-red-600 cursor-pointer">
              <LogOut className="w-4 h-4 mr-2" />
              Se déconnecter
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </aside>
  );
}
