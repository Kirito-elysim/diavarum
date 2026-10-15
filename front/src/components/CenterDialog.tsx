import { useState } from 'react';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';
import { useCreateCenter, useUpdateCenter } from '../api/hooks';
import { CENTER_REGIONS, type Center, type CenterInput } from '../api/types';
import { ApiError } from '../lib/api';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from './ui/dialog';
import { SearchableSelect } from './SearchableSelect';

const toInput = (center?: Center): CenterInput => ({
  name: center?.name ?? '',
  city: center?.city ?? '',
  finess: center?.finess ?? '',
  address: center?.address ?? '',
  postalCode: center?.postalCode ?? '',
  region: center?.region ?? '',
  phone: center?.phone ?? '',
  email: center?.email ?? '',
  stations: center?.stations ?? null,
});

/** Création ou modification d'un centre de dialyse (administrateur national) */
export function CenterDialog({ open, onOpenChange, center, onSaved }: { open: boolean; onOpenChange: (open: boolean) => void; center?: Center; onSaved?: (center: Center) => void }) {
  const createCenter = useCreateCenter();
  const updateCenter = useUpdateCenter();
  const [form, setForm] = useState<CenterInput>(() => toInput(center));
  const [error, setError] = useState<ApiError | null>(null);
  const pending = createCenter.isPending || updateCenter.isPending;

  const set = (field: Exclude<keyof CenterInput, 'stations'>) => (e: React.ChangeEvent<HTMLInputElement>) => setForm({ ...form, [field]: e.target.value });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      const saved = center ? await updateCenter.mutateAsync({ id: center.id, ...form }) : await createCenter.mutateAsync(form);
      toast.success(center ? 'Centre mis à jour' : `Centre « ${saved.name} » créé`);
      if (!center) setForm(toInput());
      onOpenChange(false);
      onSaved?.(saved);
    } catch (err) {
      setError(err instanceof ApiError ? err : new ApiError(0, 'Une erreur est survenue.'));
    }
  };

  const fieldError = (field: string) => error?.fieldError(field) && <p className="text-xs text-red-600">{error.fieldError(field)}</p>;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{center ? 'Modifier le centre' : 'Nouveau centre'}</DialogTitle>
          <DialogDescription>Seuls le nom et la ville sont obligatoires ; complétez le reste dès que possible.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-5">
          <section className="space-y-3">
            <h3 className="font-semibold text-emerald-950">Établissement</h3>
            <div className="grid sm:grid-cols-[1fr_11rem] gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="c-name">Nom</Label>
                <Input id="c-name" placeholder="Diaverum …" value={form.name} onChange={set('name')} required maxLength={255} />
                {fieldError('name')}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="c-finess">N° FINESS</Label>
                <Input id="c-finess" inputMode="numeric" placeholder="750012345" value={form.finess ?? ''} onChange={set('finess')} maxLength={11} />
                {fieldError('finess')}
              </div>
            </div>
            <div className="space-y-1.5 sm:w-44">
              <Label htmlFor="c-stations">Postes de dialyse</Label>
              <Input id="c-stations" type="number" min={1} max={200} value={form.stations ?? ''} onChange={(e) => setForm({ ...form, stations: e.target.value === '' ? null : Number(e.target.value) })} />
              {fieldError('stations')}
            </div>
          </section>

          <section className="space-y-3">
            <h3 className="font-semibold text-emerald-950">Adresse</h3>
            <div className="space-y-1.5">
              <Label htmlFor="c-address">Rue</Label>
              <Input id="c-address" autoComplete="street-address" value={form.address ?? ''} onChange={set('address')} maxLength={255} />
              {fieldError('address')}
            </div>
            <div className="grid sm:grid-cols-[8rem_1fr] gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="c-postal">Code postal</Label>
                <Input id="c-postal" inputMode="numeric" autoComplete="postal-code" value={form.postalCode ?? ''} onChange={set('postalCode')} maxLength={5} />
                {fieldError('postalCode')}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="c-city">Ville</Label>
                <Input id="c-city" value={form.city} onChange={set('city')} required maxLength={255} />
                {fieldError('city')}
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Région</Label>
              <SearchableSelect
                aria-label="Région du centre"
                className="w-full bg-white border-input"
                value={form.region ?? ''}
                onChange={(region) => setForm({ ...form, region })}
                placeholder="Choisir une région"
                searchPlaceholder="Rechercher une région…"
                emptyText="Aucune région trouvée"
                options={CENTER_REGIONS.map((region) => ({ value: region, label: region }))}
              />
              {fieldError('region')}
            </div>
          </section>

          <section className="space-y-3">
            <h3 className="font-semibold text-emerald-950">Contact</h3>
            <div className="grid sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="c-phone">Téléphone</Label>
                <Input id="c-phone" type="tel" autoComplete="tel" placeholder="01 23 45 67 89" value={form.phone ?? ''} onChange={set('phone')} maxLength={20} />
                {fieldError('phone')}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="c-email">Email</Label>
                <Input id="c-email" type="email" value={form.email ?? ''} onChange={set('email')} maxLength={180} />
                {fieldError('email')}
              </div>
            </div>
          </section>

          {error && error.violations.length === 0 && <p className="text-sm text-red-600">{error.message}</p>}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Annuler</Button>
            <Button type="submit" disabled={pending} className="bg-orange-500 hover:bg-orange-600 text-white">
              {pending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {center ? 'Enregistrer les modifications' : 'Créer le centre'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
