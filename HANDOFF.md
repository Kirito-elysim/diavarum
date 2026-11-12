# Reprise du projet Diaverum

Dernière mise à jour : 12 novembre 2026 · entrée J-022 dans [JOURNAL_PROJET.md](JOURNAL_PROJET.md).

## Point de départ

Application React/Vite dans `front/`, API Symfony dans `api/`, PostgreSQL via Docker Compose, tests navigateur dans `e2e/`. La cible est une plateforme de cours sur tablette avec back-office IDE, cadre et administrateur national.

Au moment de cette passation, branche `main`, dernier commit `2fb60dc`. Le dossier de travail contient des modifications et fichiers non suivis issus des travaux précédents, dont le code d'audit, la feuille de route et les nouvelles illustrations S1. Vérifier `git status --short` avant de reprendre. Les résultats ci-dessous portent sur l'état local testé.

## Références

- [AGENTS.md](AGENTS.md) définit les règles de suivi.
- [JOURNAL_PROJET.md](JOURNAL_PROJET.md) conserve les interventions et décisions dans l'ordre chronologique.
- [ROADMAP_PRODUCTION.md](ROADMAP_PRODUCTION.md) est la liste des tâches à réaliser et des critères de recette.
- [AUDIT_PRODUCTION.md](AUDIT_PRODUCTION.md) documente la passe technique et les vérifications historiques.
- [DEPLOYMENT.md](DEPLOYMENT.md) décrit le déploiement.
- Cahier des charges final fourni hors dépôt : `/Users/mahdjoub/Desktop/diaverum_cahier-des-charges-fonctionnel_&annexes_VF.pdf`. Demander une copie de cette version si le fichier n'est plus accessible. Les §2 à 9 couvrent parcours, cours, rôles, KPI et hébergement.

## État acquis et vérifications

- Lecteur et aperçus partagent le bandeau, la progression, les blocs et la navigation. Le code local accepte six compétences à la création et à la validation d'une séance.
- La passe précédente a validé 165 tests API, le build de production et la recette de 73 écrans sur deux orientations. Le démarrage et les imports S1/S99 ont été testés sur une stack de production locale isolée. Ces résultats sont historiques et doivent être revalidés pour la version livrée.
- Au dernier inventaire local, 29 des 33 cours officiels étaient sans écran. S1 est versionné et S99 sert de référence non publiée. Le questionnaire validé, le contenu du post-test et les polices Euclid Circular A restent à récupérer ou à confirmer.
- La conformité de l'hébergement cible reste à vérifier avec Diaverum. Aucun déploiement distant n'a été réalisé lors des passes précédentes.

## Décisions ouvertes et prochaine action

Les décisions courantes sont J-004 (validation unique) et J-008 (KPI hors archives, inactivité après 15 jours sans lancement ou validation). Voir `KPI_REGLES.md`. Le lot 1 est en cours ; bilans et exports attendent un point utilisateur avant modification. Les anciennes propositions non validées ne constituent pas des règles métier.

## Décision du 12 novembre 2026 — Validation unique

J-004 remplace la proposition J-002 sur les cours refaits. Une seule validation définitive par cours et parcours, pour tous les rôles. Une interruption permet de recommencer. Implémentation locale vérifiée par 166 tests API (906 assertions), build, TypeScript et test navigateur apprenant avec contrôle des boutons après validation. Le correctif JSON/JSON-LD des contrôleurs est inclus. Consulter J-004 pour les fichiers et limites. Reprendre ensuite le lot 1 avec cette règle et conserver les données historiques.

Le cadrage du lot 1 reprend en J-005. Prochaine décision à recueillir : présentation et dénominateurs des patients actifs, éligibles, non éligibles, en attente et archivés.

## Interface Parcours bis — J-006

Le lot 1 est reporté à la demande utilisateur. Une nouvelle vue Parcours bis reprend la maquette, avec quatre KPI sur les modules sélectionnés, filtres, tri, chapitres repliables et détails des validations. L’onglet Parcours historique est conservé. Ajout d’un onglet Compétences et d’un style actif orange (texte/icône et trait inférieur) pour les onglets de la fiche. Actions métier et verrouillage J-004 conservés. Pas de changement serveur.

