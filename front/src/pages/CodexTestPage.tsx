import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from 'sonner';
import { CheckCircle2, EyeOff, Loader2, X, XCircle } from 'lucide-react';
import { useCreateCodexTest, useEligibilityReasons, usePatient, useUpdatePatient } from '../api/hooks';
import { ClockFace, type ClockStroke } from '../components/ClockFace';
import type { CodexTestResult } from '../api/types';
import { ApiError } from '../lib/api';

type Screen =
  | 'intro'
  | 'words-instruction' | 'words-say' | 'words-repeat'
  | 'clock-handover' | 'clock-draw' | 'clock-return' | 'clock-review'
  | 'recall'
  | 'orientation'
  | 'decision';
type Decision = 'eligible' | 'non_eligible';

const lists = [['Clé', 'ballon', 'citron'], ['Cigare', 'fleur', 'porte']];
const criteria = ['Les nombres sont tous présents.', 'Leur position est correcte.', 'On reconnaît une petite et une grande aiguille.', 'Les 2 placements des aiguilles sont corrects.'];
const questions = ['Quel est le nom de l’hôpital où nous sommes (ou quel est le nom de la rue du cabinet où nous nous trouvons) ?', 'Quel est le nom de la ville où nous sommes ?', 'Quel est le nom du département où nous nous trouvons ?', 'Quel est le nom de la région où nous nous trouvons ?', 'À quel étage sommes-nous ?'];
const ABNORMAL_REASON = 'Test CODEX anormal';
/** Affichage des mots : initiale en majuscule dans les encarts, en minuscules dans le rappel */
const capitalize = (word: string) => word.charAt(0).toUpperCase() + word.slice(1);

/** Étape affichée en tête d'écran et dans la barre de progression */
const stages: { title: string; screens: Screen[] }[] = [
  { title: 'Étape 1 : Test des 3 mots, 1ère partie', screens: ['words-instruction', 'words-say', 'words-repeat'] },
  { title: 'Étape 2 : Test de l’horloge', screens: ['clock-handover', 'clock-draw', 'clock-return', 'clock-review'] },
  { title: 'Étape 3 : Test des 3 mots, 2ème partie', screens: ['recall'] },
  { title: 'Étape 4 : Test d’orientation dans l’espace', screens: ['orientation'] },
];

