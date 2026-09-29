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
  CodexTestResult,
  EligibilityStatus,
  ModuleDetail,
  Module,
  Patient,
  ProgramModule,
  ReferenceItem,
  Statistics,
  TrainingProgram,
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

export function useCenters() {
  return useQuery({
    queryKey: ['centers'],
    queryFn: () => api<Collection<Center>>('/centers?itemsPerPage=100'),
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

/** Programme d'un patient (au plus un) */
export function usePatientProgram(patientIri: string | undefined) {
  return useQuery({
    queryKey: ['program', 'patient', patientIri],
    queryFn: async () => (await api<Collection<TrainingProgram>>(`/training_programs${query({ patient: patientIri })}`)).member[0] ?? null,
    enabled: !!patientIri,
  });
}

export function usePrograms() {
  return useQuery({
    queryKey: ['programs'],
    queryFn: () => api<Collection<TrainingProgram>>('/training_programs?itemsPerPage=100'),
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

export function useStatistics(centerIds: string[], enabled = true) {
  return useQuery({
    queryKey: ['statistics', centerIds],
    queryFn: () => api<Statistics>(`/statistics${centerIds.map((id, i) => `${i ? '&' : '?'}centers[]=${id}`).join('')}`),
    enabled,
  });
}

export function useUsers(enabled = true) {
  return useQuery({
    queryKey: ['users'],
    queryFn: () => api<Collection<UserAccount>>('/users?itemsPerPage=100'),
    enabled,
  });
}

export function useSessions(params: { patient?: string } = {}) {
  return useQuery({
    queryKey: ['sessions', params],
    queryFn: () => api<Collection<TrainingSession>>(`/sessions${query({ ...params, itemsPerPage: '50' })}`),
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
    onSuccess: () => client.invalidateQueries({ queryKey: ['patients'] }),
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
    mutationFn: (input: Partial<PatientInput> | EligibilityInput) => api<Patient>(`/patients/${id}`, { method: 'PATCH', body: input }),
    onSuccess: (patient) => {
      client.setQueryData(['patient', id], patient);
      client.invalidateQueries({ queryKey: ['patients'] });
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
    mutationFn: (input: { name: string; city: string }) => api<Center>('/centers', { method: 'POST', body: input }),
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
    onSuccess: () => client.invalidateQueries({ queryKey: ['users'] }),
  });
}

/* ─── Déroulement des séances et du programme ──────────────────────────── */

/** Invalide tout ce qui dépend de l'avancement d'un patient (parcours, séances, tableaux de bord) */
function useInvalidateProgress() {
  const client = useQueryClient();
  return () => {
    client.invalidateQueries({ queryKey: ['program'] });
    client.invalidateQueries({ queryKey: ['programs'] });
    client.invalidateQueries({ queryKey: ['sessions'] });
  };
}

/** Lancement d'une séance : le cours est considéré commencé, le chronomètre démarre */
export function useStartSession() {
  const invalidate = useInvalidateProgress();
  return useMutation({
    mutationFn: (input: { patient: string; module: string; program: string }) =>
      api<TrainingSession>('/sessions', { method: 'POST', body: input }),
    // Le programme passe « actif » et le cours « non terminé »
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

/** 3 mots tirés au sort : tirage figé pendant tout le test */
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
    mutationFn: (input: { patient: string; words: string[]; clockTime: string; clockTestPassed: boolean; wordRecallPassed: boolean }) =>
      api<CodexTestResult>('/codex_tests', { method: 'POST', body: input }),
    onSuccess: (test) => client.invalidateQueries({ queryKey: ['codex', test.patient] }),
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
