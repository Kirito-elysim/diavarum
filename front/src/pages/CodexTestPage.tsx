import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { CheckCircle2, EyeOff, Loader2, X, XCircle } from 'lucide-react';
import { useCreateCodexTest, usePatient } from '../api/hooks';
import { ClockFace, type ClockStroke } from '../components/ClockFace';
import type { CodexTestResult } from '../api/types';
import { ApiError } from '../lib/api';

type Step = 'words' | 'clock' | 'recall' | 'orientation' | 'done';
const lists = [['Clé', 'ballon', 'citron'], ['Cigare', 'fleur', 'porte']];
const criteria = ['Les nombres sont tous présents', 'Leur position est correcte', 'On reconnaît une petite et une grande aiguille', 'Les 2 placements des aiguilles sont corrects'];
const questions = ["Quel est le nom de l’hôpital où nous sommes (ou quel est le nom de la rue du cabinet où nous nous trouvons) ?", 'Quel est le nom de la ville où nous sommes ?', 'Quel est le nom du département où nous nous trouvons ?', 'Quel est le nom de la région où nous nous trouvons ?', 'À quel étage sommes-nous ?'];

export default function CodexTestPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: patient, isError: patientError } = usePatient(id);
  const createTest = useCreateCodexTest();
  const [step, setStep] = useState<Step>('words');
  const [list, setList] = useState(0);
  const [phase, setPhase] = useState<'announce' | 'patient' | 'review'>('announce');
  const [strokes, setStrokes] = useState<ClockStroke[]>([]);
  const [checks, setChecks] = useState<(boolean | null)[]>([null, null, null, null]);
  const [recall, setRecall] = useState<boolean | null>(null);
  const [answers, setAnswers] = useState<(boolean | null)[]>([null, null, null, null, null]);
  const [result, setResult] = useState<CodexTestResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const clockPassed = checks.every(value => value === true);
  const words = lists[list];
  const back = () => navigate(`/patients/${id}`);
  const finish = async (wordRecall: boolean) => {
    if (!patient || createTest.isPending) return;
    setError(null);
    try {
      const saved = await createTest.mutateAsync({ patient: patient['@id'], words, clockTime: '05:10', clockTestPassed: clockPassed, clockChecks: checks as boolean[], wordRecallPassed: wordRecall, orientationAnswers: clockPassed && wordRecall ? null : answers.map(value => value ? 1 : 0) });
      setResult(saved);
      setStep('done');
    } catch (err) { setError(err instanceof ApiError ? err.message : 'Enregistrement impossible, réessayez.'); }
  };
  if (!patient) return <Screen>{patientError ? <p>Impossible de charger le patient. <button onClick={back}>Retour</button></p> : <Loader2 className="animate-spin" />}</Screen>;
  return <Screen>
    <div className="w-full flex shrink-0 items-center justify-between gap-4 mb-4">
      <div><p className="text-sm font-semibold text-[#004138]">Test CODEX</p><p className="text-xs text-gray-500">{patient.lastName.toUpperCase()} {patient.firstName}</p></div>
      {step !== 'done' && <button onClick={back} aria-label="Abandonner le test" className="p-3 shrink-0 min-h-12 min-w-12"><X /></button>}
    </div>
    {step !== 'done' && <Progress step={step} />}
    <div className="max-w-xl w-full text-center my-auto space-y-6">
      {step === 'words' && <>
        <IdeNotice>Écran réservé à l’IDE : le patient ne doit pas voir les mots.<br />« Je vais vous dire 3 mots. Je voudrais que vous me les répétiez et que vous essayiez de les retenir car je vous les redemanderai tout à l’heure. »</IdeNotice>
        <label className="block text-left">Liste de mots<select className="block w-full border rounded-xl p-3 mt-2" value={list} onChange={event => setList(Number(event.target.value))}><option value={0}>Premier test</option><option value={1}>Second test exceptionnel</option></select></label>
        <WordList words={words} />
        <PrimaryButton onClick={() => setStep('clock')}>Mots lus et répétés — continuer</PrimaryButton>
      </>}
      {step === 'clock' && phase === 'announce' && <>
        <IdeNotice>Consigne au patient : « Voici le cadran d’une horloge, placez les chiffres indiquant les heures dans le cadran, puis indiquez 5h10 par des aiguilles. »</IdeNotice>
        <PrimaryButton onClick={() => setPhase('patient')}>Donner la tablette au patient</PrimaryButton>
      </>}
      {step === 'clock' && phase === 'patient' && <>
        <p className="text-xl font-semibold">Dessinez les nombres des heures, puis les aiguilles.</p>
        <div className="flex justify-center"><ClockFace strokes={strokes} onChange={setStrokes} /></div>
        <button className="border rounded-xl p-3" disabled={!strokes.length} onClick={() => setStrokes(previous => previous.slice(0, -1))}>Annuler le dernier trait</button>
        <PrimaryButton onClick={() => setPhase('review')}>J’ai terminé — rendre la tablette à l’IDE</PrimaryButton>
      </>}
      {step === 'clock' && phase === 'review' && <>
        <IdeNotice>Validation par l’IDE — heure demandée : 5h10. Un seul « Non » signifie un échec à l’horloge.</IdeNotice>
        <div className="flex justify-center"><ClockFace strokes={strokes} readOnly /></div>
        <QuestionList labels={criteria} values={checks} onChange={setChecks} />
        <PrimaryButton disabled={checks.includes(null)} onClick={() => setStep('recall')}>Continuer vers le rappel des mots</PrimaryButton>
      </>}
      {step === 'recall' && <>
        <IdeNotice>Ne montrez pas l’écran au patient.<br />« Pouvez-vous me dire quels étaient les 3 mots que je vous ai demandé de répéter et de retenir tout à l’heure ? »</IdeNotice>
        <WordList words={words} />
        <p>Les trois mots doivent être rappelés pour réussir cette épreuve.</p>
        {!createTest.isPending && <ChoiceButtons yes="3 mots rappelés" no="Rappel incomplet" onChoose={value => { setRecall(value); if (clockPassed && value) void finish(value); else setStep('orientation'); }} />}
      </>}
      {step === 'orientation' && <>
        <IdeNotice>Une ou deux épreuves ont échoué. Posez les cinq questions et cotez chaque réponse : 1 si correcte, 0 sinon.</IdeNotice>
        <QuestionList labels={questions} values={answers} onChange={setAnswers} numeric />
        <PrimaryButton disabled={answers.includes(null) || createTest.isPending} onClick={() => { if (recall !== null) void finish(recall); }}>Enregistrer le résultat</PrimaryButton>
      </>}
      {createTest.isPending && <Loader2 className="animate-spin mx-auto" />}
      {error && <p role="alert" className="text-red-600">{error}</p>}
      {step === 'done' && result && <>
        <h1 className="text-3xl font-bold text-[#004138]">CODEX {result.passed ? 'normal' : 'anormal'}</h1>
        <p>Test enregistré.</p>
        <ResultLine label="Horloge (5h10)" passed={result.clockTestPassed} />
        <ResultLine label="Rappel des 3 mots" passed={result.wordRecallPassed} />
        {result.orientationScore != null && <p>Orientation : {result.orientationScore}/5</p>}
        {result.nephrologistReviewRequired && <p role="alert" className="rounded-xl bg-red-50 p-4 text-red-800">Le patient n’est pas éligible au parcours d’entraînement. L’IDE doit transmettre le résultat au néphrologue.</p>}
        <PrimaryButton onClick={back}>Retour à la fiche patient</PrimaryButton>
      </>}
    </div>
  </Screen>;
}
function WordList({ words }: { words: string[] }) {
  return <div className="grid grid-cols-3 gap-3">{words.map(word => <div key={word} className="rounded-2xl bg-[#ECF5E9] py-6 text-2xl font-bold text-[#004138]">{word}</div>)}</div>;
}
function QuestionList({ labels, values, onChange, numeric = false }: { labels: string[]; values: (boolean | null)[]; onChange: (values: (boolean | null)[]) => void; numeric?: boolean }) {
  return <div className="space-y-4 text-left">{labels.map((label, index) => <fieldset key={label} className="rounded-xl border p-3"><legend className="px-1">{label}</legend><div className="flex gap-6">{[true, false].map(value => <label key={String(value)} className="flex min-h-12 min-w-24 items-center gap-3 p-3 cursor-pointer"><input type="radio" className="h-6 w-6 accent-[#004138]" name={`answer-${index}`} checked={values[index] === value} onChange={() => onChange(values.map((old, i) => i === index ? value : old))} />{numeric ? (value ? '1 — Correct' : '0 — Incorrect') : (value ? 'Oui' : 'Non')}</label>)}</div></fieldset>)}</div>;
}

function Screen({ children }: { children: React.ReactNode }) {
  return <div className="fixed inset-0 z-[9999] bg-white flex flex-col items-center px-4 sm:px-6 py-5 overflow-y-auto overscroll-contain">{children}</div>;
}

function Progress({ step }: { step: Step }) {
  const steps: Step[] = ['words', 'clock', 'recall', 'orientation'];
  return (
    <div className="flex shrink-0 justify-center gap-2 mb-6">
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
    <button onClick={onClick} disabled={disabled} className="w-full min-h-14 px-4 py-3 rounded-2xl bg-[#E86825] hover:bg-[#cc5516] text-white font-semibold text-lg disabled:opacity-40 touch-manipulation">
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
