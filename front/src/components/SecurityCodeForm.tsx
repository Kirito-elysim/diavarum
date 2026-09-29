import { useState } from 'react';
import { Loader2 } from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { ApiError } from '../lib/api';

/**
 * Saisie d'un code de sécurité (4 à 6 chiffres) confirmé par le mot de passe du compte.
 * Sert au code personnel de l'IDE comme au code national des administrateurs.
 */
export function SecurityCodeForm({
  submitLabel,
  onSubmit,
}: {
  submitLabel: string;
  onSubmit: (input: { password: string; code: string }) => Promise<void>;
}) {
  const [password, setPassword] = useState('');
  const [code, setCode] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const digitsOnly = (value: string) => value.replace(/\D/g, '').slice(0, 6);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!/^\d{4,6}$/.test(code)) return setError('Le code doit comporter 4 à 6 chiffres.');
    if (code !== confirm) return setError('Les deux codes ne correspondent pas.');

    setSubmitting(true);
    try {
      await onSubmit({ password, code });
      setPassword('');
      setCode('');
      setConfirm('');
    } catch (err) {
      setError(err instanceof ApiError ? (err.fieldError('code') ?? err.message) : 'Une erreur est survenue.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="sc-code">Nouveau code</Label>
          <Input id="sc-code" type="password" inputMode="numeric" autoComplete="off" placeholder="4 à 6 chiffres"
            value={code} onChange={(e) => setCode(digitsOnly(e.target.value))} className="h-11 text-lg tracking-[0.4em] placeholder:text-sm placeholder:tracking-normal" required />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="sc-confirm">Confirmation</Label>
          <Input id="sc-confirm" type="password" inputMode="numeric" autoComplete="off"
            value={confirm} onChange={(e) => setConfirm(digitsOnly(e.target.value))} className="h-11 text-lg tracking-[0.4em] placeholder:text-sm placeholder:tracking-normal" required />
        </div>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="sc-password">Mot de passe du compte</Label>
        <Input id="sc-password" type="password" autoComplete="current-password"
          value={password} onChange={(e) => setPassword(e.target.value)} className="h-11" required />
        <p className="text-xs text-gray-400">Pour confirmer que c'est bien vous.</p>
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <Button type="submit" disabled={submitting} className="w-full h-11 bg-orange-500 hover:bg-orange-600 text-white">
        {submitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
        {submitLabel}
      </Button>
    </form>
  );
}
