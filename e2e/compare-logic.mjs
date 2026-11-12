// Comparaison de périodes : écarts, périodes prédéfinies et « période précédente », sans serveur.
import assert from 'node:assert/strict';
import { delta, tone, signed, asPoints, asMinutes } from '../front/src/lib/compare.ts';
import { presetPeriod, previousPeriod } from '../front/src/lib/period.ts';

// Écart A − B et en % de B
assert.deepEqual(delta(80, 70), { diff: 10, percent: 14 });
assert.deepEqual(delta(50, 100), { diff: -50, percent: -50 });
assert.deepEqual(delta(5, 0), { diff: 5, percent: null }, 'Base B nulle : pas de pourcentage');
assert.deepEqual(delta(0, 0), { diff: 0, percent: null });
assert.deepEqual(delta(null, 3), { diff: null, percent: null }, 'Valeur absente : aucun écart');
assert.deepEqual(delta(3, undefined), { diff: null, percent: null });
assert.deepEqual(delta(3, -2), { diff: 5, percent: 250 }, 'Pourcentage rapporté à la valeur absolue de B');

// Couleur : seulement pour les indicateurs « plus haut = mieux »
assert.equal(tone(5, 'up'), 'good');
assert.equal(tone(-5, 'up'), 'bad');
assert.equal(tone(0, 'up'), 'neutral');
assert.equal(tone(5, 'neutral'), 'neutral');
assert.equal(tone(null, 'up'), 'neutral');
assert.equal(signed(3), '+3');
assert.equal(signed(-3), '−3');
assert.equal(signed(0), '0');
assert.equal(asPoints(-4), '−4 pts');
assert.equal(asMinutes(-1800), '−30 min');

// Périodes prédéfinies (aujourd'hui = 12 novembre 2026) : un mois contre un autre mois, un trimestre contre un autre
const today = new Date('2026-11-12T12:00:00');
assert.deepEqual(presetPeriod('month', today), { from: '2026-11-01', to: '2026-11-12' });
assert.deepEqual(presetPeriod('lastMonth', today), { from: '2026-10-01', to: '2026-10-31' });
assert.deepEqual(presetPeriod('quarter', today), { from: '2026-10-01', to: '2026-11-12' });
assert.deepEqual(presetPeriod('lastQuarter', today), { from: '2026-07-01', to: '2026-09-30' });
assert.deepEqual(presetPeriod('year', today), { from: '2026-01-01', to: '2026-11-12' });
assert.deepEqual(presetPeriod('lastYear', today), { from: '2025-01-01', to: '2025-12-31' });
assert.deepEqual(presetPeriod('30d', today), { from: '2026-10-14', to: '2026-11-12' });
assert.deepEqual(presetPeriod('all', today), { from: null, to: null });
// Passage d'année et mois de 28 jours
const january = new Date('2027-01-15T12:00:00');
assert.deepEqual(presetPeriod('lastMonth', january), { from: '2026-12-01', to: '2026-12-31' });
assert.deepEqual(presetPeriod('lastQuarter', january), { from: '2026-10-01', to: '2026-12-31' });
assert.deepEqual(presetPeriod('lastMonth', new Date('2026-03-10T12:00:00')), { from: '2026-02-01', to: '2026-02-28' });
assert.deepEqual(presetPeriod('lastMonth', new Date('2028-03-10T12:00:00')), { from: '2028-02-01', to: '2028-02-29' }, 'Année bissextile');

// Période précédente de même durée, immédiatement avant
assert.deepEqual(previousPeriod({ from: '2026-11-01', to: '2026-11-12' }, today), { from: '2026-10-20', to: '2026-10-31' });
assert.deepEqual(previousPeriod(presetPeriod('30d', today), today), { from: '2026-09-14', to: '2026-10-13' });
assert.deepEqual(previousPeriod({ from: '2026-10-01', to: '2026-10-31' }, today), { from: '2026-09-01', to: '2026-09-30' }, 'Un mois civil complet : le mois précédent');
assert.deepEqual(previousPeriod({ from: '2026-03-01', to: '2026-03-31' }, today), { from: '2026-02-01', to: '2026-02-28' }, 'Mars → février (28 jours)');
assert.deepEqual(previousPeriod({ from: '2026-01-01', to: '2026-01-31' }, today), { from: '2025-12-01', to: '2025-12-31' }, 'Janvier → décembre de l\'année précédente');
assert.deepEqual(previousPeriod({ from: '2026-07-01', to: '2026-09-30' }, today), { from: '2026-04-01', to: '2026-06-30' }, 'Un trimestre complet : le trimestre précédent');
assert.deepEqual(previousPeriod({ from: '2025-01-01', to: '2025-12-31' }, today), { from: '2024-01-01', to: '2024-12-31' }, 'Une année complète : l\'année précédente');
assert.deepEqual(previousPeriod(presetPeriod('lastMonth', today), today), { from: '2026-09-01', to: '2026-09-30' }, 'Le préréglage « Mois précédent » se compare au mois d\'avant');
assert.deepEqual(previousPeriod({ from: '2026-10-05', to: '2026-11-04' }, today), { from: '2026-09-04', to: '2026-10-04' }, 'Dates libres (31 jours) : 31 jours avant');
assert.deepEqual(previousPeriod({ from: '2026-02-03', to: '2026-02-28' }, today), { from: '2026-01-08', to: '2026-02-02' }, 'Mois incomplet : même nombre de jours');
assert.deepEqual(previousPeriod({ from: '2026-05-10', to: '2026-05-10' }, today), { from: '2026-05-09', to: '2026-05-09' }, 'Un seul jour');
assert.deepEqual(previousPeriod({ from: '2026-11-01', to: null }, today), { from: '2026-10-20', to: '2026-10-31' }, 'Sans borne de fin : jusqu\'à aujourd\'hui');
assert.equal(previousPeriod({ from: null, to: null }, today), null, 'Toute l\'activité : rien ne précède');
assert.equal(previousPeriod({ from: null, to: '2026-10-31' }, today), null);

console.log('Comparaison de périodes : écarts, couleurs, périodes prédéfinies, période précédente (mois, trimestre, année bissextile) — OK');
