import { useState } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Alert, AlertDescription } from '../components/ui/alert';
import { Loader2, Activity, AlertCircle } from 'lucide-react';
import { ApiError } from '../lib/api';

/**
 * Comptes des données de démonstration (make fixtures, app:demo:load) : affichés en développement,
 * et sur une recette en ligne construite avec VITE_DEMO_ACCOUNTS=true (jamais en production réelle).
 */
const SHOW_DEMO_ACCOUNTS = import.meta.env.DEV || import.meta.env.VITE_DEMO_ACCOUNTS === 'true';
const DEMO_ACCOUNTS = [
  { label: 'Administrateur national', email: 'admin@diaverum.test' },
  { label: 'Cadre (Paris)', email: 'cadre@diaverum.test' },
  { label: 'IDE (Paris)', email: 'ide@diaverum.test' },
  { label: 'IDE (Lyon)', email: 'ide.lyon@diaverum.test' },
];
const DEMO_PASSWORD = 'Diaverum2026!';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { login, user, isLoading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as { from?: { pathname: string } } | null)?.from?.pathname ?? '/dashboard';

  if (!isLoading && user) return <Navigate to={from} replace />;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);
    try {
      await login(email, password);
      navigate(from, { replace: true });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Connexion impossible, vérifiez votre réseau.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-orange-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-orange-500 rounded-2xl mb-4 shadow-lg shadow-orange-200">
            <Activity className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-diaverum-green tracking-tight">Diaverum</h1>
          <p className="text-gray-500 mt-1">Parcours d'entraînement des patients</p>
        </div>

        <Card className="shadow-xl border-0 ring-1 ring-gray-100">
          <CardHeader className="pb-4">
            <CardTitle className="text-xl text-gray-900">Connexion</CardTitle>
            <CardDescription className="text-gray-500">
              Accédez à votre espace soignant
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-5">
              {error && (
                <Alert variant="destructive" className="border-red-200 bg-red-50">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <div className="space-y-2">
                <Label htmlFor="email" className="text-gray-700 font-medium">
                  Adresse email
                </Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="votre@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoComplete="email"
                  className="h-12 text-base border-gray-200 focus:border-orange-500 focus:ring-orange-500"
                />
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password" className="text-gray-700 font-medium">
                    Mot de passe
                  </Label>
                </div>
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoComplete="current-password"
                  className="h-12 text-base border-gray-200 focus:border-orange-500 focus:ring-orange-500"
                />
              </div>

              <Button
                type="submit"
                disabled={isSubmitting}
                className="w-full h-12 text-base font-semibold bg-orange-500 hover:bg-orange-600 text-white shadow-md shadow-orange-200 transition-all"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Connexion en cours…
                  </>
                ) : (
                  'Se connecter'
                )}
              </Button>
            </form>

            {SHOW_DEMO_ACCOUNTS && (
              <div className="mt-6 pt-6 border-t border-gray-100">
                <p className="text-xs text-gray-400 text-center">Comptes de démonstration ({import.meta.env.DEV ? 'développement' : 'recette'})</p>
                <div className="mt-3 space-y-2">
                  {DEMO_ACCOUNTS.map((account) => (
                    <DemoAccount
                      key={account.email}
                      label={account.label}
                      email={account.email}
                      onUse={() => {
                        setEmail(account.email);
                        setPassword(DEMO_PASSWORD);
                      }}
                    />
                  ))}
                </div>
                <p className="text-xs text-gray-400 text-center mt-3">Mot de passe : {DEMO_PASSWORD}</p>
              </div>
            )}
          </CardContent>
        </Card>

        <p className="text-center text-xs text-gray-400 mt-6">
          © {new Date().getFullYear()} Diaverum — Accès réservé aux équipes soignantes
        </p>
      </div>
    </div>
  );
}

function DemoAccount({ label, email, onUse }: { label: string; email: string; onUse: () => void }) {
  return (
    <button
      type="button"
      onClick={onUse}
      className="w-full flex items-center justify-between px-3 py-2 rounded-lg bg-gray-50 hover:bg-orange-50 border border-gray-100 hover:border-orange-200 transition-colors text-left"
    >
      <span className="text-xs font-medium text-gray-700">{label}</span>
      <span className="text-xs text-gray-400 font-mono">{email}</span>
    </button>
  );
}
