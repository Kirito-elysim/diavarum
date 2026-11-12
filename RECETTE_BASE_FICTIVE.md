# Base de recette fictive (lot 5)

Jeu de données fictif et déterministe pour recetter les KPI, les écrans et les exports sur des résultats calculés à l'avance. Toutes les dates sont relatives au jour du chargement : les résultats ci-dessous restent vrais quel que soit ce jour. Aucune donnée réelle.

## Charger la base

```bash
make recette-base
```

Crée la base **dédiée** `diaverum_recette` (migrations, puis `app:recette:load`) sans toucher à la base de développement. La commande refuse toute base dont le nom ne contient pas « recette » ou qui contient déjà des comptes. Pour recommencer : supprimer la base (`DROP DATABASE diaverum_recette`) puis relancer.

Parcourir cette base dans l'application (vérifié le 12 novembre 2026) :

```bash
POSTGRES_DB=diaverum_recette docker compose up -d --force-recreate php worker && docker compose restart nginx
```

Revenir à la base de développement : `docker compose up -d --force-recreate php worker && docker compose restart nginx`.

Comptes (mot de passe `Recette2026!`, code de sécurité IDE `1234`, code national `9999`) : `recette.admin@diaverum.test` (administrateur national), `recette.cadre.paris@`, `recette.cadre.lyon@`, `recette.cadre.nice@` (cadres), `recette.ide.paris.a@`, `recette.ide.paris.b@`, `recette.ide.lyon@`, `recette.ide.nice@` (IDE), tous en `@diaverum.test`.

## Contenu

Trois centres : Recette Paris, Recette Lyon, Recette Nice. J = jour du chargement.

| Patient | Centre | État | Parcours et séances (score, durée) |
|---|---|---|---|
| Alice **Achevée** | Paris | éligible | **achevé** (clôturé J-40 par le cadre). S1 validé J-55 (80 %, 600 s) après une ancienne validation répétée J-58 (30 %, 700 s) ; S2 J-50 (60 %, 900 s) ; S3 J-45 **sans note** (300 s) ; post-test J-42 (70 %) |
| Bruno **EnCours** | Paris | éligible | **en cours** : S1 J-20 (100 %, 700 s), S2 J-3 (50 %, 500 s) |
| Carla **Inactive** | Paris | éligible | **inactif** : S1 J-20 (40 %, 400 s), plus rien depuis |
| David **NonDemarre** | Paris | éligible | **non démarré** : parcours créé, aucune séance |
| Emma **Interrompue** | Paris | éligible | **interrompu** (motif médical) : S1 J-32 (90 %, 800 s) |
| Félix NonEligible | Paris | non éligible | aucun parcours |
| Gaëlle EnAttente | Paris | en attente | aucun parcours |
| Hugo **Archivé** | Paris | archivé | parcours en cours, S1 J-10 (100 %) : hors de tous les indicateurs |
| Inès LyonEnCours | Lyon | éligible | **en cours** : S1 J-5 (70 %, 500 s) |
| Jules LyonEnAttente | Lyon | en attente | aucun parcours |
| Karim LyonArchivé | Lyon | archivé | aucun parcours |
| Léa NiceNonEligible | Nice | non éligible | aucun parcours |

IDE ayant validé : Alix IdeParisA (Alice, Carla, Hugo), Basile IdeParisB (Bruno, Emma), Lou IdeLyon (Inès). Noa IdeNice n'a rien validé.

## Résultats attendus (calculés à la main)

| Indicateur | National | Paris | Lyon | Nice |
|---|---|---|---|---|
| Patients non archivés | 10 | 7 | 2 | 1 |
| Patients archivés (hors indicateurs) | 2 | 1 | 1 | 0 |
| Éligibles / non éligibles / en attente | 6 (60 %) / 2 (20 %) / 2 (20 %) | 5 / 1 / 1 | 1 / 0 / 1 | 0 / 1 / 0 |
| Parcours | 6 | 5 | 1 | 0 |
| Non démarrés / inactifs / en cours / interrompus / achevés | 1 / 1 / 2 / 1 / 1 | 1 / 1 / 1 / 1 / 1 | 0 / 0 / 1 / 0 / 0 | 0 |
| Score moyen des parcours | 69 % : (70 + 75 + 40 + 90 + 70) / 5 | 69 % : (70 + 75 + 40 + 90) / 4 = 68,75 | 70 % | — |
| Durée moyenne d'un parcours achevé | 1 800 s (30 min) | 1 800 s | — | — |
| Séances validées | 9 | 8 | 1 | 0 |
| Score moyen des séances (hors post-test et cours sans note) | 70 % : 490 / 7 | 70 % : 420 / 6 | 70 % | — |

Par période (national) :

| Période | Score moyen des parcours | Durée moyenne | Séances validées | Score moyen des séances |
|---|---|---|---|---|
| 30 derniers jours | 62 % : (75 + 40 + 70) / 3 | — (aucun achevé) | 4 | 65 % |
| 60 derniers jours | 69 % | 1 800 s | 9 | 70 % |
| Période sans activité (J-400 à J-300) | — | — | 0 | — |
| Du jour de clôture au jour de clôture (J-40) | | 1 800 s | | |
| À partir de J-39, ou jusqu'à J-41 | | — | | |

Activité des IDE (dernière validation de chaque cours dans chaque parcours, archivés exclus) :

| IDE | Séances | Patients | Score moyen | Durée |
|---|---|---|---|---|
| IdeParisA Alix | 5 (l'ancienne validation de S1 à 30 % est remplacée) | 2 | 60 % | 2 200 s |
| IdeParisB Basile | 3 | 2 | 80 % | 2 000 s |
| IdeLyon Lou | 1 | 1 | 70 % | 500 s |
| IdeNice Noa | 0 | 0 | — | 0 |

Bilans patients : Alice Achevée = « Achevé », 4 séances validées sur 4, score moyen 70 %, post-test 70 % hors moyenne, durée totale 30 min, clôturé par le cadre de Paris, historique de 5 lignes (dont S1 à 30 % puis 80 %), S3 sans note (cellule vide, pas 0). David NonDemarre = « Non démarré », aucune séance. Statuts des bilans de Paris : Achevé, En cours, Inactif (15 jours), Non démarré, Interrompu, et « Aucun » pour les deux patients sans parcours.

## Vérification automatique

`api/tests/Api/RecetteDatasetTest.php` charge ce jeu de données dans la base de test et compare les écrans (API des statistiques, résultats personnels des IDE, cadre limité à son centre) et les exports Excel à ces valeurs, en dur. Ce n'est pas un second calcul du même code : un écart signale une régression ou une règle à rediscuter.

## Reste à faire en recette

Rapprochement des PDF avec les écrans, recette sur tablette, parcours soignant et patient, accès par rôle dans l'interface (les droits des exports sont déjà testés, voir `ExportRightsTest`).
