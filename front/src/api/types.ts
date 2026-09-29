/**
 * Ressources de l'API (JSON-LD). Chaque objet porte son IRI dans `@id` :
 * c'est cette IRI qu'on renvoie pour désigner une relation (ex. `center: "/api/centers/…"`).
 */
import type { ModulePage } from '../types';

export type UserRole = 'ide' | 'cadre' | 'admin_national';
export type EligibilityStatus = 'enregistre' | 'eligible' | 'non_eligible';
export type ProgramStatus = 'non_actif' | 'actif' | 'interrompu' | 'acheve';
export type SessionStatus = 'en_cours' | 'validee' | 'interrompue';

interface Resource {
  '@id': string;
  id: string;
}

export interface CenterRef extends Resource {
  name: string;
}

export interface Center extends CenterRef {
  city: string;
  country: string;
  createdAt: string;
  archivedAt?: string | null;
}

export interface Author extends Resource {
  firstName: string;
  lastName: string;
}

/** Profil de l'utilisateur connecté (GET /api/me, JSON simple) */
export interface Me {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  centers: { id: string; name: string; city: string }[];
  securityCodeConfigured: boolean;
}

export interface UserAccount extends Author {
  email: string;
  role: UserRole;
  centers: CenterRef[];
  securityCodeConfigured: boolean;
  lastLoginAt?: string | null;
  createdAt: string;
  archivedAt?: string | null;
}

export interface ReferenceItem extends Resource {
  label: string;
  position: number;
  active: boolean;
}

export interface Patient extends Resource {
  firstName: string;
  lastName: string;
  dateOfBirth?: string | null;
  center: CenterRef;
  eligibilityStatus: EligibilityStatus;
  /** IRI des motifs de non-éligibilité */
  eligibilityReasons: string[];
  eligibilityNotes?: string | null;
  medicalData: Record<string, unknown> | [];
  administrativeData: Record<string, unknown> | [];
  createdBy: Author;
  createdAt: string;
  updatedAt: string;
  removedAt?: string | null;
}

export interface ChapterRef extends Resource {
  title: string;
  position: number;
}

export interface ModuleSummary extends Resource {
  /** S0 = démarrage, S1…S24 systématiques, O1…O7 optionnelles */
  code: string;
  position: number;
  title: string;
  estimatedDuration: number;
  mandatory: boolean;
  intro: boolean;
}

export interface Module extends ModuleSummary {
  description: string;
  chapter?: string | null;
  published: boolean;
  pageCount: number;
  exerciseCount: number;
  competencyCount: number;
}

/** Format d'échange de l'API d'intégration des contenus (/api/content/modules/{code}) */
export interface ModuleContent {
  code: string;
  title: string;
  description: string;
  estimatedDuration: number;
  published: boolean;
  competencies: string[];
  content: ModulePage[];
}

export interface ModuleDetail extends Module {
  content: ModulePage[];
  competencies: { '@id': string; id: string; label: string; position: number }[];
}

/** Suivi d'une séance dans le parcours (cahier des charges §3) */
export type CourseStatus = 'non_demarre' | 'non_termine' | 'valide';

export interface ProgramModule extends Resource {
  module: ModuleSummary & { chapter?: ChapterRef | null };
  selected: boolean;
  position: number;
  status: CourseStatus;
  startedAt?: string | null;
  validatedAt?: string | null;
  score?: number | null;
  durationSeconds?: number | null;
}

export interface TrainingProgram extends Resource {
  patient: Author;
  status: ProgramStatus;
  modules: ProgramModule[];
  createdBy: Author;
  createdAt: string;
  startedAt?: string | null;
  completedAt?: string | null;
  validatedBy?: Author | null;
  validatedAt?: string | null;
  interruptionReasons: string[];
  interruptionNotes?: string | null;
  interruptedAt?: string | null;
  /** Séances sélectionnées (total du programme individualisé) */
  selectedCount: number;
  /** Séances validées, y compris désélectionnées après coup */
  validatedCount: number;
  averageScore?: number | null;
  totalDurationSeconds: number;
}

export interface TrainingSession extends Resource {
  patient: Author;
  module: { '@id': string; id: string; title: string };
  program?: string | null;
  nurse: Author;
  status: SessionStatus;
  startedAt: string;
  completedAt?: string | null;
  durationSeconds: number;
  score?: number | null;
}

export const ROLE_LABELS: Record<UserRole, string> = {
  ide: 'IDE',
  cadre: 'Cadre de service',
  admin_national: 'Administrateur national',
};

export const ELIGIBILITY_LABELS: Record<EligibilityStatus, string> = {
  enregistre: 'Enregistré',
  eligible: 'Éligible',
  non_eligible: 'Non éligible',
};

export const PROGRAM_STATUS_LABELS: Record<ProgramStatus, string> = {
  non_actif: 'Non actif',
  actif: 'En cours',
  interrompu: 'Interrompu',
  acheve: 'Achevé',
};

/* ─── Statistiques (GET /api/statistics) ───────────────────────────────── */

export interface Share {
  count: number;
  percent: number | null;
}

export interface AreaStatistics {
  center: string;
  patients: { registered: number; eligible: Share; notEligible: Share; pending: Share };
  programs: { total: number; inactive: Share; active: Share; interrupted: Share; completed: Share };
  averageProgramScore: number | null;
  averageCompletedProgramDurationSeconds: number | null;
}

export interface Statistics {
  scope: string;
  national: boolean;
  generatedAt: string;
  centers: AreaStatistics[];
  total: AreaStatistics;
  courses: { code: string; title: string; mandatory: boolean; validations: number; averageScore: number | null; averageDurationSeconds: number | null }[];
  nurses: { name: string; centers: string; validatedSessions: number; totalDurationSeconds: number }[];
}

/* ─── Test CODEX ───────────────────────────────────────────────────────── */

export interface CodexTestResult extends Resource {
  patient: string;
  nurse: Author;
  words: string[];
  clockTime: string;
  clockTestPassed: boolean;
  wordRecallPassed: boolean;
  passed: boolean;
  notes?: string | null;
  createdAt: string;
}

/* ─── Journal des accès ────────────────────────────────────────────────── */

export interface AccessLogEntry {
  id: string;
  occurredAt: string;
  userId?: string | null;
  userEmail?: string | null;
  action: string;
  method: string;
  path: string;
  resourceType?: string | null;
  resourceId?: string | null;
  statusCode: number;
  ip?: string | null;
}
