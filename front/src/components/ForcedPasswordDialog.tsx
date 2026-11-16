import { useState } from 'react';
import { toast } from 'sonner';
import { KeyRound, Loader2 } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useUpdateProfile } from '../api/hooks';
import { ApiError } from '../lib/api';
import { isStrongEnough, PASSWORD_MIN_LENGTH } from '../lib/password';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from './ui/dialog';

/**
 * Bloquant : mot de passe provisoire donné par un cadre ou un administrateur (création de compte ou
 * réinitialisation). La personne choisit le sien avant tout autre écran, puis se reconnecte
 * (l'API ferme les sessions lors d'un changement de mot de passe).
 */
export function ForcedPasswordDialog() {
  const { user, logout } = useAuth();
  const updateProfile = useUpdateProfile();
  const [form, setForm] = useState({ currentPassword: '', newPassword: '', confirm: '' });
  const [error, setError] = useState('');
  if (!user) return null;

  const set = (field: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) => setForm({ ...form, [field]: e.target.value });

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (form.newPassword !== form.confirm) return setError('Les deux mots de passe ne correspondent pas.');
    if (form.newPassword === form.currentPassword) return setError('Choisissez un mot de passe différent du mot de passe provisoire.');
    if (!isStrongEnough(form.newPassword)) return setError(`Mot de passe trop faible : ${PASSWORD_MIN_LENGTH} caractères minimum, avec majuscules, minuscules, chiffres et symboles.`);
    try {
      await updateProfile.mutateAsync({ firstName: user.firstName, lastName: user.lastName, email: user.email, currentPassword: form.currentPassword, newPassword: form.newPassword });
      toast.success('Mot de passe enregistré : reconnectez-vous avec votre nouveau mot de passe');
      await logout();
    } catch (err) {
      setError(err instanceof ApiError ? (err.fieldError('newPassword') ?? err.message) : 'Une erreur est survenue.');
    }
  };

  return (
    <Dialog open>
      <DialogContent className="sm:max-w-md [&>button]:hidden" onInteractOutside={(e) => e.preventDefault()} onEscapeKeyDown={(e) => e.preventDefault()}>
        <DialogHeader>
          <div className="w-11 h-11 rounded-xl bg-orange-100 flex items-center justify-center mb-2">
            <KeyRound className="w-6 h-6 text-orange-600" />
          </div>
          <DialogTitle>Choisissez votre mot de passe</DialogTitle>
          <DialogDescription>
            Le mot de passe qui vous a été remis est provisoire : seul vous devez connaître le vôtre. Vous vous reconnecterez ensuite avec celui-ci.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="fp-current">Mot de passe provisoire</Label>
            <Input id="fp-current" type="password" autoComplete="current-password" value={form.currentPassword} onChange={set('currentPassword')} required />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="fp-new">Nouveau mot de passe</Label>
              <Input id="fp-new" type="password" autoComplete="new-password" value={form.newPassword} onChange={set('newPassword')} required />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="fp-confirm">Confirmation</Label>
              <Input id="fp-confirm" type="password" autoComplete="new-password" value={form.confirm} onChange={set('confirm')} required />
            </div>
          </div>
          <p className="text-xs text-gray-400 -mt-2">{PASSWORD_MIN_LENGTH} caractères minimum, avec majuscules, minuscules, chiffres et symboles.</p>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <Button type="submit" disabled={updateProfile.isPending} className="w-full bg-orange-500 hover:bg-orange-600 text-white">
            {updateProfile.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            Enregistrer mon mot de passe
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
