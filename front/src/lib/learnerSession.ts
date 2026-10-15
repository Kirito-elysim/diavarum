/** Verrou du lecteur dans cet onglet, conservé lors d’un rechargement. */
const key = 'diaverum:learner-session';
export function lockLearnerSession(userId: string, url: string) {
  sessionStorage.setItem(key, JSON.stringify({ userId, url }));
}
export function unlockLearnerSession() {
  sessionStorage.removeItem(key);
}
export function learnerSessionUrl(userId: string): string | null {
  try {
    const value = JSON.parse(sessionStorage.getItem(key) ?? 'null');
    return value?.userId === userId && typeof value.url === 'string' && value.url.startsWith('/sessions/run?') ? value.url : null;
  } catch { return null; }
}
