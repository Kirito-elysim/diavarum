/**
 * Accès aux données via TanStack Query : cache, états de chargement et invalidation après écriture.
 */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, type Collection } from '../lib/api';
import type {
  AccessLogEntry,
  Dashboard,
  ModuleContent,
  Center,
  CenterInput,
  CodexTestResult,
  EligibilityStatus,
  ModuleDetail,
  Module,
  Patient,
  ProgramModule,
  ProgramStatus,
  ReferenceItem,
  Statistics,
  TrainingProgram,
  TrainingProgramListItem,
  TrainingSession,
  UserAccount,
  UserRole,
} from './types';

const query = (params: Record<string, string | undefined>) => {
  const search = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => value && search.set(key, value));
  const qs = search.toString();

  return qs ? `?${qs}` : '';
};

/* ─── Lecture ──────────────────────────────────────────────────────────── */

/** Statut d'archivage demandé à l'API (actifs par défaut) */
export type ArchiveStatus = 'active' | 'archived' | 'all';

export function useCenters(status: ArchiveStatus = 'active') {
  return useQuery({
    queryKey: status === 'active' ? ['centers'] : ['centers', 'status', status],
    queryFn: () => allPages<Center>(status === 'active' ? '/centers' : `/centers?status=${status}`),
  });
}

export function usePatients(params: { search?: string; center?: string; eligibilityStatus?: string } = {}) {
  return useQuery({
    queryKey: ['patients', params],
    queryFn: () => api<Collection<Patient>>(`/patients${query({ ...params, itemsPerPage: '100' })}`),
  });
}

export function usePatient(id: string | null | undefined) {
  return useQuery({
    queryKey: ['patient', id],
    queryFn: () => api<Patient>(`/patients/${id}`),
    enabled: !!id,
  });
}

/** Parcours d'un patient (au plus un) */
export function usePatientProgram(patientIri: string | undefined) {
  return useQuery({
    queryKey: ['program', 'patient', patientIri],
    // La liste est allégée : le parcours complet (détail des séances) est lu ensuite par son identifiant
    queryFn: async () => {
      const found = (await api<Collection<TrainingProgramListItem>>(`/training_programs${query({ patient: patientIri })}`)).member[0];
      return found ? api<TrainingProgram>(`/training_programs/${found.id}`) : null;
    },
    enabled: !!patientIri,
  });
}

export function useProgram(id: string | null | undefined) {
  return useQuery({
    queryKey: ['program', id],
    queryFn: () => api<TrainingProgram>(`/training_programs/${id}`),
    enabled: !!id,
  });
}

export function useModules() {
  return useQuery({
    queryKey: ['modules'],
    queryFn: () => api<Collection<Module>>('/modules'),
  });
}

export function useModule(id: string | null | undefined) {
  return useQuery({
    queryKey: ['module', id],
    queryFn: () => api<ModuleDetail>(`/modules/${id}`),
    enabled: !!id,
  });
}

export function useEligibilityReasons() {
  return useQuery({
    queryKey: ['eligibility-reasons'],
    queryFn: () => api<Collection<ReferenceItem>>('/eligibility_reasons'),
    staleTime: Infinity,
  });
}

export function useInterruptionReasons() {
  return useQuery({
    queryKey: ['interruption-reasons'],
    queryFn: () => api<Collection<ReferenceItem>>('/interruption_reasons'),
    staleTime: Infinity,
  });
}

/** Paramètres d'URL des statistiques et de leurs exports : centres et période (AAAA-MM-JJ) */
export function statisticsQuery(centerIds: string[], period: { from?: string | null; to?: string | null } = {}) {
  const params = new URLSearchParams();
  centerIds.forEach((id) => params.append('centers[]', id));
  if (period.from) params.set('from', period.from);
  if (period.to) params.set('to', period.to);
  const query = params.toString();
  return query ? `?${query}` : '';
}

export function useStatistics(centerIds: string[], period: { from?: string | null; to?: string | null } = {}, enabled = true) {
  return useQuery({
    queryKey: ['statistics', centerIds, period.from ?? null, period.to ?? null],
    queryFn: () => api<Statistics>(`/statistics${statisticsQuery(centerIds, period)}`),
    enabled,
  });
}