export default function CodexTestPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: patient, isError: patientError } = usePatient(id);
  const { data: reasons, refetch: refetchReasons } = useEligibilityReasons();
  const createTest = useCreateCodexTest();
  const updatePatient = useUpdatePatient(id ?? '');
  const [screen, setScreen] = useState<Screen>('intro');
  const [list, setList] = useState(0);
  const [strokes, setStrokes] = useState<ClockStroke[]>([]);
  const [checks, setChecks] = useState<(boolean | null)[]>([null, null, null, null]);
  const [recall, setRecall] = useState<(boolean | null)[]>([null]);
  const [answers, setAnswers] = useState<(boolean | null)[]>([null, null, null, null, null]);
  const [decision, setDecision] = useState<Decision | null>(null);
  /** null tant que l'IDE n'a pas touché aux motifs : « Test CODEX anormal » est alors coché par défaut si le CODEX est anormal */
  const [chosenReasons, setChosenReasons] = useState<string[] | null>(null);
  const [notes, setNotes] = useState('');
  const [saved, setSaved] = useState<CodexTestResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const words = lists[list];
  const clockPassed = checks.every(value => value === true);
  const recallPassed = recall[0] === true;
  const needsOrientation = clockPassed !== recallPassed;
  const orientationScore = answers.filter(Boolean).length;
  const normal = needsOrientation ? orientationScore >= 4 : clockPassed && recallPassed;
  const busy = createTest.isPending || updatePatient.isPending;
  const back = () => navigate(`/patients/${id}`);
  // Motifs relus à l'ouverture du test : une liste gardée en cache pourrait ne pas contenir le dernier motif ajouté
  useEffect(() => { void refetchReasons(); }, [refetchReasons]);
  const abnormalReason = reasons?.member.find(r => r.active && r.label === ABNORMAL_REASON);
  const selectedReasons = chosenReasons ?? (!normal && abnormalReason ? [abnormalReason['@id']] : []);
  const toggleReason = (iri: string, checked: boolean) => setChosenReasons(checked ? [...selectedReasons, iri] : selectedReasons.filter(r => r !== iri));
  const missing = !decision ? 'Choisissez « Éligible » ou « Non éligible » pour valider.'
    : decision === 'non_eligible' && !selectedReasons.length ? 'Cochez au moins un motif de non-éligibilité pour valider.' : null;

  /** Écran de décision : un CODEX anormal présélectionne « non éligible » et son motif, l'IDE reste libre */
  const openDecision = () => {
    if (!normal) setDecision('non_eligible');
    setScreen('decision');
  };
  const afterRecall = () => (needsOrientation ? setScreen('orientation') : openDecision());

  const validate = async () => {
    if (!patient || !decision || busy) return;
    setError(null);
    try {
      // Le test n'est enregistré qu'une fois, même si l'enregistrement de la décision doit être retenté
      const test = saved ?? await createTest.mutateAsync({
        patient: patient['@id'], words, clockTime: '05:10', clockTestPassed: clockPassed, clockChecks: checks as boolean[],
        wordRecallPassed: recallPassed, orientationAnswers: needsOrientation ? answers.map(value => (value ? 1 : 0)) : null,
      });
      setSaved(test);
      await updatePatient.mutateAsync({
        eligibilityStatus: decision,
        eligibilityReasons: decision === 'non_eligible' ? selectedReasons : [],
        eligibilityNotes: decision === 'non_eligible' ? notes || null : null,
      });
      toast.success('Test CODEX et décision d’éligibilité enregistrés');
      back();
    } catch (err) {
      setError(err instanceof ApiError ? (err.violations[0]?.message ?? err.message) : 'Enregistrement impossible, réessayez.');
    }
  };

  if (!patient) return <Shell>{patientError ? <p>Impossible de charger le patient. <button onClick={back}>Retour</button></p> : <Loader2 className="animate-spin" />}</Shell>;
  const patientName = `${patient.firstName} ${patient.lastName.toUpperCase()}`;
  const stage = stages.find(s => s.screens.includes(screen));

  return <Shell>
    <div className="w-full flex shrink-0 items-center justify-between gap-4 mb-4">
      <div><p className="text-sm font-semibold text-[#004138]">Test CODEX</p><p className="text-xs text-gray-500">{patientName}</p></div>
      <button onClick={back} aria-label="Abandonner le test" className="p-3 shrink-0 min-h-12 min-w-12"><X /></button>
    </div>
    {stage && <Progress current={stages.indexOf(stage)} />}
    <div className="max-w-xl w-full my-auto space-y-6">
      {stage && <h1 className="text-center text-lg font-semibold text-[#004138]">{stage.title}</h1>}

      {screen === 'intro' && <>
        <h1 className="text-center text-2xl font-bold text-[#004138]">Test CODEX</h1>
        <div className="space-y-4 text-base leading-relaxed text-gray-800 text-justify hyphens-auto" lang="fr">
          <p>Vous allez réaliser un test CODEX auprès du patient <strong>{patientName}</strong>.</p>
          <p>Ce test permet d’évaluer certaines capacités cognitives du patient, afin de savoir s’il est apte ou non à suivre le parcours d’entraînement.</p>
          <p>Merci de suivre rigoureusement les consignes qui vous seront indiquées, elles garantissent la fiabilité du test.</p>
          <p>Le test CODEX comprend 2 tests subsidiaires : le test des 3 mots, et le test de l’horloge. Le test des 3 mots est réalisé en 2 temps, entre lesquels sera proposé le test de l’horloge. En cas d’échec à l’un de ces 2 tests, un 3ème test d’orientation dans l’espace sera proposé au patient.</p>
        </div>
        <IdeNotice>Contrairement aux séances d’entraînement, seul le soignant doit voir la tablette pendant tout le test CODEX, à l’exception d’une partie du test de l’horloge, pendant laquelle le patient doit inscrire différents éléments sur la tablette.</IdeNotice>
        <PrimaryButton onClick={() => setScreen('words-instruction')}>Démarrer le test</PrimaryButton>
      </>}

      {screen === 'words-instruction' && <>
        <Instruction>Merci de lire à voix haute cette consigne au patient :</Instruction>
        <Quote>« Je vais vous dire 3 mots. Je voudrais que vous me les répétiez et que vous essayiez de les retenir, car je vous les redemanderai tout à l’heure. »</Quote>
        <PrimaryButton onClick={() => setScreen('words-say')}>Suite du test</PrimaryButton>
      </>}

      {screen === 'words-say' && <>
        <WordList words={words} />
        <Instruction>Vous devez dire ces 3 mots au patient, à voix haute et intelligible, sans lui montrer la tablette.</Instruction>
        <PrimaryButton onClick={() => setScreen('words-repeat')}>Suite du test</PrimaryButton>
        <div className="flex flex-col items-center gap-2 pt-4 text-center">
          <p className="text-sm text-gray-500">Si le patient a déjà passé un test CODEX récemment, les 3 mots à retenir doivent être modifiés.</p>
          <button onClick={() => setList(list === 0 ? 1 : 0)} className="min-h-11 rounded-xl border px-4 text-sm font-medium text-[#004138]">
            {list === 0 ? 'Changer de mots' : 'Reprendre les mots habituels'}
          </button>
        </div>
      </>}

      {screen === 'words-repeat' && <>
        <WordList words={words} />
        <Instruction>Vous devez maintenant demander au patient de répéter<br />ces 3 mots à voix haute.</Instruction>
        <PrimaryButton onClick={() => setScreen('clock-handover')}>Suite du test</PrimaryButton>
      </>}

      {screen === 'clock-handover' && <>
        <Instruction>Vous pouvez désormais donner la tablette au patient.</Instruction>
        <p className="text-center text-base text-gray-700">Vous devez l’accompagner pour cette étape du test, en lui réexpliquant éventuellement les consignes, mais sans l’aider,<br />afin de garantir la fiabilité du test.</p>
        <PrimaryButton onClick={() => setScreen('clock-draw')}>Suite du test</PrimaryButton>
      </>}

      {screen === 'clock-draw' && <>
        <div className="text-lg text-gray-900">
          <p>Voici le cadran d’une horloge :</p>
          <ul className="list-disc pl-6 mt-1">
            <li>inscrivez les chiffres indiquant les heures dans le cadran ;</li>
            <li>puis indiquez 5h10 par des aiguilles.</li>
          </ul>
        </div>
        <div className="flex justify-center"><ClockFace strokes={strokes} onChange={setStrokes} /></div>
        <div className="grid grid-cols-2 gap-3">
          <button className="min-h-12 rounded-xl border font-medium disabled:opacity-40 touch-manipulation" disabled={!strokes.length} onClick={() => setStrokes(previous => previous.slice(0, -1))}>Effacer le dernier trait</button>
          <button className="min-h-12 rounded-xl border font-medium disabled:opacity-40 touch-manipulation" disabled={!strokes.length} onClick={() => setStrokes([])}>Effacer tout</button>
        </div>
        <PrimaryButton onClick={() => setScreen('clock-return')}>Suite du test</PrimaryButton>
      </>}

      {screen === 'clock-return' && <>
        <p className="text-center text-2xl font-bold text-gray-900">Vous pouvez désormais redonner la tablette à l’infirmier/infirmière.</p>
        <div className="flex justify-center"><ClockFace strokes={strokes} readOnly /></div>
        <PrimaryButton onClick={() => setScreen('clock-review')}>Suite du test</PrimaryButton>
      </>}

      {screen === 'clock-review' && <>
        <div className="flex justify-center"><ClockFace strokes={strokes} readOnly /></div>
        <Instruction>Vous devez désormais évaluer la réussite du test de l’horloge du patient {patientName} en répondant aux 4 questions suivantes :</Instruction>
        <QuestionList labels={criteria} values={checks} onChange={setChecks} />
        {!checks.includes(null) && <Verdict label="Test de l’horloge" passed={clockPassed} />}
        <PrimaryButton disabled={checks.includes(null)} onClick={() => setScreen('recall')}>Suite du test</PrimaryButton>
      </>}

      {screen === 'recall' && <>
        <Instruction>Merci de lire à voix haute cette consigne au patient :</Instruction>
        <Quote>« Pouvez-vous me dire quels étaient les 3 mots que je vous ai demandé de répéter et de retenir tout à l’heure ? »</Quote>
        <p className="text-center text-sm text-gray-500">Mots attendus : {words.map(word => word.toLowerCase()).join(', ')}</p>
        <QuestionList labels={['Le patient peut répéter les 3 mots exacts :']} values={recall} onChange={setRecall} />
        {recall[0] !== null && <Verdict label="Test des 3 mots" passed={recallPassed} />}
        <PrimaryButton disabled={recall[0] === null} onClick={afterRecall}>Suite du test</PrimaryButton>
      </>}

      {screen === 'orientation' && <>
        <p className="text-base text-gray-800">Puisque le patient a échoué à l’un des 2 tests de l’horloge ou des 3 mots, cet autre test doit lui être proposé, afin de statuer sur le résultat global du test CODEX.</p>
        <IdeNotice>Pour réaliser ce troisième test, vous devez poser les 5 questions ci-dessous au patient, à voix haute, sans lui montrer l’écran. Pour chaque question, vous devrez signifier si le patient répond juste ou faux.</IdeNotice>
        <QuestionList labels={questions} values={answers} onChange={setAnswers} options={['Juste', 'Faux']} />
        <PrimaryButton disabled={answers.includes(null)} onClick={openDecision}>Validation</PrimaryButton>
      </>}

      {screen === 'decision' && <>
        <div className="space-y-3">
          <Verdict label="Test de l’horloge" passed={clockPassed} />
          <Verdict label="Test des 3 mots" passed={recallPassed} />
          {needsOrientation && <Verdict label="Résultat du test d’orientation dans l’espace" passed={orientationScore >= 4} result={`${orientationScore} / 5`} />}
        </div>
        <p className={`rounded-2xl p-5 text-center text-2xl font-bold ${normal ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'}`}>
          {needsOrientation ? `Résultat du test CODEX : ${normal ? 'Normal' : 'Anormal'}` : `Test CODEX ${normal ? 'normal' : 'anormal'}`}
        </p>
        {!normal && <p className="text-center text-sm text-red-800">Le résultat est à transmettre au néphrologue.</p>}
        <fieldset className="space-y-3">
          <legend className="mb-3 text-lg font-semibold text-gray-900">Décision d’éligibilité du patient au parcours d’entraînement</legend>
          <div className="grid grid-cols-2 gap-4">
            {(['eligible', 'non_eligible'] as const).map(value => (
              <button key={value} aria-pressed={decision === value} onClick={() => setDecision(value)}
                className={`min-h-14 rounded-2xl border-2 font-semibold text-lg touch-manipulation ${decision === value ? (value === 'eligible' ? 'border-green-700 bg-green-50 text-green-800' : 'border-red-700 bg-red-50 text-red-800') : 'border-gray-200 text-gray-700'}`}>
                {value === 'eligible' ? 'Éligible' : 'Non éligible'}
              </button>
            ))}
          </div>
          {decision === 'non_eligible' && <div className="space-y-3 rounded-xl border border-red-100 bg-red-50/50 p-4">
            <p className="font-medium">Motifs (au moins un)</p>
            {reasons?.member.filter(r => r.active).map(reason => (
              <label key={reason.id} className="flex min-h-11 cursor-pointer items-center gap-3">
                <input type="checkbox" className="h-5 w-5 accent-[#004138]" checked={selectedReasons.includes(reason['@id'])}
                  onChange={event => toggleReason(reason['@id'], event.target.checked)} />
                {reason.label}
              </label>
            ))}
            <label className="block">Précisions (facultatif)
              <textarea rows={3} value={notes} onChange={event => setNotes(event.target.value)} className="mt-1 block w-full rounded-xl border bg-white p-3" />
            </label>
          </div>}
        </fieldset>
        <PrimaryButton disabled={!!missing || busy} onClick={() => void validate()}>
          {busy ? <Loader2 className="mx-auto animate-spin" /> : 'Valider'}
        </PrimaryButton>
        {missing && <p className="text-center text-sm text-gray-600">{missing}</p>}
        {error && <p role="alert" className="text-center text-red-600">{error}</p>}
      </>}
    </div>
  </Shell>;
}