Build, TypeScript, lint (six avertissements préexistants) et recette Playwright `node e2e/patient-program-bis.mjs` réussis avec API simulée (serveur par défaut 127.0.0.1:5173). Captures bureau/tablette inspectées, quatre largeurs sans débordement. Consulter J-006 pour le périmètre des KPI et les limites. Prochaine action : recueillir le retour sur la nouvelle vue ; les dénominateurs du lot 1 ne sont toujours pas validés.

### Ajout du score — J-007

Parcours bis affiche désormais le score enregistré de chaque séance validée, en pourcentage, dans le bloc date/durée. Un score nul affiche 0 %, une valeur absente « Non renseigné ». TypeScript et diff vérifiés ; aucun changement API ni calcul KPI.

## Lot 1 — Reprise J-008

Règles validées mises en œuvre : KPI des écrans sur les patients non archivés exclusivement ; archivés séparés dans leur gestion existante. Suivi des parcours : non démarré/en cours/inactif depuis 15 jours/interrompu/achevé ; statut d’activité calculé séparément du cycle de vie historique, sans blocage du lancement. Dernière activité persistée au lancement ou à la validation. Filtres/tri/compteurs des listes et écrans résultats mis à jour. Exclusions des archivés corrigées dans l’activité IDE et le tableau de bord.

Migration locale/test appliquée, schéma synchronisé. 170 tests API / 961 assertions réussis ; test complémentaire du tri réussi ; build, lint et recettes navigateur résultats/parcours et Parcours bis réussis. Script `e2e/lot1-kpi.mjs` nécessite E2E_EMAIL/E2E_PASSWORD à l’exécution, sans identifiants stockés.

Prochaine action : point utilisateur sur les bilans et exports **avant leur modification**. Les générateurs et leurs règles sont conservés ; correspondance avec les nouveaux KPI non certifiée. Restent notamment moyennes par chapitre, pondération/post-test, période des moyennes de parcours et traitement des doublons historiques. Détails dans `KPI_REGLES.md` et J-008. Aucun déploiement distant.

## Point bilans et exports — J-009

Cadrage présenté, sans changement fonctionnel. Prochaine décision : contenu du bilan individuel à date ; ensuite moyennes, post-test, périodes et doublons historiques. Les propositions de J-009 restent à valider avant implémentation.

## Identité visuelle — J-010

Logos officiels intégrés à la connexion, navigation latérale et en-tête mobile. SVG originaux dans `front/public/brand/`, favicon ICO et symbole SVG référencés dans index.html. Build et vérification navigateur des ressources réussis. Reprendre J-009 sur les bilans/exports, toujours sans arbitrage du contenu proposé.

## Passation à Claude — J-011

L’utilisateur confie la suite à Claude. Lire `CLAUDE.md` pour le point d’entrée, les cinq arbitrages bilans/exports non encore validés et les fichiers concernés. Aucune modification des exports autorisée par défaut avant le point fonctionnel demandé. Préserver le travail local et poursuivre la traçabilité commune.

## Point fonctionnel — J-012

Relecture faite (AGENTS, HANDOFF, KPI_REGLES, lot 1, J-005 à J-011) et code de reporting réel inspecté pour fonder le point. Point fonctionnel présenté à l’utilisateur sur les cinq arbitrages de `CLAUDE.md`, avec l’écart screen/export confirmé dans le code (`ReportingController`, `StatisticsBuilder`). Aucune modification des bilans/exports. Prochaine action : recueillir les arbitrages de l’utilisateur point par point, puis implémenter uniquement ceux validés.

## Point 1 validé et implémenté — J-013

Bilan patient (PDF et Excel) : non démarré = identité/éligibilité/statut ; IDE par cours et « clôturé par » ; logo Diaverum dans les PDF. Tests du reporting réussis. Prochaine action : arbitrer le point 2 (moyennes).

## Historique des séances et CODEX — J-014

Bilan patient : feuilles Historique des séances et CODEX dans l'Excel uniquement ; le PDF reste inchangé hors point 1. Logs de connexion/déconnexion non ajoutés : le journal d'accès concerne les comptes soignants (admin national uniquement), pas les patients — décision utilisateur attendue. Prochaine action : trancher ce point, puis point 2 (moyennes).