export function useUsers(enabled = true, status: ArchiveStatus = 'active') {
  return useQuery({
    queryKey: status === 'active' ? ['users'] : ['users', 'status', status],
    queryFn: () => allPages<UserAccount>(status === 'active' ? '/users' : `/users?status=${status}`),
    enabled,
  });
}

export function useSessions(params: { patient?: string } = {}) {
  return useQuery({
    queryKey: ['sessions', params],
    queryFn: () => api<Collection<TrainingSession>>(`/sessions${query({ ...params, itemsPerPage: '50' })}`),
  });
}

/* ─── Listes paginées côté serveur (Séances, Parcours) ─────────────────── */

export interface ListSort { key: string; desc?: boolean }

/** Jour (AAAA-MM-JJ) → instant ISO en heure locale : début ou fin de journée */
const dayBound = (day: string | null | undefined, end: boolean) =>
  day ? new Date(`${day}T${end ? '23:59:59.999' : '00:00:00'}`).toISOString() : undefined;

export interface SessionFilters {
  search?: string;
  center?: string;
  nurse?: string;
  status?: string;
  patient?: string;
  from?: string | null;
  to?: string | null;
}

const sessionParams = (f: SessionFilters) => ({
  search: f.search || undefined,
  center: f.center,
  nurse: f.nurse,
  status: f.status,
  patient: f.patient,
  'startedAt[after]': dayBound(f.from, false),
  'startedAt[before]': dayBound(f.to, true),
});

const SESSION_SORT: Record<string, string> = { date: 'startedAt', patient: 'patient', course: 'module', nurse: 'nurse', duration: 'durationSeconds', score: 'score' };

export function useSessionList(filters: SessionFilters, sort: ListSort, page: number, itemsPerPage = 25) {
  return useQuery({
    queryKey: ['sessions', 'list', filters, sort, page, itemsPerPage],
    queryFn: () => api<Collection<TrainingSession>>(`/sessions${query({
      ...sessionParams(filters),
      [`order[${SESSION_SORT[sort.key] ?? 'startedAt'}]`]: sort.desc ? 'desc' : 'asc',
      page: String(page),
      itemsPerPage: String(itemsPerPage),
    })}`),
    placeholderData: (previous) => previous,
  });
}

export function useSessionSummary(filters: SessionFilters) {
  return useQuery({
    queryKey: ['sessions', 'summary', filters],
    queryFn: () => api<{ count: number; averageScore: number | null; averageDurationSeconds: number | null }>(`/summaries/sessions${query(sessionParams(filters))}`),
    placeholderData: (previous) => previous,
  });
}

export interface ProgramFilters { search?: string; center?: string; status?: string }

const PROGRAM_SORT: Record<string, string> = { patient: 'patient', status: 'status', start: 'startedAt', created: 'createdAt' };

export function useProgramList(filters: ProgramFilters, sort: ListSort, page: number, itemsPerPage = 25) {
  return useQuery({
    queryKey: ['programs', 'list', filters, sort, page, itemsPerPage],
    queryFn: () => api<Collection<TrainingProgramListItem>>(`/training_programs${query({
      search: filters.search || undefined,
      center: filters.center,
      status: filters.status,
      [`order[${PROGRAM_SORT[sort.key] ?? 'createdAt'}]`]: sort.desc ? 'desc' : 'asc',
      page: String(page),
      itemsPerPage: String(itemsPerPage),
    })}`),
    placeholderData: (previous) => previous,
  });
}

/** Nombre de parcours par statut, avec la recherche et le centre (mais pas le statut) de la liste */
export function useProgramSummary(filters: Omit<ProgramFilters, 'status'>) {
  return useQuery({
    queryKey: ['programs', 'summary', filters],
    queryFn: () => api<{ total: number; byStatus: Record<ProgramStatus, number> }>(`/summaries/training_programs${query({ search: filters.search || undefined, center: filters.center })}`),
    placeholderData: (previous) => previous,
  });
}

/* ─── Écriture ─────────────────────────────────────────────────────────── */

export interface PatientInput {
  firstName: string;
  lastName: string;
  dateOfBirth: string | null;
  center: string;
}