function WordList({ words }: { words: string[] }) {
  return <div className="grid grid-cols-3 gap-3">{words.map(word => <div key={word} className="rounded-2xl bg-[#ECF5E9] py-6 text-center text-2xl font-bold text-[#004138]">{capitalize(word)}</div>)}</div>;
}

function QuestionList({ labels, values, onChange, options = ['Oui', 'Non'] }: { labels: string[]; values: (boolean | null)[]; onChange: (values: (boolean | null)[]) => void; options?: [string, string] }) {
  return <div className="space-y-4 text-left">{labels.map((label, index) => <fieldset key={label} className="rounded-xl border p-3"><legend className="px-1">{label}</legend><div className="flex gap-6">{[true, false].map(value => <label key={String(value)} className="flex min-h-12 min-w-24 items-center gap-3 p-3 cursor-pointer"><input type="radio" className="h-6 w-6 accent-[#004138]" name={`answer-${label}`} checked={values[index] === value} onChange={() => onChange(values.map((old, i) => i === index ? value : old))} />{value ? options[0] : options[1]}</label>)}</div></fieldset>)}</div>;
}

function Shell({ children }: { children: React.ReactNode }) {
  return <div className="fixed inset-0 z-[9999] bg-white flex flex-col items-center px-4 sm:px-6 py-5 overflow-y-auto overscroll-contain">{children}</div>;
}