## Annulation de la validation — J-015

Un cadre ou l'administrateur national peut annuler la validation d'un parcours achevé (motif obligatoire, sans délai, tracé au journal d'accès). Les cours validés restent verrouillés. 171 tests API réussis. Prochaine action : point 2 (moyennes) ; décision sur les logs de connexion toujours en attente.

## Sélection et exports de la liste patients — J-016

`/patients` : « Patients actifs », cases à cocher, Excel et PDF de la sélection (PDF : 50 patients maximum, un par page). 171 tests API réussis. Non commité.

## Import de patients — J-017

Archivé dans le même centre = erreur ; homonyme et patient existant dans un autre centre (périmètre de l'auteur) = avertissements non bloquants. 172 tests API réussis. Affichage non contrôlé dans le navigateur ; rien commité depuis bef0c36.

## Création manuelle de patient — J-018

Mêmes règles que l'import : doublon actif ou archivé dans le même centre refusé (aussi côté API), homonyme et patient d'un autre centre = avertissement avec « Créer quand même ». Service `PatientDuplicates` partagé. 173 tests API réussis. Rien commité depuis bef0c36.

## Moyennes et choix des séances — J-019

Point 2 validé : post-test hors moyenne du parcours et affiché à part ; moyenne de chapitre dans Parcours bis ; panneau « Choisir les séances » dans Parcours bis. 174 tests API réussis. Non commité. Prochaine action : point 3 (durées, période, post-test dans les statistiques).


## Maquette du bilan PDF patient — J-020

Présentation appliquée aux exports PDF individuels et de sélection : quatre KPI, tableau sans Chapitre, compétences en pastilles et total validé/sélectionné. Données et post-test J-019 conservés ; Excel inchangé. Nouveau layout dédié aux patients, statistiques préservées. Gabarits Twig valides, PDF fictifs inspectés (bilan 1 page, sélection longue 6 pages avec non démarré), diff sans erreur. Aucun accès à la base ni déploiement. Logo officiel du dépôt et police DejaVu Sans diffèrent de la maquette ; reproduction typographique exacte non certifiée. Suite : retour utilisateur, puis point 3 des arbitrages toujours ouvert.


## PDF patient compact — J-021
À la demande utilisateur, police et espacements réduits, colonne des titres élargie, statut « Interrompu » à 16 pt sans débordement. Gabarits partagés aux exports individuels et sélection. Lint Twig et diff réussis ; rendu fictif de 26 séances longues réduit de 7 à 3 pages, toutes inspectées. Aucun changement de données ou de calcul, aucune base utilisée ni déploiement. Prochaine action : réexport utilisateur pour confirmer la densité sur son bilan ; point 3 métier toujours ouvert.

## Optionnelles en popup — J-020

Parcours bis : bouton « Choisir optionnel » et popup des séances optionnelles (remplace le panneau de J-019). Non commité depuis bef0c36 + d0b502c. Prochaine action : point 3.


## Bilan sur deux pages — J-022
Tableau optimisé : code et titre sur la même ligne, compétences continues avec coches, texte 7,5 pt et marges verticales 0,6 mm. Jeu fictif de 26 séances longues : 2 pages, récapitulatif inclus, toutes deux inspectées ; lint Twig et diff réussis. Aucun changement de données ni déploiement. Relancer l’export utilisateur pour confirmer ; deux pages ne sont pas une limite forcée pour les bilans plus volumineux.

## Création du parcours avec optionnelles — J-021

Le bouton « Créer le parcours » ouvre une popup : systématiques grisées, optionnelles à cocher. Testé sur un patient de test supprimé ensuite. Non commité (J-019 à J-021). Prochaine action : point 3.

## Point 3 — J-023

Statistiques : score moyen des parcours (avec une séance validée dans la période, post-test exclu) et durée moyenne (parcours achevés dans la période) suivent la période ; post-test hors moyennes, compté comme séance réalisée. 175 tests API réussis. Non commité (depuis 54697b1). Reste : points 4 (anciens doublons de validation) et 5 (exports, mode screen), logs de connexion en attente.