export function useCreatePatient() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (input: PatientInput) => api<Patient>('/patients', { method: 'POST', body: input }),
    onSuccess: () => {
      client.invalidateQueries({ queryKey: ['patients'] });
      client.invalidateQueries({ queryKey: ['statistics'] });
      client.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
}

export interface EligibilityInput {
  eligibilityStatus: EligibilityStatus;
  eligibilityReasons: string[];
  eligibilityNotes: string | null;
}

export function useUpdatePatient(id: string) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (input: Partial<PatientInput> | EligibilityInput | Pick<Patient, 'medicalData' | 'administrativeData'>) => api<Patient>(`/patients/${id}`, { method: 'PATCH', body: input }),
    onSuccess: (patient) => {
      client.setQueryData(['patient', id], patient);
      client.invalidateQueries({ queryKey: ['patients'] });
      client.invalidateQueries({ queryKey: ['statistics'] }); // éligibilité
      client.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
}

export function useCreateProgram() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (patientIri: string) => api<TrainingProgram>('/training_programs', { method: 'POST', body: { patient: patientIri } }),
    onSuccess: (program) => {
      client.setQueryData(['program', 'patient', program.patient['@id']], program);
      client.invalidateQueries({ queryKey: ['programs'] });
    },
  });
}

export function useToggleProgramModule(patientIri: string) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: ({ selection, selected }: { selection: ProgramModule; selected: boolean }) =>
      api<ProgramModule>(selection['@id'].replace(/^\/api/, ''), { method: 'PATCH', body: { selected } }),
    onSuccess: () => {
      client.invalidateQueries({ queryKey: ['program', 'patient', patientIri] });
      client.invalidateQueries({ queryKey: ['programs'] });
    },
  });
}

export function useCreateCenter() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (input: CenterInput) => api<Center>('/centers', { method: 'POST', body: input }),
    onSuccess: () => client.invalidateQueries({ queryKey: ['centers'] }),
  });
}

export function useArchiveCenter() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (center: Center) => api<void>(`/centers/${center.id}`, { method: 'DELETE' }),
    onSuccess: () => client.invalidateQueries({ queryKey: ['centers'] }),
  });
}

export interface UserInput {
  email: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  centers: string[];
  plainPassword: string;
}

export function useCreateUser() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (input: UserInput) => api<UserAccount>('/users', { method: 'POST', body: input }),
    onSuccess: () => client.invalidateQueries({ queryKey: ['users'] }),
  });
}

export function useArchiveUser() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (user: UserAccount) => api<void>(`/users/${user.id}`, { method: 'DELETE' }),
    onSuccess: () => {
      client.invalidateQueries({ queryKey: ['users'] });
      client.invalidateQueries({ queryKey: ['centers'] });
    },
  });
}

/* ─── Imports en masse (Excel / CSV) ──────────────────────────────────────── */

export type ImportType = 'users' | 'centers' | 'patients';

export interface ImportReport {
  valid: boolean;
  rows: { line: number; label: string; errors: string[] }[];
  created: number;
  /** Mots de passe provisoires des comptes créés (renvoyés une seule fois) */
  credentials?: { name: string; email: string; role: string; password: string }[];
}

export function useImport(type: ImportType) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: ({ file, mode, centerId }: { file: File; mode: 'preview' | 'import'; centerId?: string }) => {
      const body = new FormData();
      body.append('file', file);
      body.append('mode', mode);
      if (centerId) body.append('center', centerId);
      return api<ImportReport>(`/imports/${type}`, { method: 'POST', body });
    },
    onSuccess: (_, { mode }) => {
      if (mode !== 'import') return;
      client.invalidateQueries({ queryKey: ['users'] });
      client.invalidateQueries({ queryKey: ['centers'] });
      client.invalidateQueries({ queryKey: ['patients'] });
      client.invalidateQueries({ queryKey: ['statistics'] });
      client.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
}

export function useRestoreUser() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (user: UserAccount) => api<void>(`/users/${user.id}/restore`, { method: 'POST' }),
    onSuccess: () => {
      client.invalidateQueries({ queryKey: ['users'] });
      client.invalidateQueries({ queryKey: ['centers'] });
    },
  });
}

