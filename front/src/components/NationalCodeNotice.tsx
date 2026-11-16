import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { ShieldCheck } from 'lucide-react';
import { useAcknowledgeNationalCode, useNationalCodeStatus } from '../api/hooks';
import { formatDate } from '../lib/format';
import { Button } from './ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from './ui/dialog';

const POSTPONED = 'national-code-notice-postponed';

const readPostponed = () => {
  try {
    return sessionStorage.getItem(POSTPONED);
  } catch {
    return null;
  }
};

/** À la connexion d'un administrateur national : le code national a été changé par un autre, avec accès direct pour l'afficher */
export function NationalCodeNotice() {
  const { data: status } = useNationalCodeStatus();
  const acknowledge = useAcknowledgeNationalCode();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const [postponed, setPostponed] = useState<string | null>(readPostponed);

  // « Plus tard » ne vaut que pour cette session et pour ce changement (la date l'identifie)
  const open = !!status?.notice && postponed !== status.updatedAt && !pathname.startsWith('/admin/security');
  const postpone = () => {
    try {
      sessionStorage.setItem(POSTPONED, status?.updatedAt ?? '');
    } catch {
      // stockage indisponible : le rappel reviendra au prochain chargement
    }
    setPostponed(status?.updatedAt ?? '');
  };

  return (
    <Dialog open={open} onOpenChange={(next) => { if (!next) postpone(); }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="w-11 h-11 rounded-xl bg-orange-100 flex items-center justify-center mb-2">
            <ShieldCheck className="w-6 h-6 text-orange-600" />
          </div>
          <DialogTitle>Le code de sécurité national a été modifié</DialogTitle>
          <DialogDescription>
            {status?.updatedBy ?? 'Un administrateur national'} l'a modifié le {formatDate(status?.updatedAt, "d MMMM yyyy 'à' HH:mm")}.
            Il déverrouille les séances de toutes les IDE : affichez-le pour le connaître.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="gap-2 sm:gap-2">
          <Button variant="ghost" className="text-gray-500" disabled={acknowledge.isPending} onClick={() => acknowledge.mutate()}>Ne plus me le rappeler</Button>
          <Button variant="outline" onClick={postpone}>Plus tard</Button>
          <Button className="bg-orange-500 hover:bg-orange-600 text-white" onClick={() => navigate('/admin/security')}>Voir le code</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
