import { useState } from 'react';
import { toast } from 'sonner';
import { Check, Copy, Eye, EyeOff, Wand2, X } from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { generateTemporaryPassword, isStrongEnough, PASSWORD_MIN_LENGTH } from '../lib/password';

/** Saisie d'un mot de passe provisoire : génération facile à recopier, affichage, copie et règles de l'API */
export function PasswordField({ id, label, value, onChange, required, error, initiallyVisible = false }: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
  error?: React.ReactNode;
  initiallyVisible?: boolean;
}) {
  const [visible, setVisible] = useState(initiallyVisible);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      toast.success('Mot de passe copié');
    } catch {
      toast.error('Copie impossible : sélectionnez le mot de passe pour le recopier.');
    }
  };

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <Label htmlFor={id}>{label}</Label>
        <Button type="button" variant="ghost" size="sm" className="h-8 gap-1.5 text-orange-700 hover:text-orange-800 hover:bg-orange-50" onClick={() => { onChange(generateTemporaryPassword()); setVisible(true); }}>
          <Wand2 className="w-4 h-4" />Générer
        </Button>
      </div>
      <div className="relative">
        <Input id={id} type={visible ? 'text' : 'password'} autoComplete="new-password" spellCheck={false} className="pr-20 font-mono" value={value} onChange={(e) => onChange(e.target.value)} required={required} minLength={PASSWORD_MIN_LENGTH} />
        <div className="absolute right-1 top-1/2 -translate-y-1/2 flex">
          <Button type="button" variant="ghost" size="sm" className="h-8 w-8 p-0 text-gray-500" title={visible ? 'Masquer' : 'Afficher'} aria-label={visible ? 'Masquer le mot de passe' : 'Afficher le mot de passe'} onClick={() => setVisible(!visible)}>
            {visible ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </Button>
          <Button type="button" variant="ghost" size="sm" className="h-8 w-8 p-0 text-gray-500" title="Copier" aria-label="Copier le mot de passe" disabled={!value} onClick={copy}>
            <Copy className="w-4 h-4" />
          </Button>
        </div>
      </div>
      {value ? (
        <ul className="text-xs space-y-0.5">
          <PasswordRule ok={value.length >= PASSWORD_MIN_LENGTH}>{PASSWORD_MIN_LENGTH} caractères minimum</PasswordRule>
          <PasswordRule ok={isStrongEnough(value)}>Assez varié (majuscules, chiffres, symboles…)</PasswordRule>
        </ul>
      ) : (
        <p className="text-xs text-gray-400">{PASSWORD_MIN_LENGTH} caractères minimum, avec majuscules, chiffres ou symboles. « Générer » en propose un facile à recopier.</p>
      )}
      {error}
    </div>
  );
}

function PasswordRule({ ok, children }: { ok: boolean; children: React.ReactNode }) {
  return (
    <li className={`flex items-center gap-1.5 ${ok ? 'text-emerald-700' : 'text-gray-400'}`}>
      {ok ? <Check className="w-3.5 h-3.5" /> : <X className="w-3.5 h-3.5" />}{children}
    </li>
  );
}
