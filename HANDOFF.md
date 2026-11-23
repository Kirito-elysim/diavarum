# Reprise du projet Diaverum

Dernière mise à jour : 23 novembre 2026 · entrée J-134 dans [JOURNAL_PROJET.md](JOURNAL_PROJET.md).

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

## Point 4 — J-024

Dernière validation par cours et parcours pour l'activité des IDE et le tableau de bord (`LatestValidation`) ; historique conservé. 176 tests API réussis. Non commité (depuis b4467d0). Reste : point 5 (écrans/exports, mode screen), logs de connexion, comptage des doublons en production.

## Point 5 — J-025

Écrans, Excel et PDF des statistiques partagent un seul calcul ; archivés comptés à part ; score moyen et durée moyenne affichés à l'écran ; test de rapprochement Excel/écran. 177 tests API réussis. `KPI_REGLES.md` mis à jour. Non commité (depuis a21e410). Lot 1 non terminé : logs de connexion (décision), doublons en production, revue visuelle des PDF.

## Logs de connexion — J-026

Décision : pas d'export des connexions/déconnexions. Reste du lot 1 : comptage des doublons en production, revue visuelle des PDF, recette des droits par rôle.

## Recette des droits sur les exports — J-027

Tests de droits par rôle sur tous les exports (IDE, cadre, administrateur national, hors centre, archivés, anonymes) ; défaut corrigé pour un utilisateur sans centre. Non commité (depuis dd3f925). Reste du lot 1 : doublons en production, rapprochement et revue visuelle des PDF.

## Suppression définitive — J-028

Décisions : six compétences ; suppression définitive d'un patient archivé (cadre/admin, confirmation par nom et prénom, effacement complet, trace sans donnée de santé), implémentée et testée. Reste au lot 2 : aligner éditeur/import sur six compétences, parcours de bout en bout, ratio de progression. Anonymisation : question ouverte (avis DPO). Non commité (depuis b5b6e65).

## Six compétences — J-029

Limite alignée (API déjà à six ; éditeur sur une constante unique ; tests aux limites). 189 tests API réussis. Non commité (depuis 64e601f). Reste du lot 2 : parcours de bout en bout, ratio de progression, tablette, questionnaire médical.

## Profil retiré, ratio, chronomètre — J-030

