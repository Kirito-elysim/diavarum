/**
 * Mots de passe provisoires : faciles à dicter ou recopier (deux mots et un nombre),
 * mais conformes aux règles de l'API (12 caractères, robustesse « moyenne » de Symfony).
 */

export const PASSWORD_MIN_LENGTH = 12;

const WORDS = [
  'Soleil', 'Jardin', 'Riviere', 'Bateau', 'Montagne', 'Cerise', 'Nuage', 'Prairie',
  'Citron', 'Fleuve', 'Violette', 'Lavande', 'Sapin', 'Rocher', 'Plage', 'Etoile',
  'Colline', 'Abricot', 'Tulipe', 'Papillon', 'Moulin', 'Phare', 'Rivage', 'Glacier',
  'Cascade', 'Vallon', 'Mimosa', 'Prune', 'Castor', 'Renard', 'Dauphin', 'Mouette',
  'Cigale', 'Chamois', 'Canard', 'Verger', 'Bruyere', 'Falaise', 'Bambou', 'Corail',
];

function randomInt(max: number) {
  const values = new Uint32Array(1);
  crypto.getRandomValues(values);
  return values[0] % max;
}

/** Portage de PasswordStrengthValidator::estimateStrength (Symfony) : entropie estimée en bits */
export function passwordEntropy(password: string) {
  const bytes = new TextEncoder().encode(password);
  if (!bytes.length) return 0;
  const counts = new Map<number, number>();
  bytes.forEach((b) => counts.set(b, (counts.get(b) ?? 0) + 1));
  let control = 0, digit = 0, upper = 0, lower = 0, symbol = 0, other = 0;
  counts.forEach((_, chr) => {
    if (chr < 32 || chr === 127) control = 33;
    else if (chr >= 48 && chr <= 57) digit = 10;
    else if (chr >= 65 && chr <= 90) upper = 26;
    else if (chr >= 97 && chr <= 122) lower = 26;
    else if (chr >= 128) other = 128;
    else symbol = 33;
  });
  const pool = lower + upper + digit + symbol + control + other;
  const chars = counts.size;
  return chars * Math.log2(pool) + (bytes.length - chars) * (chars > 1 ? Math.log2(chars) : 0);
}

/** Même seuil que l'API (PasswordStrength::STRENGTH_MEDIUM) */
export function isStrongEnough(password: string) {
  return password.length >= PASSWORD_MIN_LENGTH && passwordEntropy(password) >= 80;
}

/** Exemple : « Lavande-Castor-47 » */
export function generateTemporaryPassword() {
  for (;;) {
    const first = WORDS[randomInt(WORDS.length)];
    const second = WORDS[randomInt(WORDS.length)];
    if (first === second) continue;
    const number = `${2 + randomInt(8)}${2 + randomInt(8)}`;
    const password = `${first}-${second}-${number}`;
    if (isStrongEnough(password)) return password;
  }
}