function Progress({ current }: { current: number }) {
  return (
    <div className="flex shrink-0 justify-center gap-2 mb-6">
      {stages.map((stage, i) => (
        <div key={stage.title} className={`h-2 rounded-full transition-all ${current >= i ? 'w-10 bg-[#E86825]' : 'w-6 bg-gray-200'}`} />
      ))}
    </div>
  );
}

function Instruction({ children }: { children: React.ReactNode }) {
  return <p className="text-center text-lg font-medium text-gray-900">{children}</p>;
}

function Quote({ children }: { children: React.ReactNode }) {
  return <p className="rounded-2xl bg-[#ECF5E9] p-5 text-xl leading-relaxed text-[#004138]">{children}</p>;
}

function IdeNotice({ children }: { children: React.ReactNode }) {
  return (
    <p className="flex items-start gap-3 text-left rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 p-4 text-base">
      <EyeOff className="w-5 h-5 flex-shrink-0 mt-0.5" />
      <span className="text-justify">{children}</span>
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

/** Restitution automatique d'une épreuve */
function Verdict({ label, passed, result }: { label: string; passed: boolean; result?: string }) {
  return (
    <div role="status" className={`flex items-center justify-between rounded-xl px-4 py-3 text-lg font-semibold ${passed ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'}`}>
      <span>{label}</span>
      <span className="flex items-center gap-2">{passed ? <CheckCircle2 className="w-6 h-6" /> : <XCircle className="w-6 h-6" />}{result ?? (passed ? 'RÉUSSI' : 'ÉCHOUÉ')}</span>
    </div>
  );
}