Onglet et carte « Profil patient » retirés (données conservées en base) ; ratio de progression corrigé (séances sélectionnées des deux côtés) ; chronomètre recetté par `e2e/stopwatch.mjs`. 190 tests API réussis. Non commité (depuis 795bcb3). Reste du lot 2 : parcours de bout en bout, tablette physique, questionnaire médical (plus d'emplacement dans la fiche), recette archivage/restauration.

## Parcours de bout en bout — J-031

Rejoué par un test d'API complet sur la base de test et par les scripts navigateur à écritures simulées (tous réussis). Le scénario réel `make e2e` n'a pas été lancé (il efface la base locale ; sauvegarde existante dans `backups/`). Écart à trancher : rappel dès un cours inachevé (code) ou à partir de trois (feuille de route). Non commité (depuis e1cf37e).

## Base de recette fictive — J-032

`make recette-base` crée la base dédiée `diaverum_recette` ; `RECETTE_BASE_FICTIVE.md` décrit le jeu de données et les résultats attendus ; `RecetteDatasetTest` les vérifie (écrans et Excel). Écart corrigé : statuts du bilan patient alignés sur les écrans. 197 tests API réussis. Non commité (depuis a73558a). Lot 4 géré par l'utilisateur. Reste du lot 5 : PDF, tablette, accès par rôle dans l'interface, recette client.

## Comparaison de périodes — J-033

Résultats : bouton Comparer, période B choisie comme A, écarts A − B sur la Vue d'ensemble, Séances, Centres, IDE ; sans export. Tests `e2e/compare-logic.mjs` et `e2e/results-compare.mjs`. Build de production réparé (import du profil supprimé dans `NewSessionPage`, cassé depuis e1cf37e) ; vérifier le front avec `npm run typecheck && npm run build`, pas avec `tsc -p .`. Non commité (depuis 4ff7e78).

## Poussée sur main — J-034

13 commits poussés (`2fb60dc..677d574`) : déploiement automatique Coolify déclenché, migration `Version20261112120000` incluse. Ne pas relancer de déploiement. Vérifier dans Coolify que le déploiement est terminé et `php` sain. Suivi de ce fichier non poussé (écrit après la poussée).

## Intégration S1 — Lancement de séance (J-053)

Le bloc blanc de « Prêt à commencer ? » présente le titre complet et les compétences déjà configurées dans le cours. Les deux blocs sont élargis ; le rappel de sécurité tient sur deux lignes aux tailles tablette simulées, et le lancement de S1 ouvre bien sa première page. Typecheck et build réussis, vérification navigateur avec API simulée ; tablette physique et police Euclid encore à vérifier. Aucun import ni déploiement. Prochaine action : valider ce rendu et reprendre la relecture de S1 page par page. Les sources et le contexte d'intégration S1/S2 sont consignés en J-052.

## Intégration S1 — Consigne page 1 (J-054)

« Touchez une carte pour répondre à la question. » est renseigné sur la page « Droits du patient 1/2 » dans le contenu versionné et la base Docker de développement. Libellé vérifié dans Chromium avec API simulée. Poursuivre la relecture de S1 page par page.

## Cartes à retourner — Consigne par défaut (J-055)

Le lecteur et les aperçus affichent « Touchez une carte pour répondre à la question. » pour les cartes à retourner lorsque ni la page ni le bloc ne renseigne de consigne. L'éditeur affiche le défaut sous le champ du bloc. Priorités vérifiées et rendu testé dans Chromium aux dimensions tablette en portrait et paysage. Poursuivre la relecture de S1.

## Questions non notées — S1 page 4 et règle commune (J-056)

Les QCU, QCM et associations non notés acceptent une validation neutre et ne contribuent pas au score, même si un ancien réglage active la correction. Règle partagée entre lecteur et aperçus, avec options de correction masquées dans l'éditeur pour les questions non notées. Page 4 de S1 déjà configurée ainsi dans la base de développement. Build, tests unitaires, tests API ciblés et vérifications Chromium réussis. Reprendre la relecture de S1 à la page suivante.

## S1 page 6 — Zoom des images (J-057)

Les blocs Image, dont l'illustration de la page 6 de S1, s'affichent sans loupe par défaut. La case « Autoriser le zoom sur cette image » active l'agrandissement dans le lecteur et les aperçus. Enregistrement et rendu testés avec API simulée en portrait et paysage. Poursuivre la relecture de S1.

## Carrousels — Coins arrondis (J-058)

Les illustrations des carrousels utilisent le même rayon de 16 px que les autres images dans le lecteur et les aperçus. Proportions et défilement vérifiés dans Chromium en portrait et paysage sur la page 5 de S1. Poursuivre la relecture de S1.

## S1 page 5 — Hauteur du carrousel (J-059)

Le carrousel « Personne de confiance 2/3 » utilise une zone d'image plus haute dans le contenu versionné et la base de développement. Hauteur et proportions vérifiées en portrait et paysage, avec contrôle du carrousel standard de la page 8. Poursuivre la relecture de S1.

## S1 page 5 — Carrousel extensible (J-061)

La variante réservée à « Personne de confiance 2/3 » remplit l'espace restant sous le bandeau, après la question et la légende. Rendu et défilement vérifiés dans Chromium en portrait et paysage, avec contrôle de la page 8. Poursuivre la relecture de S1.

## S1 page 9 — Légendes du carrousel (J-062)

« Faire connaître ses choix » est en gras sur la première image et les quatre légendes sont alignées à gauche. Correction dans le contenu versionné et la base de développement, avec contrôle dans Chromium en portrait et paysage. Poursuivre la relecture de S1.

## S1 page 10 — Texte et image (J-063)

Le paragraphe justifié est centré en hauteur à côté de l'image et contient « elle permet la sédation » dans le passage en gras. Contenu versionné et base de développement mis à jour, avec contrôle dans Chromium en portrait et paysage. Poursuivre la relecture de S1.

## S1 page 11 — Conclusion (J-064)

Image aux coins arrondis à gauche et texte à droite, aligné à gauche et centré en hauteur. Quatre tirets remplacent les puces rondes. Contenu versionné et base de développement mis à jour. Rendu vérifié en portrait et paysage dans Chromium. Poursuivre la relecture de S1.

## QCU et QCM — Consigne commune (J-065)

Le bandeau utilise « Touchez la ou les réponses qui vous paraissent exactes. » par défaut. La mention « Plusieurs réponses » est retirée du gabarit. Rendu vérifié dans Chromium en portrait et paysage. Poursuivre la relecture de S1.

## S1 validé par l'utilisateur — J-066

La validation éditoriale du cours 1 est explicite. Les dernières retouches de S1 et du gabarit partagé sont regroupées pour le commit local. Reprendre l'intégration du cours suivant. La recette sur tablette physique et la publication restent à traiter.

## S2 intégré en développement — J-067

Les 17 écrans de « Hygiène au centre de dialyse » sont disponibles localement avec le MP4 fourni à la page 4, sa transcription et les deux tentatives de classement à la page 15. Les questions non notées suivent la règle commune. L'import S2 local correspond au JSON du dépôt. Contrôles Chrome réussis en portrait et paysage. Poursuivre la relecture utilisateur à partir de la page 3. La validation éditoriale et la recette sur tablette physique restent à faire.

## S3, S4 et S5 intégrés en développement — J-068

S3 (20 écrans), S4 (13) et S5 (24) sont importés localement et concordent avec leurs fichiers JSON. Les écrans et médias ont été contrôlés dans Chromium en portrait et paysage. S3 « Après la dialyse » utilise provisoirement des cartes faute des six images et son exercice sur les symptômes est à valider à la relecture. Reprendre la validation éditoriale page par page de S2 à S5 avant la recette physique et la publication.

## S2 pages 1 et 2 — Relecture (J-069)

L'affirmation de la page 1 est en gras. La page 2 tient sur un écran aux dimensions tablette testées, avec trois légendes en fenêtres. Les autres pages à légendes conservent le rendu intégré. À la demande explicite de l'utilisateur, appliquer les retours suivants uniquement aux pages citées, sauf demande de généralisation.

## S2 page 3 — Précautions standard d'hygiène (J-070)

Illustration limitée à 320 px, texte centré en hauteur et expression demandée en gras. La page tient sans défilement aux quatre tailles tablette simulées. Contenu et base de développement mis à jour. Poursuivre avec les pages suivantes de S2.

## S2 page 5 — Deux techniques d'hygiène des mains (J-071)

Les deux illustrations ont été agrandies et leurs légendes sont en gras. La phrase est dans un encadré Important, avec seulement « 2 techniques différentes » en gras. Correction chargée en développement et vérifiée sans défilement aux quatre tailles tablette simulées. Poursuivre la relecture de S2.

## S2 page 5 — Encadré Important compact (J-072)

Encadré centré, ajusté à son contenu et espacé de 40 px des images. Variante activée uniquement sur cet encadré. Correction chargée en développement et vérifiée sans défilement aux quatre tailles tablette simulées. Poursuivre la relecture de S2.

## S2 page 5 — Icône Important à taille standard (J-073)

L'icône retrouve sa taille de 80 px sur tablette. L'encadré reste centré avec 40 px avant les images. Testé sans défilement en naviguant depuis la page précédente. Poursuivre la relecture de S2.

## S2 pages 5 et 6 — Espacement et comparaison (J-074)

Page 5, l'espace sous l'encadré Important passe à 52 px. Page 6, titres gras au-dessus des images agrandies, explications alignées à gauche et introduction en texte normal. Corrections chargées en développement et vérifiées sans défilement aux quatre tailles tablette simulées.

## S2 page 6 — Blocs d'explication centrés (J-075)

Illustrations portées à 320 px maximum et blocs d'explication de même largeur, centrés sous les images avec texte aligné à gauche. Correction chargée en développement et vérifiée sans défilement aux quatre tailles tablette simulées.

## S2 pages 6, 9 et 10 — Puces, pictos et texte (J-076)

Tirets à gauche et carrés à droite à p06. Sur l'écran des trois pictos (p09, identifié par le texte cité), introduction en texte normal, gras sélectif et pictos répartis sur la hauteur. À p10, tout le texte est à droite de l'image, centré en hauteur, avec le gras du storyboard. Corrections chargées en développement et vérifiées dans Chrome aux tailles tablette habituelles.

## S2 page 12 — Centrage et espace vertical (J-077)

Les textes sont centrés en hauteur par rapport à leur illustration et les gras suivent le storyboard. Disposition aérée activée uniquement pour la page 12, chargée localement et vérifiée sans défilement aux quatre tailles tablette simulées. Appliquer le principe de centrage, d'utilisation de l'espace et de fidélité aux gras du storyboard aux prochaines pages reprises, dans le périmètre demandé.

## S2 — Retrait de la page 16 (J-078)

La question sur les symptômes d'infection de l'abord a été retirée à la demande de l'utilisateur. Le cours comporte 16 écrans et les trois exercices restants sont numérotés de 1/3 à 3/3. Contenu versionné et base locale concordants sur cette modification.

## S2 — Commit demandé (J-079)

Le contenu final de la relecture S2 comporte 16 écrans et ses médias sont présents. Les changements sont regroupés dans le commit local de S2. La suite du lot 3 porte sur les cours suivants et la recette sur tablette physique.

## S3 pages 1 à 4 — Relecture (J-080)

Encadrés Important au-dessus des images des pages 1 et 3, gras du storyboard sur la page 1 et l'introduction de la page 2, puces carrées page 3, légendes en fenêtres page 4. La page 5 garde ses légendes intégrées. Corrections chargées en développement et vérifiées dans Chrome. Poursuivre la relecture de S3.

## S3 page 1 — Image élargie (J-081)

Image à 50 % de la largeur d'écran dans le lecteur, texte centré à droite. Correction limitée à la page 1 et chargée en développement. Aucun défilement en portrait et jusqu'à 53 px en paysage dans les tailles simulées.

## S3 pages 2 à 4 — Encadré, largeur et gras (J-082)

L'encadré Objectif de p02 est compact, centré et conserve l'icône standard. L'image de p03 prend la moitié de la largeur de l'écran. L'introduction de p04 est en gras. Corrections chargées en développement et vérifiées dans Chrome. P03 peut demander jusqu'à 36 px de défilement en paysage aux tailles testées.

## S3 page 1 — Image au-dessus des boutons (J-083)

L'image conserve 50 % de la largeur et tient entièrement au-dessus de la navigation, sans défilement aux quatre formats tablette simulés. Correction chargée uniquement sur p01 en développement.

## S3 pages 3 à 8 — Relecture (J-084)

Puces espacées p03, légendes intégrées p04, encadrés en premier p05/p06, fenêtres sans titre p05/p08 et petits repères p08. Encadré compact p07, illustration 170 px et texte 20 px pour tenir la ligne du coussin. Corrections chargées localement, contrôlées sur quatre tailles tablette.

## Retrait des listes à puces — J-085

Le texte des cours applique un retrait gauche de 10 px aux lignes à puces rondes, carrées et aux tirets. Vérifié sur les quatre puces de S3 page 1 aux quatre dimensions tablette habituelles. Les symboles existants sont conservés.

## S3 page 1 — Puces carrées (J-086)

Les quatre tirets sont remplacés par des carrés, avec le retrait de 10 px. Correction appliquée en développement et contrôlée dans Chromium aux quatre tailles tablette.

## S3 page 4 — Retour aux fenêtres (J-087)

Les deux repères ouvrent leurs légendes en fenêtres. Les légendes sous l'image sont retirées. Correction chargée en développement et vérifiée aux quatre tailles tablette.

## Légendes au clic — Texte seul (J-088)

Les fenêtres et panneaux de légende affichent le texte explicatif seul, sans titre ni numéro « Repère x ». Règle générale demandée par l'utilisateur, appliquée au lecteur et aux aperçus partagés. Fenêtres testées sur S3 p04 aux quatre tailles tablette.

## S3 page 6 — Liste imbriquée et image agrandie (J-089)

Image maximale de 430 px, deux puces carrées et sous-liste de quatre tirets sous « Pour éviter les erreurs de pesée dues aux vêtements ». Correction chargée localement et structure vérifiée dans Chromium aux quatre tailles tablette.

## Convention des colonnes — J-090

Convention enregistrée dans AGENTS.md : 1 colonne image / 1 texte = 50 % / 50 % ; 1 colonne image / 2 texte = 1/3 / 2/3 de la largeur de contenu disponible. À appliquer aux prochaines pages demandées.

## Répartition image/texte — Clarification en attente (J-091)

L'utilisateur cite p05, mais décrit le texte à droite de la liste imbriquée de p06. Question posée pour choisir entre « Quelle tenue avec un cathéter ? » et « Comment limiter les variations de poids liées à ma tenue ? ». Appliquer ensuite le 50 % / 50 % et les espacements standards uniquement à la page confirmée.

## S3 page 6 — Colonnes et espacement (J-092)

Page 6 uniquement : image et texte occupent chacun 50 % de l'espace après gouttière. Police 25 px et interligne standard conservés, marges supplémentaires des listes retirées. Base locale mise à jour et contrôles Chromium réussis aux quatre tailles tablette.

## Règle permanente — Préserver les pages validées (J-093)

Modifier uniquement la page explicitement demandée dans le cours concerné. Préserver la mise en page et le comportement des pages déjà relues ou validées. Toute généralisation exige une demande explicite de l'utilisateur. Les adaptations du gabarit commun doivent être optionnelles et activées uniquement sur la page visée. Règle également inscrite dans AGENTS.md.

## S3 page 6 — Interligne des listes corrigé (J-094)

Les li héritaient d'une règle globale à 1,65. La variante de p06 utilise désormais le même interligne de 1,375 que son texte courant (34,375 px pour 25 px). Famille CSS identique et colonnes égales vérifiées dans Chromium aux quatre formats.

## Homogénéité visuelle — J-095

Conserver la typographie et les espacements communs aux cours pour les éléments de même rôle, y compris les listes imbriquées. Toute variation demande une instruction spécifique de l'utilisateur. Respecter les exceptions déjà validées et limiter les retouches aux pages demandées. Règle inscrite dans AGENTS.md.

## S3 pages 7 et 8 — Colonnes et gras (J-096)

P07 utilise deux colonnes égales image/texte avec la typographie existante conservée. P08 met « prise en charge rapide » et « corriger la situation » en gras dans l'encadré. Corrections chargées en développement et vérifiées dans Chromium.

## S3 page 7 — Taille standard rétablie (J-097)

L'exception de 20 px est retirée. Le texte est à 25 px avec les colonnes 50 % / 50 %. Correction chargée en développement et mesurée dans Chromium aux quatre tailles tablette.

## S3 pages 9 et 10 — Gras et colonnes (J-098)

P09 : introduction en gras. P10 : un tiers image, deux tiers texte, encadré dans la colonne droite et formulation/gras vérifiés au storyboard. Corrections chargées localement et contrôlées dans Chromium aux quatre tailles tablette.

## S3 page 11 — Encadré sur le risque d'hémorragie (J-099)

« Pour limiter ce risque, il faut : » est en gras. La phrase manquante sur le respect des mesures de prévention apparaît dans un encadré Important sous le carrousel. Correction chargée localement et contrôlée dans Chromium.

## S3 page 11 — Paragraphe introductif encadré (J-100)

Le paragraphe sur la désinsertion d'une aiguille figure désormais dans un encadré Important avant le carrousel. Le second encadré reste après le carrousel. Correction chargée en développement et vérifiée dans Chromium.

## S3 — Page « Après la dialyse » supprimée (J-101)

À la demande de l'utilisateur, s3-p12 est retirée. Le cours compte 19 pages et les huit exercices commencent désormais en position 12. Contenu et base locale mis à jour, validation de structure réussie.

## S3 — Pages 14 à 17 retirées (J-102)

Les quatre pages ont été supprimées selon la numérotation après J-101. S3 compte 15 écrans et quatre exercices finaux numérotés de 1/4 à 4/4. Contenu et base locale mis à jour, structure vérifiée.

## S3 page 12 — Affirmation en gras (J-103)

L'affirmation sur la tenue pendant la pesée est intégralement en gras. Correction limitée à la question s3-p13, chargée dans la base locale.

## S3 page 13 — Exercice du storyboard diapositive 42 (J-104)

Le deuxième exercice demande quoi faire en priorité lors d'un malaise. Les quatre propositions du storyboard et le type QCM sont intégrés ; la réponse attendue est de prévenir un soignant. Correction chargée en développement et structure validée.

## S3 validé par l'utilisateur — J-105

Validation éditoriale explicite du cours 3 le 23 novembre 2026. S3 comporte 15 écrans et ses dernières corrections sont présentes dans le contenu local et la base de développement. Reprendre la relecture du cours suivant. Recette sur tablette physique et publication à traiter.

## S4 page 1 — Repères repositionnés (J-106)

Cinq repères disposés autour du rein, libellés numériques simples et explications en fenêtres sans titre. Correction chargée localement et cinq fenêtres testées aux quatre formats tablette.

## S4 pages 2, 3, 4 et 6 — Relecture (J-107)

Affirmations p02/p03 en gras, encadré p04 en premier. P06 : introduction dans un encadré Important, quatre marqueurs repositionnés et explications en fenêtres sans mention « Repère ». Contenu chargé localement et fenêtres vérifiées aux quatre formats tablette ; autres pages conservées. Poursuivre la relecture de S4.

## S4 page 1 — Encadré Important (J-108)

La phrase sur la filtration permanente du sang est dans un encadré Important avant l’image. Correction chargée localement, encadré et cinq fenêtres vérifiés aux quatre tailles tablette. Autres pages conservées.

## S4 page 1 — Encadré sous l’image (J-109)

Précision utilisateur : l’encadré Important sur la filtration permanente se trouve désormais sous l’image, remplaçant la position J-108. Modification limitée à p01 et chargée en base locale. Ordre des blocs contrôlé ; navigateur non rejoué.

## S4 pages 7 et 8 — Alignements (J-110)

P07 : textes centrés en hauteur avec les pictos et départs de colonnes alignés. P08 : encadré dans la colonne droite, image limitée en hauteur. Options activées sur ces seules pages, chargées en base locale. Build et contrôles Chrome aux quatre formats tablette réussis. Poursuivre la relecture S4.

## S4 pages 7, 9 et retrait page 13 (J-111)

P07 : ensembles picto/texte centrés en largeur et hauteur. P09 : introduction en gras. Ancienne p13 supprimée : S4 compte 12 pages, exercices 1/3 à 3/3. Corrections chargées localement ; build et contrôles Chrome réussis. Autres pages conservées, hors renumérotation des exercices.

## S4 page 7 — Bloc aligné et centré (J-112)

Remplace le centrage ligne par ligne de J-111 : bloc complet centré en largeur, pictos dans une même colonne et textes alignés à gauche sur un même axe. Variante CSS limitée à p07. Build et mesures Chrome aux quatre formats tablette réussis.

## S4 validé par l’utilisateur — J-113

Validation éditoriale explicite du cours 4 le 23 novembre 2026, sur ses 12 pages actuelles. Aucun commit ni déploiement demandé. Reprendre la relecture du cours 5 ; recette sur tablette physique et publication restantes. Divergence préexistante des positions de marqueurs p01 entre JSON et base à conserver en attention (J-109).

## S5 pages 1 à 10 — Relecture (J-114)

Image p01 limitée en hauteur, gras demandés p02/p03/p04/p07/p08 et DPCA p10, introductions p05/p06 en encadrés Important sous image/texte, légendes p09 en fenêtres sans repères sous l’image. Corrections chargées localement ; 7 tests PHP et contrôles Chrome aux quatre tailles tablette réussis. Pages suivantes inchangées. Poursuivre à p11.

## S5 pages 19, 23 et 24 supprimées (J-115)

Retrait selon la numérotation précédente à 24 pages : s5-p19, s5-p23 et s5-p24. S5 compte 21 pages ; les trois exercices restants sont renumérotés 1/3 à 3/3. Contenu et base locale mis à jour, 7 tests PHP réussis. Autres pages conservées. Poursuivre la relecture S5.

## S5 validé par l’utilisateur — J-116

Validation éditoriale explicite du cours 5 le 23 novembre 2026 sur ses 21 pages. Les cours S1 à S5 sont désormais validés éditorialement par l’utilisateur. Aucun commit ni déploiement dans cette intervention ; recette sur tablette physique et publication restent à traiter. Attendre la prochaine demande.

## S6 et S7 intégrés — J-117

Matrice source : `/Users/mahdjoub/Desktop/edi/Diaverum_EHD_test-matrice.xlsx`, onglets COURS 6 / COURS 7 uniquement ; ne pas extrapoler aux autres cours. Storyboards et graphismes dans `doc/integration/`. S6 comporte 20 pages et S7 18, trois compétences chacun. Pages barrées écartées (S6 SB18/SB22, S7 SB17/SB18), trois exercices finaux renumérotés par cours. Question finale orale S7 SB16 non notée, appréciée par l’IDE. Quiz formatifs sans correction ni score conformément à la règle utilisateur.

Fichiers `api/content/S6.json`, `S7.json`, médias sous `front/public/courses/S6/` et `S7/`, importés en base locale ; exports finaux concordants. Anciens contenus sauvegardés sous `/tmp/diaverum-before-J117-S6.json` et `...S7.json`. Aucun autre cours ni composant commun modifié lors de cette intégration.

Build, 9 tests PHP, dénominateurs de notation, 152 rendus Chrome aux quatre tailles tablette, cartes/carrousel/légendes et 16 quiz vérifiés. Plusieurs pages denses défilent ; grille S7 p09 jusqu’à 541 px en paysage 1024×768, sans réduction typographique. Prochaine action : relecture utilisateur S6/S7 puis recette physique. Aucun commit ni déploiement distant.

## Séances 8 à 16 intégrées — J-118

Source : notes Word `/Users/mahdjoub/Desktop/edi/Notes RDV conception ped. Diaverum EHD.docx`, sections 8 à 16 uniquement, storyboards et graphismes de `doc/integration/`. Le dossier S8 ajouté par l’utilisateur est utilisé. Matrice S6/S7 non utilisée. Contenus JSON et médias intégrés/importés localement : S8 21 pages, S9 17, S10 14, S11 19, S12 14, S13 14, S14 18, S15 10, S16 18 (145 écrans).

Exports locaux concordants ; sauvegardes initiales sous `/tmp/diaverum-before-J118-S8.json` à `...S16.json`. Build, 18 tests PHP, 580 rendus Chrome aux quatre tailles, cartes/carrousels/légendes et QCU/QCM vérifiés. Certaines pages défilent verticalement jusqu’à 498 px. Recette physique, gestes complets des classements/associations et lecture intégrale de la vidéo S11 restent à faire. Aucune modification des contenus S1–S7 ; extensions facultatives du gabarit pour recto illustré S11 et liste à pictos S8. Aucun commit ni déploiement.

Reprendre la relecture utilisateur S8–S16. Point éditorial ouvert S12 : contradiction de la source entre la correction « strictement au milieu du repas » et le texte sur les chélateurs du phosphore (« pendant le repas ou juste avant selon prescription »). Questions orales/personnelles non notées conformément à la convention existante.

## S6 pages 1, 3 et 13 — Relecture J-119

P01 : image pleine largeur au-dessus du texte via option ciblée. Introduction du carrousel « Il existe principalement… » (p03 actuelle, citée p02) et question des bonnes pratiques p13 en gras. Autres pages conservées. Build et Chrome aux quatre formats tablette réussis, corrections chargées localement. Poursuivre S6.

## S7 page 1 — Gras sélectif J-120

Seule l’expression « ligne de vie » reste en gras dans le corps du texte. Image, disposition, encadré et autres pages conservés. Champ ciblé chargé localement ; balisage et diff vérifiés, navigateur non rejoué. Poursuivre S7.

## S6 et S7 validés par l’utilisateur — J-121

Validation éditoriale explicite le 23 novembre 2026 : S6 20 pages et S7 18 pages, corrections J-119/J-120 incluses. S1 à S7 sont désormais validés éditorialement. S8 à S16 sont intégrés mais restent à relire/valider ; reprendre selon la prochaine demande. Aucun commit ni déploiement dans cette intervention. Recette physique et publication restent à traiter.

## S8 page 2 — Consigne secondaire masquée J-122

Le bandeau « Faites glisser chaque élément dans la bonne zone » est masqué uniquement sur s8-p02-b1 via option facultative. Consigne de page et texte conservés. Base locale mise à jour, build et diff réussis ; navigateur non rejoué. Poursuivre S8.

## S8 pages 5 à 8 — Relecture J-123

P05 : question en gras et espace adaptatif avant pictos. P06 : introduction en gras. P07 : quatrième ensemble centré sous la crème, trois colonnes conservées via variante ciblée. P08 : image au-dessus du texte. Autres pages préservées, base locale chargée, build et Chrome aux quatre formats tablette réussis. Poursuivre S8.

## S8 page 8 — Coins arrondis visibles J-124

Largeur ajustée au ratio réel de l’image et à sa limite de hauteur, option activée uniquement sur p08. Coins arrondis réels vérifiés aux quatre formats tablette. Convention durable inscrite dans AGENTS.md : illustrations toujours à bords arrondis, sans reprise globale des pages validées. Base locale mise à jour.

## S8 pages 10 à 16 — Relecture J-125

Centrage vertical ciblé p10/p13/p15/p16. Colonnes 50/50 p11/p12, quatre symptômes en liste à tirets p12. Options facultatives conservant les autres pages. Base locale chargée, build et contrôles Chrome aux quatre formats tablette réussis. Contenus trop hauts défilants. Poursuivre S8.

## S8 page 21 — Consigne secondaire masquée J-126

Le bandeau « Faites glisser chaque élément dans la bonne zone » est retiré sur p21 uniquement via `hideInstruction`. Question, classement et consigne de page conservés. Champ ciblé chargé localement ; autres pages inchangées, diff vérifié. Poursuivre S8.

## S8 validé par l’utilisateur — J-127

Validation éditoriale explicite le 23 novembre 2026 sur les 21 pages actuelles, corrections J-122 à J-126 incluses. S1 à S8 sont désormais validés éditorialement. Reprendre S9 à la prochaine demande ; S9–S16 restent à relire/valider. Aucun commit ni déploiement ; recette physique et publication restantes.

## S9 pages 1 et 9 — Relecture J-128

P01 : quatre fonctions de l’eau en liste à puces carrées. P09 : image à gauche et quatre explications visibles à droite en colonnes 50/50, encadré conservé, consigne de clic retirée. Autres pages conservées. Base locale mise à jour, Chrome aux quatre formats tablette et diff réussis. Poursuivre S9.

## S10 pages 1 et 2 — Relecture J-129

Pressions systolique/diastolique en liste à tirets p01 ; quatre chiffres p02 remplacés par la planche de pictos fournie et consigne adaptée. Identification par le texte cité, S9 conservé. Base locale mise à jour, Chrome aux quatre formats tablette et diff réussis.

## Picto Alerte commun — J-130

À la demande utilisateur, `front/public/pictos/warning.png` reprend le gyrophare fourni dans les graphismes S3. Applicable à tous les encadrés Alerte, lecteur et aperçus ; dimensions du composant conservées. Source identique et build vérifiés, aucune modification de contenu ou de base.

## S11 pages 1, 2, 5, 6, 7 et 9 — Relecture J-131

Listes à tirets p01/p05, contenu centré verticalement p02, images des cartes p06 portées à 120 px, derniers ensembles p07/p09 centrés sous la deuxième colonne. Autres pages conservées. Base locale mise à jour ; build, Chrome aux quatre formats tablette et diff réussis. Poursuivre S11.

## S12 pages 1 et 2 — Relecture J-132

P01 (identifiée par le texte cité malgré « page 11 ») : introduction avant carrousel, phrase sur le traitement adapté après. P02 : gras des notes rétablis dans les six versos via option facultative de texte formaté. Autres pages conservées. Base locale chargée, build et Chrome aux quatre formats tablette réussis. Poursuivre S12.

## S13 pages 7 et 8 — Relecture J-133

P07 : pictos et textes centrés verticalement. P08 : « Légère fièvre » centré sous « Rougeur ». Options existantes activées sur ces seules pages, base locale chargée, Chrome aux quatre formats tablette et diff réussis. Poursuivre S13.

## S1 à S16 validés éditorialement — J-134

Validation explicite jusqu’au cours 16 le 23 novembre 2026, puis commit demandé. Intégrations S3–S16, médias, corrections du gabarit et notes de suivi regroupés. Retouches existantes de l’éditeur reprises dans S4/S5/S7/S8/S14 pour conserver les versions locales relues ; exports et JSON concordants. Divergence S4 J-109 résolue. Build, 18 tests PHP et références médias vérifiés. Aucun déploiement ; recette physique et publication restent à traiter. Prochaine action : poursuivre selon la demande utilisateur.
