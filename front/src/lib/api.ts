/**
 * Client HTTP de l'API Symfony (même domaine, préfixe /api).
 *
 * - Le JWT (15 min) est gardé en mémoire uniquement : jamais dans localStorage, où un script
 *   injecté pourrait le lire.
 * - Le refresh token vit dans un cookie httpOnly posé par l'API : sur 401, on renouvelle le JWT
 *   une fois puis on rejoue la requête. Au rechargement de la page, restoreSession() fait de même.
 */

export interface Violation {
  propertyPath: string;
  message: string;
}

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
    public readonly violations: Violation[] = [],
  ) {
    super(message);
  }

  /** Message de la violation portant sur un champ du formulaire */
  fieldError(field: string): string | undefined {
    return this.violations.find((v) => v.propertyPath === field)?.message;
  }
}

/** Collection JSON-LD (Hydra) renvoyée par API Platform */
export interface Collection<T> {
  member: T[];
  totalItems: number;
}

let accessToken: string | null = null;
let refreshInFlight: Promise<boolean> | null = null;
let onSessionExpired: () => void = () => {};

export function setSessionExpiredHandler(handler: () => void) {
  onSessionExpired = handler;
}

async function refreshAccessToken(): Promise<boolean> {
  // Plusieurs requêtes peuvent expirer en même temps : un seul refresh (le jeton est à usage unique)
  refreshInFlight ??= fetch('/api/auth/refresh', { method: 'POST', credentials: 'same-origin' })
    .then(async (response) => {
      accessToken = response.ok ? ((await response.json()) as { token: string }).token : null;
      return response.ok;
    })
    .catch(() => false)
    .finally(() => {
      refreshInFlight = null;
    });

  return refreshInFlight;
}

async function toApiError(response: Response): Promise<ApiError> {
  let body: { detail?: string; message?: string; violations?: Violation[] } = {};
  try {
    body = await response.json();
  } catch {
    // corps vide ou non JSON
  }

  const fallback: Record<number, string> = {
    401: 'Votre session a expiré, reconnectez-vous.',
    403: "Vous n'avez pas les droits pour cette action.",
    404: 'Élément introuvable.',
    429: 'Trop de tentatives, réessayez dans quelques minutes.',
  };
  const message = body.detail || body.message || fallback[response.status] || 'Une erreur est survenue.';

  return new ApiError(response.status, message, body.violations ?? []);
}

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  body?: unknown;
}

export async function api<T>(path: string, { method = 'GET', body }: RequestOptions = {}, retry = true): Promise<T> {
  const headers: Record<string, string> = { Accept: 'application/ld+json' };
  if (accessToken) headers.Authorization = `Bearer ${accessToken}`;
  if (body !== undefined) {
    headers['Content-Type'] = method === 'PATCH' ? 'application/merge-patch+json' : 'application/ld+json';
  }

  const response = await fetch(`/api${path}`, {
    method,
    headers,
    credentials: 'same-origin',
    body: body === undefined ? undefined : JSON.stringify(body),
  });

  if (response.status === 401 && retry) {
    if (await refreshAccessToken()) {
      return api<T>(path, { method, body }, false);
    }
    onSessionExpired();
  }

  if (!response.ok) {
    throw await toApiError(response);
  }

  return (response.status === 204 ? undefined : await response.json()) as T;
}

/**
 * Télécharge un export (Excel / PDF). Les exports exigent le JWT : on ne peut pas passer par un simple
 * lien, le fichier est récupéré puis enregistré sous le nom fourni par l'API (Content-Disposition).
 */
export async function downloadFile(path: string, retry = true): Promise<void> {
  const response = await fetch(`/api${path}`, {
    headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : {},
    credentials: 'same-origin',
  });

  if (response.status === 401 && retry && (await refreshAccessToken())) {
    return downloadFile(path, false);
  }
  if (!response.ok) {
    throw await toApiError(response);
  }

  const fileName = /filename="?([^";]+)"?/.exec(response.headers.get('Content-Disposition') ?? '')?.[1] ?? 'export';
  const url = URL.createObjectURL(await response.blob());
  const link = Object.assign(document.createElement('a'), { href: url, download: fileName });
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

export const authApi = {
  async login(email: string, password: string): Promise<void> {
    const response = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      credentials: 'same-origin',
      body: JSON.stringify({ email, password }),
    });
    if (!response.ok) {
      const error = await toApiError(response);
      // Message de l'API en anglais (« Invalid credentials. ») : on le traduit
      throw new ApiError(
        error.status,
        error.message.startsWith('Too many')
          ? 'Trop de tentatives échouées. Réessayez dans 15 minutes.'
          : 'Email ou mot de passe incorrect.',
      );
    }
    accessToken = ((await response.json()) as { token: string }).token;
  },

  /** Restaure la session après un rechargement de page, grâce au cookie de refresh */
  restoreSession: refreshAccessToken,

  async logout(): Promise<void> {
    await fetch('/api/auth/logout', { method: 'POST', credentials: 'same-origin' }).catch(() => {});
    accessToken = null;
  },
};