export function useRestoreCenter() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (center: Center) => api<void>(`/centers/${center.id}/restore`, { method: 'POST' }),
    onSuccess: () => client.invalidateQueries({ queryKey: ['centers'] }),
  });
}

/* ─── Déroulement des séances et du parcours ──────────────────────────── */

/** Invalide tout ce qui dépend de l'avancement d'un patient (parcours, séances, tableaux de bord) */
/** Après toute action sur un parcours ou une séance : listes, tableau de bord et statistiques à rafraîchir */
function useInvalidateProgress() {
  const client = useQueryClient();
  return () => {
    client.invalidateQueries({ queryKey: ['program'] });
    client.invalidateQueries({ queryKey: ['programs'] });
    client.invalidateQueries({ queryKey: ['sessions'] });
    client.invalidateQueries({ queryKey: ['statistics'] });
    client.invalidateQueries({ queryKey: ['dashboard'] });
  };
}

/** Lancement d'une séance : le cours est considéré commencé, le chronomètre démarre */
export function useStartSession() {
  const invalidate = useInvalidateProgress();
  return useMutation({
    mutationFn: (input: { patient: string; module: string; program: string }) =>
      api<TrainingSession>('/sessions', { method: 'POST', body: input }),
    // Le parcours passe « actif » et le cours « non terminé »
    onSuccess: invalidate,
  });
}

export interface ValidateSessionInput {
  durationSeconds: number;
  answers: { blockId: string; correct: number; total: number }[];
  competencies: { id: string; validated: boolean }[];
}

export function useValidateSession() {
  const invalidate = useInvalidateProgress();
  return useMutation({
    mutationFn: ({ sessionId, ...input }: ValidateSessionInput & { sessionId: string }) =>
      api<{ status: string; score: number | null; durationSeconds: number }>(`/sessions/${sessionId}/validate`, { method: 'POST', body: input }),
    onSuccess: invalidate,
  });
}

export function useInterruptSession() {
  const invalidate = useInvalidateProgress();
  return useMutation({
    mutationFn: (sessionId: string) => api<{ status: string }>(`/sessions/${sessionId}/interrupt`, { method: 'POST' }),
    onSettled: invalidate,
  });
}

export function useProgramAction() {
  const invalidate = useInvalidateProgress();
  return useMutation({
    mutationFn: ({ programId, action, body }: { programId: string; action: 'complete' | 'interrupt' | 'resume'; body?: unknown }) =>
      api<{ status: string }>(`/training_programs/${programId}/${action}`, { method: 'POST', body: body ?? {} }),
    onSuccess: invalidate,
  });
}

export function useSetSecurityCode() {
  return useMutation({
    mutationFn: (input: { password: string; code: string }) => api<void>('/me/security-code', { method: 'PUT', body: input }),
  });
}

export function useSetNationalSecurityCode() {
  return useMutation({
    mutationFn: (input: { password: string; code: string }) => api<void>('/national-security-code', { method: 'PUT', body: input }),
  });
}

/** Vérifie un code de sortie de séance (code de l'IDE ou code national) */
export function verifySecurityCode(code: string) {
  return api<void>('/security-code/verify', { method: 'POST', body: { code } });
}

/* ─── Test CODEX ───────────────────────────────────────────────────────── */

export function useCodexTests(patientIri: string | undefined) {
  return useQuery({
    queryKey: ['codex', patientIri],
    queryFn: () => api<Collection<CodexTestResult>>(`/codex_tests${query({ patient: patientIri })}`),
    enabled: !!patientIri,
  });
}

/** Liste principale fixe du protocole CODEX */
export function useCodexDraw() {
  return useQuery({
    queryKey: ['codex-draw'],
    queryFn: () => api<{ words: string[] }>('/codex/draw'),
    staleTime: Infinity,
    gcTime: 0,
    refetchOnWindowFocus: false,
  });
}

