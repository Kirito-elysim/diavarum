import { useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { CheckCircle2, Clock, EyeOff, Loader2, X, XCircle } from 'lucide-react';
import { useCodexDraw, useCreateCodexTest, usePatient } from '../api/hooks';
import { ClockFace } from '../components/ClockFace';
import { ApiError } from '../lib/api';

type Step = 'words' | 'clock' | 'recall' | 'done';

/** Heure proposée à l'IDE : jamais une heure « pile » (plus discriminant pour le test) */
function randomTime() {
  const hour = 1 + Math.floor(Math.random() * 12);
  const minute = [10, 20, 25, 35, 40, 50][Math.floor(Math.random() * 6)];
  return { hour, minute };
}

const format = (hour: number, minute: number) => `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;

/**
 * Test CODEX réalisé par le patient sous la supervision de l'IDE (cahier des charges §4) :
 * 1. l'IDE lit 3 mots au patient sans montrer la tablette ;
 * 2. l'IDE donne une heure à l'oral, le patient place les 2 aiguilles ; l'IDE valide ou non ;
 * 3. l'IDE demande au patient de répéter les 3 mots ; réussi ou échec.
 */
export default function CodexTestPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: patient } = usePatient(id);
  const { data: draw, isError } = useCodexDraw();
  const createTest = useCreateCodexTest();

  const [step, setStep] = useState<Step>('words');
  const target = useMemo(randomTime, []);
  const [placed, setPlaced] = useState<{ h: number; m: number } | null>(null);
  // Horloge en 3 temps : l'IDE annonce l'heure, le patient règle l'horloge (sans aucune aide à l'écran), l'IDE juge
  const [clockPhase, setClockPhase] = useState<'announce' | 'patient' | 'review'>('announce');
  const [clockPassed, setClockPassed] = useState<boolean | null>(null);
  const [recallPassed, setRecallPassed] = useState<boolean | null>(null);
  const [error, setError] = useState<string | null>(null);

  const back = () => navigate(`/patients/${id}`);
  const words = draw?.words ?? [];

  const finish = async (recall: boolean) => {
    if (!patient || clockPassed === null) return;
    setRecallPassed(recall);
    setError(null);
    try {
      await createTest.mutateAsync({
        patient: patient['@id'],
        words,
        clockTime: format(target.hour, target.minute),
        clockTestPassed: clockPassed,
        wordRecallPassed: recall,
      });
      setStep('done');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Enregistrement impossible, réessayez.');
    }
  };

  if (!patient || (!draw && !isError)) {
    return <Screen><Loader2 className="w-8 h-8 text-gray-400 animate-spin" /></Screen>;
  }

  return (
    <Screen>
      <div className="absolute top-5 left-6 right-6 flex items-center justify-between">
        <div>
          <p className="text-sm font-semibold text-[#004138]">Test CODEX</p>
          <p className="text-xs text-gray-500">{patient.lastName.toUpperCase()} {patient.firstName}</p>
        </div>
        {step !== 'done' && (
          <button onClick={back} className="w-11 h-11 rounded-xl flex items-center justify-center text-gray-400 hover:bg-gray-100" aria-label="Abandonner le test">
            <X className="w-6 h-6" />
          </button>
        )}
      </div>

      {step !== 'done' && <Progress step={step} />}

      {step === 'words' && (
        <div className="max-w-xl w-full text-center">
          <IdeNotice>Ne montrez pas la tablette. Lisez ces 3 mots au patient et expliquez-lui qu'il devra s'en souvenir.</IdeNotice>
          {isError ? (
            <p className="text-red-600">Impossible de tirer les mots, réessayez.</p>
          ) : (
            <div className="grid grid-cols-3 gap-4 my-10">
              {words.map((w) => <div key={w} className="rounded-2xl bg-[#ECF5E9] py-8 text-3xl font-bold text-[#004138]">{w}</div>)}
            </div>
          )}
          <PrimaryButton onClick={() => setStep('clock')} disabled={words.length !== 3}>Mots lus au patient — continuer</PrimaryButton>
        </div>
      )}

      {step === 'clock' && clockPhase === 'announce' && (
        <div className="max-w-xl w-full text-center">
          <IdeNotice>
            Dites au patient : « Placez les aiguilles sur <strong>{target.hour} h {String(target.minute).padStart(2, '0')}</strong> ».
          </IdeNotice>
          <div className="my-10 text-6xl font-bold text-[#004138] tabular-nums">{target.hour} h {String(target.minute).padStart(2, '0')}</div>
          <PrimaryButton onClick={() => setClockPhase('patient')}>Donner la tablette au patient</PrimaryButton>
        </div>
      )}

      {step === 'clock' && clockPhase === 'patient' && (
        <div className="max-w-xl w-full flex flex-col items-center text-center">
          <p className="text-2xl font-semibold text-gray-800">Placez les deux aiguilles avec le doigt</p>
          <div className="my-8 w-full flex justify-center"><ClockFace onChange={(h, m) => setPlaced({ h, m })} /></div>
          <PrimaryButton onClick={() => setClockPhase('review')}>J'ai terminé</PrimaryButton>
        </div>
      )}

      {step === 'clock' && clockPhase === 'review' && (
        <div className="max-w-xl w-full text-center">
          <IdeNotice>La tablette revient à l'IDE : le patient a-t-il correctement placé les aiguilles ?</IdeNotice>
          <div className="grid grid-cols-2 gap-4 my-10">
            <div className="rounded-2xl bg-gray-50 py-6">
              <p className="text-sm text-gray-500">Heure demandée</p>
              <p className="text-3xl font-bold text-[#004138] tabular-nums">{target.hour} h {String(target.minute).padStart(2, '0')}</p>
            </div>
            <div className="rounded-2xl bg-gray-50 py-6">
              <p className="text-sm text-gray-500 flex items-center justify-center gap-1"><Clock className="w-4 h-4" />Aiguilles placées</p>
              <p className="text-3xl font-bold text-gray-800 tabular-nums">{placed ? `${placed.h} h ${String(placed.m).padStart(2, '0')}` : 'non réglées'}</p>
            </div>
          </div>
          <ChoiceButtons yes="Validé" no="Non validé" onChoose={(passed) => { setClockPassed(passed); setStep('recall'); }} />
          <button onClick={() => setClockPhase('patient')} className="mt-4 text-sm text-gray-400">Revoir l'horloge</button>
        </div>
      )}

      {step === 'recall' && (
        <div className="max-w-xl w-full text-center">
          <IdeNotice>Ne montrez pas l'écran. Demandez au patient de répéter les 3 mots.</IdeNotice>
          <div className="grid grid-cols-3 gap-4 my-10">
            {words.map((w) => <div key={w} className="rounded-2xl bg-[#ECF5E9] py-8 text-3xl font-bold text-[#004138]">{w}</div>)}
          </div>
          {error && <p className="text-red-600 mb-4">{error}</p>}
          {createTest.isPending ? (
            <Loader2 className="w-6 h-6 animate-spin mx-auto text-gray-400" />
          ) : (
            <ChoiceButtons yes="Test mots réussi" no="Échec test mots" onChoose={finish} />
          )}
        </div>
      )}

      {step === 'done' && (
        <div className="max-w-md w-full text-center">
          <h1 className="text-3xl font-bold text-[#004138] mb-8">Test CODEX enregistré</h1>
          <div className="space-y-3 mb-10 text-left">
            <ResultLine label={`Horloge (${target.hour} h ${String(target.minute).padStart(2, '0')})`} passed={!!clockPassed} />
            <ResultLine label="Rappel des 3 mots" passed={!!recallPassed} />
            <ResultLine label="Résultat global" passed={!!clockPassed && !!recallPassed} strong />
          </div>
          <PrimaryButton onClick={back}>Retour à la fiche patient</PrimaryButton>
        </div>
      )}
    </Screen>
  );
}

function Screen({ children }: { children: React.ReactNode }) {
  return <div className="fixed inset-0 z-[9999] bg-white flex flex-col items-center justify-center px-6 py-20 overflow-auto">{children}</div>;
}

function Progress({ step }: { step: Step }) {
  const steps: Step[] = ['words', 'clock', 'recall'];
  return (
    <div className="absolute top-8 left-1/2 -translate-x-1/2 flex gap-2">
      {steps.map((s, i) => (
        <div key={s} className={`h-2 rounded-full transition-all ${steps.indexOf(step) >= i ? 'w-10 bg-[#E86825]' : 'w-6 bg-gray-200'}`} />
      ))}
    </div>
  );
}

function IdeNotice({ children }: { children: React.ReactNode }) {
  return (
    <p className="flex items-start gap-3 text-left rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 p-4 text-base">
      <EyeOff className="w-5 h-5 flex-shrink-0 mt-0.5" />
      <span>{children}</span>
    </p>
  );
}

function PrimaryButton({ children, onClick, disabled }: { children: React.ReactNode; onClick: () => void; disabled?: boolean }) {
  return (
    <button onClick={onClick} disabled={disabled} className="w-full h-14 rounded-2xl bg-[#E86825] hover:bg-[#cc5516] text-white font-semibold text-lg disabled:opacity-40 touch-manipulation">
      {children}
    </button>
  );
}

function ChoiceButtons({ yes, no, onChoose }: { yes: string; no: string; onChoose: (passed: boolean) => void }) {
  return (
    <div className="grid grid-cols-2 gap-4 w-full">
      <button onClick={() => onChoose(true)} className="h-16 rounded-2xl bg-[#004138] text-white font-semibold text-lg flex items-center justify-center gap-2 touch-manipulation">
        <CheckCircle2 className="w-6 h-6" />{yes}
      </button>
      <button onClick={() => onChoose(false)} className="h-16 rounded-2xl bg-gray-100 text-gray-700 font-semibold text-lg flex items-center justify-center gap-2 touch-manipulation">
        <XCircle className="w-6 h-6" />{no}
      </button>
    </div>
  );
}

function ResultLine({ label, passed, strong }: { label: string; passed: boolean; strong?: boolean }) {
  return (
    <div className={`flex items-center justify-between rounded-xl px-4 py-3 ${strong ? 'bg-gray-100 font-semibold' : 'bg-gray-50'}`}>
      <span>{label}</span>
      <span className={`flex items-center gap-1.5 ${passed ? 'text-green-700' : 'text-red-600'}`}>
        {passed ? <CheckCircle2 className="w-5 h-5" /> : <XCircle className="w-5 h-5" />}
        {passed ? 'Réussi' : 'Échec'}
      </span>
    </div>
  );
}