export function useCreateCodexTest() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (input: { patient: string; words: string[]; clockTime: string; clockTestPassed: boolean; wordRecallPassed: boolean; clockChecks: boolean[]; orientationAnswers: number[] | null }) =>
      api<CodexTestResult>('/codex_tests', { method: 'POST', body: input }),
    onSuccess: async (test) => {
      await Promise.all([client.invalidateQueries({ queryKey: ['codex', test.patient] }), client.invalidateQueries({ queryKey: ['patients'] }), client.invalidateQueries({ queryKey: ['patient'] }), client.invalidateQueries({ queryKey: ['eligibility-reasons'] })]);
    },
  });
}

/* ─── Journal des accès (administrateurs nationaux) ────────────────────── */

export function useAccessLogs(params: { user?: string; action?: string; resourceId?: string; page: number }) {
  return useQuery({
    queryKey: ['access-logs', params],
    queryFn: () => api<Collection<AccessLogEntry>>(`/access_logs${query({ ...params, page: String(params.page) })}`),
    placeholderData: (previous) => previous,
  });
}

/* ─── Intégration des contenus (administrateurs nationaux) ─────────────── */

export function getModuleContent(code: string) {
  return api<ModuleContent>(`/content/modules/${code}`);
}

export function useImportModuleContent() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (content: ModuleContent) => api<ModuleContent>(`/content/modules/${content.code}`, { method: 'PUT', body: content }),
    onSuccess: (content) => {
      client.invalidateQueries({ queryKey: ['modules'] });
      client.invalidateQueries({ queryKey: ['module'] });
      client.invalidateQueries({ queryKey: ['content-editor'] });
      return content;
    },
  });
}

/* ─── Tableau de bord ──────────────────────────────────────────────────── */

export function useDashboard() {
  return useQuery({
    queryKey: ['dashboard'],
    queryFn: () => api<Dashboard>('/dashboard'),
    // Les séances en cours bougent : rafraîchissement régulier
    refetchInterval: 60_000,
  });
}

export function useUpdateUser() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: UserInput }) => {
      const { plainPassword, ...fields } = input;
      return api<UserAccount>(`/users/${id}`, { method: 'PATCH', body: plainPassword ? input : fields });
    },
    onSuccess: () => client.invalidateQueries({ queryKey: ['users'] }),
  });
}

/** Rattachement / détachement d'un utilisateur à des centres (liste complète des IRI) */
export function useSetUserCenters() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: ({ id, centers }: { id: string; centers: string[] }) =>
      api<UserAccount>(`/users/${id}`, { method: 'PATCH', body: { centers } }),
    onSuccess: () => {
      client.invalidateQueries({ queryKey: ['users'] });
      client.invalidateQueries({ queryKey: ['centers'] });
    },
  });
}

export function useResetPassword() {
  return useMutation({
    mutationFn: ({ id, plainPassword }: { id: string; plainPassword: string }) =>
      api<UserAccount>(`/users/${id}`, { method: 'PATCH', body: { plainPassword } }),
  });
}

// Follow every page so local search and pagination include entries beyond the first 100.
async function allPages<T>(path: string): Promise<Collection<T>> {
  const separator = path.includes('?') ? '&' : '?';
  const first = await api<Collection<T>>(`${path}${separator}itemsPerPage=100&page=1`);
  const member = [...first.member];
  let page = 2;
  while (member.length < first.totalItems) {
    const next = await api<Collection<T>>(`${path}${separator}itemsPerPage=100&page=${page++}`);
    if (!next.member.length) break;
    member.push(...next.member);
  }
  return { ...first, member };
}
export function useCenter(id: string) {
  return useQuery({ queryKey: ['centers', id], queryFn: () => api<Center>(`/centers/${id}`), enabled: !!id });
}
export function useUpdateCenter() {
  const client = useQueryClient();
  return useMutation({ mutationFn: ({ id, ...input }: { id: string } & CenterInput) => api<Center>(`/centers/${id}`, { method: 'PATCH', body: input }), onSuccess: () => client.invalidateQueries({ queryKey: ['centers'] }) });
}
export function useCenterPatients(center: string, search: string, page: number) {
  return useQuery({ queryKey: ['patients', 'center', center, search, page], queryFn: () => api<Collection<Patient>>(`/patients${query({ center, search: search || undefined, page: String(page), itemsPerPage: '20' })}`), enabled: !!center });
}
