# Journal du projet Diaverum

Ajouter les nouvelles entrées à la suite. Utiliser un identifiant stable, une date en heure de Paris et un lien vers le lot ou la tâche concernée.

## J-001 — 12 novembre 2026 — Mise en place de la passation

- **Demande** : permettre à l'utilisateur de suivre les interventions et décisions de l'IA et à un autre agent de reprendre le projet.
- **Changements** : création des règles dans [AGENTS.md](AGENTS.md), de l'état de reprise dans [HANDOFF.md](HANDOFF.md) et du présent journal.
- **Décision validée par l'utilisateur** : consigner chaque intervention et décision à partir de cette demande.
- **Choix d'organisation** : garder l'état courant dans le handoff, l'historique dans le journal et les tâches dans la feuille de route. Les arbitrages métier restent ouverts.
- **Vérification** : branche `main` et commit `2fb60dc` relevés, état local inspecté et références contrôlées. Pas de nouveau résultat applicatif pour cette intervention documentaire.
- **Suite** : démarrer les arbitrages du lot 0 de la [feuille de route](ROADMAP_PRODUCTION.md), puis consigner chaque décision avec sa source.

<!-- Modèle à recopier pour la prochaine intervention

## J-XXX — AAAA-MM-JJ — Titre

- **Demande et lot** :
- **Changements et fichiers** :
- **Décisions, motif, source et état de validation** :
- **Vérifications et résultats** :
- **Blocages ou limites** :
- **Suite et point de reprise** :

-->

## J-002 — 12 novembre 2026 — Ouverture du cadrage du lot 1

- **Demande et lot** : commencer la discussion sur les KPI, bilans et exports du lot 1.
- **Changements** : mise à jour du point de reprise dans HANDOFF.md.
- **Proposition en attente** : séparer le volume d'activité sur une période (chaque séance validée compte) de la progression patient (une validation retenue par cours), au regard des §7.1 à 7.3. Exemple : un même cours validé en octobre et en novembre donne une séance dans chaque mois et un cours validé dans le parcours.
- **Vérifications** : relecture du lot 1 et des constats de reporting existants. Aucun calcul applicatif modifié ni testé à ce stade.
- **Suite** : recueillir l'arbitrage sur les séances refaites, puis cadrer les archivés et la règle des 15 jours.

## J-003 — 12 novembre 2026 — Code tablette de démonstration

- **Demande** : retrouver le code tablette du compte IDE avant de poursuivre le lot 1.
- **Vérification** : valeur par défaut vérifiée dans le chargeur de données de démonstration. Aucun code consigné dans ce journal et aucune modification de compte.
- **Suite** : reprendre l’arbitrage sur les séances refaites (J-002).

## J-004 — 12 novembre 2026 — Validation unique d’un cours

- **Décision utilisateur** : un cours définitivement validé avec les compétences ne peut être réalisé et validé qu’une fois. Une séance interrompue peut être recommencée. Cette décision remplace la proposition de répétition après validation de J-002.
- **Périmètre retenu** : verrouillage du cours pour le patient dans son parcours. La consultation de la bibliothèque générale reste disponible. Les validations historiques déjà présentes sont conservées.
- **Changements** : contrôle dans TrainingWorkflow, transactions et verrou du parcours pour sérialiser lancement, validation et interruption. Retrait des boutons de relance et d’aperçu des cours validés dans la fiche patient, exclusion du sélecteur de nouvelle séance et du cours suivant. Refus d’ajout de compétences à une séance terminée.
- **Diagnostic complémentaire** : le test navigateur a révélé un HTTP 415 sur le code IDE. Les contrôleurs avec MapRequestPayload acceptent explicitement JSON et JSON-LD, formats déjà utilisés par le client.
- **Vérifications en cours** : suite API passée à 166 tests et 906 assertions. TypeScript et build réussis. Recette navigateur relancée après correction du format.
- **Suite** : terminer la recette et reprendre le lot 1 avec la règle de validation unique.
- **Résultats finaux** : 166 tests API, 906 assertions réussies. Build et contrôle TypeScript réussis, ESLint sans erreur (six avertissements existants). Test navigateur apprenant réussi jusqu’au retour à la fiche et à l’absence des boutons de relance/aperçu du cours validé. La fixture navigateur a été adaptée aux statuts de validation et aux rappels hérités des données de démonstration.
- **Limite de vérification** : transactions et verrous SQL ajoutés, sans test de charge de requêtes simultanées dans cette passe. Les doublons historiques restent à traiter lors du rapprochement des KPI.

## J-005 — 12 novembre 2026 — Reprise du cadrage KPI

- **Demande** : expliquer les actions restantes du lot 1 après la validation unique J-004.
- **État** : la règle de validation unique est acquise. Les dénominateurs patients, la définition de l’activité pour les 15 jours et le périmètre des moyennes restent à préciser.
- **Proposition** : commencer par le comptage des patients avec une distinction entre file active et dossiers archivés, puis définir l’inactivité, les moyennes et les bilans. Propositions à valider, aucune modification des calculs.
- **Suite** : faire valider la présentation et les dénominateurs des KPI patients avant implémentation.

## J-006 — 12 novembre 2026 — Maquette Parcours bis

- **Demande utilisateur** : suspendre le lot 1, conserver Parcours et ajouter Parcours bis selon la capture fournie, avec KPI, onglet Compétences et sélection orange soulignée. Garder les actions de validation/clôture du parcours, exclure les boutons de compétences globales et de validation d’étape.
- **Choix technique** : nouvelle vue indépendante, actions métier existantes réutilisées ; KPI sur les modules sélectionnés du parcours courant, sans filtre de période. Aucun chiffre illustratif repris comme donnée réelle.
- **Travail en cours** : intégration et recette responsive ; préserver le verrouillage après validation J-004.
- **Fichiers** : nouveau `front/src/components/PatientProgramBis.tsx`, intégration dans `PatientDetailPage.tsx`, style actif limité aux onglets de la fiche dans `index.css`, typage des évaluations déjà exposées dans `api/types.ts`, recette `e2e/patient-program-bis.mjs`.
- **Résultat** : onglet historique conservé ; nouvelle vue avec progression circulaire, compteurs, filtres, tri et chapitres repliables. Onglet Compétences en lecture seule, évaluations réelles de la dernière séance validée de chaque module du parcours courant. Validation/clôture réutilisent les contrôles métier et permissions existants. Aucune relance ni prévisualisation d’un cours validé.
- **Règles des KPI locaux** : numérateur = modules sélectionnés validés ; dénominateur = tous les modules sélectionnés, pourcentage arrondi ; en cours = sélectionnés non terminés, y compris interrompus ; à réaliser = sélectionnés non démarrés. Sans période. Les arbitrages nationaux du lot 1 restent ouverts. Pas de pourcentage fictif de progression à l’intérieur d’un cours : donnée non disponible.
- **Vérifications** : build et TypeScript réussis ; ESLint 0 erreur, 6 avertissements existants ; diff sans erreur de whitespace. Recette Playwright réussie avec API simulée : compteurs, filtres, tri, repli, compétences, onglet historique, boutons métier, verrouillage et couleur du texte/icône/soulignement actifs. Absence de débordement à 1536, 1024, 768 et 390 px ; captures bureau/tablette inspectées. En-tête partagé rendu repliable pour corriger le débordement mobile, sans changement de métier.
- **Diagnostic** : fixture navigateur corrigée pour ne pas intercepter les imports Vite ; attente de fin de transition couleur ajoutée. Serveur Vite local sur 127.0.0.1:5173 pour la recette.
- **Limites** : aucune écriture réelle, aucun déploiement, API serveur non modifiée. Chargement des libellés via les ressources de compétences existantes et cache React Query. Polices Euclid toujours absentes. Les libellés historiques restent ceux du référentiel courant (versionnement déjà prévu en roadmap).
- **Suite** : retour utilisateur sur Parcours bis ; reprise du cadrage du lot 1 ultérieurement selon sa demande.

## J-007 — 12 novembre 2026 — Score dans Parcours bis

- **Demande utilisateur** : afficher le score des séances validées.
- **Changement** : `PatientProgramBis.tsx` affiche le score en pourcentage à côté des métadonnées de validation. Source : score déjà enregistré du module du parcours ; zéro est affiché, absence de score indiquée « Non renseigné ». Aucun calcul métier modifié.
- **Vérifications** : TypeScript et `git diff --check` réussis. Pas de nouvelle recette navigateur pour cet ajout de texte.
- **Suite** : retour sur la vue ; cadrage du lot 1 toujours reporté.

## J-008 — 12 novembre 2026 — Lot 1, archivage et inactivité

- **Décisions utilisateur** : KPI limités aux patients non archivés ; archivés traités séparément comme soft delete. Inactivité après 15 jours sans lancement ni validation, distinction jamais démarré, reprise automatique au lancement, statuts interrompu/achevé prioritaires. Une consultation ne compte pas.
- **Restriction utilisateur** : refaire un point avant toute modification des bilans et exports. Travaux limités aux écrans/API de suivi ; restitution et exports existants conservés.
- **Choix technique** : statut d’activité calculé séparément du statut métier historique pour conserver les workflows et exports ; horodatage persistant de dernière activité avec reprise de l’historique existant.
- **Changements** : `TrainingProgram` expose `lastActivityAt` et `activityStatus` ; lancement/validation les alimentent dans `TrainingWorkflow`. Migration `Version20261112120000` reprend les dates historiques. Deux filtres Doctrine calculent le statut et son tri avant pagination ; `SummaryController` fournit les effectifs correspondants. Les écrans parcours, fiche patient et résultats IDE/centre/national affichent cette distinction. Les générateurs et routes d’exports conservent le mode historique de StatisticsBuilder.
- **Archivage** : correction de l’exclusion des archivés dans l’activité IDE de la synthèse et dans les séances/modules/événements du tableau de bord. Les autres agrégats excluaient déjà les archivés. Ajout de la visibilité des non éligibles et des pourcentages d’éligibilité. Invalidation des caches de listes/KPI lors d’archivage/restauration. Sources et règles détaillées dans `KPI_REGLES.md`.
- **Vérifications** : suite API complète 170 tests, 961 assertions réussies, puis test ciblé activité 3 tests/45 assertions après ajout du contrôle du tri. Build/TypeScript réussis, lint sans erreur (six avertissements préexistants). Migration appliquée aux bases locale et test ; schéma Doctrine synchronisé, cache local vidé. Aucune migration distante ni déploiement. Recette navigateur en lecture seule contre l’API locale réussie pour les résultats, catégories, filtres et tri. Régression Parcours bis réussie sur quatre largeurs avec API simulée.
- **Diagnostics** : premières assertions de collection corrigées pour le JSON simple des tests (différent du JSON-LD navigateur). Une assertion de couleur a été adaptée à la fin de transition et au format rgba équivalent. Contrôle automatique : première tentative de script refusée car mot de passe stocké en clair ; script réécrit avec variables d’environnement, recette exécutée sans secret enregistré dans ce script.
- **Limites et suite** : le lot 1 n’est pas clos. Faire le point avant les bilans/exports : statut selon l’état du parcours, moyenne par chapitre, pondération/post-test, portée temporelle des moyennes de parcours, anciennes validations multiples et rapprochement écrans/exports. Ne pas présenter comme finalisés ces calculs conservés. Les KPI d’archivés séparés signifient ici la gestion des archives existante, pas une proportion ajoutée dans les KPI actifs. Les polices Euclid restent manquantes.

## J-009 — 12 novembre 2026 — Cadrage des bilans et exports

- **Demande** : expliquer les points à prévoir avant modification.
- **État vérifié** : relecture de HANDOFF et KPI_REGLES ; aucune modification fonctionnelle ni test applicatif dans cette intervention.
- **Propositions en attente** : bilan patient complet à date avec détail par cours/chapitre, score du post-test séparé ; moyennes simples des notes disponibles sans transformer une absence en zéro ; durée totale sur séances validées et durée moyenne de parcours sur les achevés ; filtres explicites sur synthèses ; Excel détaillé et PDF lisible issus de mêmes données. Distinguer proposition et règles déjà validées (non archivés, inactivité, validation unique).
- **Suite** : valider d’abord le contenu du bilan individuel, puis les calculs et la période des synthèses. Arbitrer les anciens doublons avant rapprochement définitif. Aucun générateur/export modifié.

## J-010 — 12 novembre 2026 — Logos et favicon officiels

- **Demande** : fourniture du logo complet, symbole SVG et favicon ICO ; intégration aux emplacements de marque existants.
- **Changements** : fichiers originaux copiés sans modification dans `front/public/brand/` et `front/public/favicon.ico`. Logo complet sur connexion, barre latérale et en-tête mobile ; symbole SVG comme favicon moderne avec ICO de compatibilité dans `front/index.html`. Proportions conservées et texte alternatif présent.
- **Vérifications** : build/TypeScript et diff réussis. Navigateur local : logo de connexion chargé, trois ressources accessibles ; capture tablette inspectée. Pas de modification métier, des cours ou des exports.
- **Suite** : reprendre le point bilans/exports J-009, dont les propositions attendent toujours validation.

## J-011 — 12 novembre 2026 — Passation à Claude

- **Demande utilisateur** : Claude reprend le sujet des bilans et exports.
- **Changements** : création de `CLAUDE.md` comme point d’entrée vers les instructions communes, décisions acquises, cinq arbitrages ouverts, fichiers de reporting, écarts temporaires et vérifications historiques. Handoff actualisé.
- **Vérifications** : relecture des documents de suivi et état Git ; aucune modification fonctionnelle, aucun test applicatif ou transfert de données externe.
- **Suite** : Claude doit cadrer avec l’utilisateur les propositions J-009 avant modification des bilans/exports. Aucun arbitrage supplémentaire validé dans cette passation.

## J-012 — 12 novembre 2026 — Reprise par Claude et point fonctionnel

- **Demande utilisateur** : lire le handoff et reprendre le sujet.
- **État vérifié** : relecture d'AGENTS.md, HANDOFF.md, KPI_REGLES.md, du lot 1 de ROADMAP_PRODUCTION.md et de J-005 à J-011. `git status --short` conforme à la description du handoff (travaux locaux préservés, rien réinitialisé). Relecture du code réel pour fonder le point : `PatientReportBuilder.php`, `StatisticsBuilder.php`, `ReportingController.php`, `SpreadsheetWriter.php`. Confirmation dans le code de l'écart décrit en CLAUDE.md : `ReportingController::buildStatistics` passe `screen: true` pour `/api/statistics` (écrans) et `screen: false` (défaut) pour les exports `.xlsx`/`.pdf` ; `StatisticsBuilder::aggregate` utilise `activityStatus` pour les écrans et l'ancien `ProgramStatus` pour les exports ; `StatisticsBuilder::nurses` n'exclut les patients archivés (`removedAt`) que pour les écrans, pas pour les exports. Aucune modification fonctionnelle, aucun test applicatif.
- **Suite** : présentation à l'utilisateur du point fonctionnel sur les cinq arbitrages de CLAUDE.md (bilan patient, moyennes, durées/période, doublons historiques, PDF/Excel), avec les écarts de code ci-dessus comme appui. Aucune implémentation avant validation explicite de chaque point.

## J-013 — 12 novembre 2026 — Bilan patient : arbitrage du point 1 (lot 1)

- **Décisions validées par l'utilisateur** : parcours jamais démarré = identité, éligibilité et statut uniquement ; liste simple des cours (chapitre en colonne, pas de regroupement) ; IDE affiché pour chaque cours, avec celui qui a clôturé le parcours ; un cours ne se valide qu'une fois (le point « dernière validation » est sans objet) ; logo Diaverum dans le PDF.
- **Changements** : `PatientReportBuilder` (cas non démarré via `activityStatus`, IDE par cours), `SpreadsheetWriter` (colonne IDE, « Clôturé par »), `PdfWriter` + `_layout.html.twig` (logo, copie non modifiée du SVG officiel dans `api/templates/reports/diaverum-logo.svg`), `patient.html.twig` (message non démarré, colonne IDE, « clôturé par »), assertions ajoutées à `ReportingTest`.
- **Vérifications** : `ReportingTest` 11 tests / 71 assertions (base de test). Deux PDF d'exemple (achevé, non démarré) rendus et inspectés : logo, colonne IDE et mise en page corrects. Suite complète non relancée.
- **Limites** : l'IDE vient de la dernière séance validée ; vide pour une validation historique sans séance. Le post-test à part n'existe pas encore dans les données.
- **Suite** : point 2 (moyennes).

## J-014 — 12 novembre 2026 — Bilan patient : historique des séances et CODEX (lot 1)

- **Demande utilisateur** : plus de détail sur tous les cours (validé / commencé non fini), résultats du CODEX, et si possible les logs exacts de connexion et déconnexion.
- **Changements** : `PatientReportBuilder` expose toutes les séances du parcours (validées, interrompues, non terminées, avec début et fin à la seconde, durée, score, IDE) et les tests CODEX du patient ; `Labels::SESSION` ; `SpreadsheetWriter` : feuilles « Historique des séances » et « CODEX » ; `patient.html.twig` : sections équivalentes dans le PDF. Le CODEX est affiché même pour un parcours jamais démarré (base de l'éligibilité) — choix technique réversible.
- **Constat sur les logs** : le journal d'accès (`AccessLog`) trace les comptes soignants et administrateurs, pas les patients, et n'est lisible que par l'administrateur national. Aucune connexion/déconnexion n'est rattachée à un patient. Rien n'a été ajouté ; en attente de décision utilisateur.
- **Vérifications** : suite API complète 170 tests / 969 assertions (base de test) ; PDF d'exemple inspecté.
- **Limites** : pas de test dédié au PDF de ces sections ; ordre des séances démarrées dans la même seconde non garanti.

- **Correction (même jour)** : à la demande de l'utilisateur, l'historique des séances et le CODEX restent **uniquement dans l'Excel** ; sections retirées du PDF, qui garde les changements du point 1 (logo, IDE, « clôturé par », cas non démarré). `ReportingTest` réussi.

## J-015 — 12 novembre 2026 — Annulation de la validation d'un parcours

- **Demande et décision validées par l'utilisateur** : pouvoir annuler la validation d'un parcours achevé en cas d'erreur ; réservé au cadre et à l'administrateur national ; sans délai. Modifie la règle « achevé = plus modifiable » (J-004 et suivantes) : l'annulation est désormais possible, uniquement par ces rôles.
- **Changements** : `POST /api/training_programs/{id}/reopen` (`TrainingWorkflowController`), `TrainingWorkflow::reopen`, `TrainingProgram::reopen` (statut « en cours », date de clôture et validateur effacés), `ReopenProgramRequest` (motif obligatoire, 500 caractères, espaces seuls refusés). Trace au journal d'accès : qui, quand, ancien validateur et date, motif. Front : bouton « Annuler la validation » avec motif obligatoire dans le bandeau « Parcours achevé » (vues Parcours et Parcours bis), visible pour cadre et administrateur.
- **Règles conservées** : les cours déjà validés restent verrouillés (validation unique J-004) ; le statut d'activité se recalcule depuis la dernière activité (l'annulation n'en est pas une) ; les KPI et exports repassent le parcours « en cours ».
- **Vérifications** : suite API 171 tests / 991 assertions (base de test), TypeScript et ESLint sans erreur, boîte de dialogue contrôlée dans le navigateur (compte de démonstration administrateur, annulation non confirmée sur les données locales). Un défaut trouvé par le test (motif d'espaces accepté) est corrigé.
- **Limites** : l'ancien validateur n'est conservé que dans le journal d'accès (pas de table d'historique) ; le journal tronque le détail à 255 caractères. Pas de test navigateur de bout en bout de l'annulation.

## J-016 — 12 novembre 2026 — Liste des patients : libellé, sélection et exports (lot 1)

- **Demande utilisateur** : renommer « File active » en « Patients actifs » ; pouvoir cocher des patients dans la liste et exporter la sélection ; ajouter le PDF comme pour un patient seul.
- **Changements** : `PatientsPage.tsx` (libellés, colonne de cases à cocher avec « tout sélectionner », sélection réinitialisée à chaque changement de filtre ; Excel de la sélection, ou de tous les actifs si rien n'est coché ; PDF de la sélection, désactivé sans sélection) ; `ExportButton` (props `disabled`, `title`) ; `GET /api/exports/patients.pdf?patients[]=…` (`ReportingController`, 50 patients maximum, sélection obligatoire, mêmes droits que l'Excel : hors périmètre = 404) ; gabarits `_patient.html.twig` (contenu du bilan, partagé), `patients.html.twig` (un patient par page).
- **Choix techniques réversibles** : sélection limitée à la page affichée ; l'Excel sans sélection garde le périmètre historique (tous les actifs, sans tenir compte des filtres de l'écran) ; un patient archivé peut être coché et exporté.
- **Vérifications** : suite API 171 tests / 996 assertions ; TypeScript et ESLint sans erreur ; navigateur : cases, « tout sélectionner », PDF désactivé puis actif (4), téléchargement du PDF en succès (journal d'accès, code 200). Contenu du PDF multi-patients non inspecté visuellement.

## J-017 — 12 novembre 2026 — Import de patients : archivés, homonymes, autres centres

- **Demande et décisions validées par l'utilisateur** : détecter un patient archivé, avertir pour un homonyme, avertir si le patient existe déjà dans un autre centre.
- **Règles** : patient identique (nom, prénom, date de naissance, sans casse ni accents) archivé dans le même centre = **erreur** bloquante (« restaurez-le ») ; identique dans un autre centre, actif ou archivé = **avertissement** ; même nom et prénom avec une autre date de naissance = avertissement « Homonyme » (3 maximum par ligne). Les avertissements ne bloquent pas l'import. La comparaison se limite aux centres de l'auteur de l'import : aucune information sur un centre hors périmètre n'est révélée. Doublon actif dans le même centre et doublon interne au fichier : inchangés (erreurs). Choix de l'archivé = erreur : décision technique réversible.
- **Changements** : `PatientImporter` (`existingPatients`, `person`, clé `warnings` par ligne), `ImportDialog.tsx` (compteur et liste d'avertissements en orange), type `ImportPreview`, test `ImportTest::testArchivedPatientBlocksAndHomonymOrOtherCenterOnlyWarn`.
- **Vérifications** : suite API 172 tests / 1004 assertions ; TypeScript et ESLint sans erreur. L'affichage dans la fenêtre d'import n'a pas été contrôlé dans le navigateur (dépôt de fichier non automatisé).
- **Limite** : la création manuelle d'un patient n'a toujours pas de contrôle de doublon (non vérifié en détail).

## J-018 — 12 novembre 2026 — Création manuelle d'un patient : mêmes contrôles que l'import

- **Constat** : la création manuelle (`POST /api/patients`) ne contrôlait aucun doublon (vérifié : aucune contrainte ni validateur). Décision validée par l'utilisateur : appliquer les mêmes règles que l'import (J-017).
- **Changements** : service partagé `App\Service\PatientDuplicates` (index des patients des centres de l'auteur, `inspect` : erreurs et avertissements), utilisé par `PatientImporter` (refactorisé, comportement inchangé) ; contrainte `UniquePatient` appliquée **à la création seulement** (groupe `patient:create`, déclarée sur le `Post` de `Patient`) : le même patient actif ou archivé dans le même centre donne un 422 côté serveur ; `GET /api/patient-duplicates` (`PatientDuplicateController`) : vérification préalable sans rien créer, limitée aux centres de l'utilisateur ; formulaire `PatientDialog` : erreur rouge bloquante, ou avertissements orange (autre centre, homonyme) avec bouton « Créer quand même ». Un changement de champ réinitialise la vérification. La modification d'un patient existant n'est pas concernée.
- **Changement de comportement** : un doublon actif dans le même centre, jusque-là accepté en création manuelle, est désormais refusé.
- **Incident de recette** : lors du test navigateur, une frappe en double a créé un patient de test « DUPONT JeanJeanJean » (centre Paris Nord) dans la base de développement locale. Supprimé par SQL (une ligne, identifiée par son id) ; aucune autre donnée touchée. Le chemin `/api/patients/duplicates` était intercepté par la route fiche patient d'API Platform : route renommée `/api/patient-duplicates`.
- **Vérifications** : suite API 173 tests / 1017 assertions ; TypeScript et ESLint sans erreur ; navigateur : doublon exact (Dupont Jean 12/03/1948, Paris Nord) bloqué avec message, aucune création en base. Cas avertissement (homonyme, autre centre) couvert par test API, non vu à l'écran.

## J-019 — 12 novembre 2026 — Point 2 (moyennes) et choix des séances dans Parcours bis

- **Décisions validées par l'utilisateur** : (1) le post-test sort de la moyenne du parcours et s'affiche à part ; (2) le score de chapitre s'affiche dans Parcours bis, à côté du nom du chapitre (pas de feuille Excel dédiée pour l'instant) ; (3) un cours validé puis désélectionné reste compté dans les moyennes. Règles proposées et acceptées : score de cours = % de réponses justes sur les exercices notés (inchangé) ; score de chapitre = moyenne simple des cours validés et notés du chapitre (cours sans note exclus, vrai 0 inclus, arrondi à l'entier, « — » sans cours noté) ; chaque cours pèse autant ; score de parcours = même règle sans le post-test (code `PT`).
- **Demande complémentaire** : dans Parcours bis, le choix des séances optionnelles manquait (la vue n'affichait que les séances déjà sélectionnées).
- **Changements** : `TrainingProgram::getAverageScore` exclut `PT`, nouveau `getPostTestScore` ; bilan patient : `postTestScore`, colonne Excel « Post-test (%) » (les colonnes suivantes de la feuille Synthèse sont décalées d'un rang), mention « Post-test : x % (hors score moyen) » dans le PDF ; `PatientProgramBis.tsx` : « Moyenne : x % » à côté de chaque chapitre (calculée sur tous les cours validés notés du chapitre, désélectionnés compris, hors post-test) et bouton « Choisir les séances (n/m) » ouvrant un panneau de cases à cocher par chapitre (systématique/optionnelle), avec rappel si aucune optionnelle n'est choisie. Désactivé si le parcours est achevé ou le patient archivé ; une séance validée reste verrouillée dans ce panneau (l'onglet Parcours, lui, laisse décocher une séance validée : écart assumé, à harmoniser si besoin).
- **Effet de bord** : les scores moyens de parcours changent pour les parcours ayant passé le post-test (statistiques centre/national comprises, via `getAverageScore`). Les moyennes par cours et l'activité des statistiques incluent encore le post-test comme un cours : à traiter au point 3.
- **Vérifications** : suite API 174 tests / 1021 assertions ; TypeScript et ESLint sans erreur ; navigateur : 9 moyennes de chapitre et 7 cases optionnelles affichées sur un parcours réel. Aucune case cochée sur les données. Observation : l'annulation de validation (J-015) a été utilisée par l'utilisateur sur un parcours réel (motif tracé au journal d'accès), ce qui la valide de bout en bout.
- **Non vérifié** : cocher une séance optionnelle depuis Parcours bis dans le navigateur ; affichage du PDF avec post-test.

## J-020 — 12 novembre 2026 — Maquette du bilan PDF patient (lot 1)

- **Demande validée** : reprendre la maquette fournie avec les informations de l’export patient, sans colonne Chapitre. Remplace pour le PDF la colonne demandée en J-013 ; aucune nouvelle règle de calcul. Référence fonctionnelle : bilan individuel, cahier des charges §3, et décisions J-013/J-019.
- **Périmètre** : gabarit commun aux PDF individuels et multi-patients ; préserver les modifications locales. Vérification prévue par rendu fictif sans accès aux dossiers patients.

- **Changements** : nouveau `api/templates/reports/_patient_layout.html.twig` (mise en page A4, bandeau logo/titre, cartes KPI, tableau et pied de page) et `_report_icon.html.twig` (icônes SVG embarquées) ; `_patient.html.twig` (compétences en pastilles, dates sur deux lignes, synthèse finale, aucune colonne Chapitre) ; `patient.html.twig` et `patients.html.twig` utilisent ce layout ; `_layout.html.twig` expose deux blocs d’extension pour préserver le rendu des statistiques.
- **Données et décisions** : données issues du PatientReportBuilder existant ; compte validé/sélectionné et durée inchangés, bilan à date sans nouveau filtre de période, score conservant la règle J-019 (post-test séparé). Cas sans parcours/non démarré conservés. Excel inchangé. Choix technique réversible : police DejaVu Sans incorporée et logo officiel déjà présent, différents de la maquette ; identité exacte non certifiée.
- **Vérifications exécutées** : lint des 7 gabarits Twig réussi ; rendu Dompdf de données entièrement fictives, un bilan de deux cours (1 page) et une sélection contenant 24 cours puis un patient non démarré (6 pages). Inspection PNG du bilan, de la page 2 avec en-tête répété et de la dernière page non démarrée : aucun débordement observé. `git diff --check` réussi. Aucune base lue/modifiée ; aucune migration ni déploiement.
- **Essais corrigés** : Dompdf ignore les largeurs du colgroup : largeurs portées sur les cellules d’en-tête. Essai Helvetica abandonné (substitution de graisse au rendu) ; DejaVu Sans incorporée retenue. Poppler/Helvetica a rencontré un défaut Fontconfig local ; configuration temporaire puis retour à la police incorporée. Aucun impact applicatif.
- **Limites / suite** : suite API non relancée (gabarits uniquement), pas de certification générale des KPI/exports ni de cases supplémentaires cochées dans la feuille de route. Aperçus fictifs dans `api/var/pdf-preview/` (ignoré par Git). Prochaine action : retour utilisateur sur le PDF ; poursuivre séparément les arbitrages du point 3.
- **Correction finale de recette** : le moteur ne répétait plus l’en-tête/pied sur le patient suivant après un parcours multipage. Le gabarit de sélection réémet ces éléments à chaque nouveau patient ; dernier rendu inspecté avec succès, y compris identité, statut, logo et confidentialité sur la page 6.

## J-021 — 12 novembre 2026 — Compacter le PDF patient (lot 1)
- **Demande** : corriger le débordement « Interrompu » et réduire la police/pagination du bilan J-020. PDF joint inspecté (5 pages), débordement de la carte confirmé, titres longs provoquant des lignes hautes.
- **Décision utilisateur** : présentation plus compacte. Aucun arbitrage métier ni changement de données/calculs ; corrections de gabarits uniquement, modifications locales préservées.
- **Changements** : `api/templates/reports/_patient_layout.html.twig` : corps 10 → 8 pt, nom 30 → 22 pt, KPI 24 → 18 pt et statut dédié à 16 pt ; réduction des marges, interlignes, pastilles et espacements. `_patient.html.twig` : classe dédiée au statut, colonne séance 19 → 27 % et compétences 30 → 22 %, retrait du colgroup ignoré par Dompdf. Les statuts du tableau peuvent revenir à la ligne.
- **Vérifications** : lint des 7 gabarits réussi, diff sans erreur. Même jeu fictif de 26 séances à titres longs et compétences : 7 pages avant, 3 après ; les trois pages rendues et inspectées (statut Interrompu contenu dans la carte, titres lisibles, en-tête répété, récapitulatif final). Export multi-patients fictif également régénéré. Aucune base consultée ou modifiée.
- **Limites / suite** : le nombre de pages du PDF utilisateur après correction n’est pas mesuré (pas de réexport de ses données) ; comparaison uniquement à données fictives identiques. Tests API non relancés, aucun changement de règles métier, aucun déploiement. Prochaine action : réexport utilisateur pour valider la densité. Ce choix de présentation remplace les tailles de J-020.

## J-020 — 12 novembre 2026 — Parcours bis : séances optionnelles en popup

- **Demande utilisateur** : remplacer le panneau « Choisir les séances » (J-019) par un bouton « Choisir optionnel » ouvrant une popup qui ne liste que les séances optionnelles. Remplace la présentation du choix de séances de J-019 (les règles de moyennes de J-019 sont inchangées).
- **Interprétation à confirmer** : la liste du parcours montre les séances systématiques (cochées dès la création) et les optionnelles choisies ; les optionnelles non choisies n'apparaissent que dans la popup. Je n'ai pas affiché toutes les optionnelles dans la liste, pour ne pas fausser les indicateurs, calculés sur les séances sélectionnées.
- **Changements** : `PatientProgramBis.tsx` : composant `OptionalDialog` (cases par chapitre, bouton « Terminer ») à la place du panneau ; bouton « Choisir optionnel (n/m) ». Mêmes règles : désactivé si parcours achevé ou patient archivé, séance validée verrouillée.
- **Vérifications** : TypeScript et ESLint sans erreur ; navigateur : popup ouverte sur un parcours réel, 7 optionnelles listées. Aucune case cochée ; cocher une optionnelle n'est pas testé.

## J-022 — 12 novembre 2026 — Objectif deux pages pour le bilan (lot 1)
- **Demande** : viser deux pages pour le bilan patient après J-021. Optimisation de présentation sans suppression de données. Préserver les modifications en cours, dont la popup Parcours bis ajoutée dans une autre intervention.
- **Changements** : `api/templates/reports/_patient.html.twig` place code et titre sur la même ligne et les compétences en texte continu avec coches ; `_patient_layout.html.twig` réduit le corps du tableau à 7,5 pt, les marges verticales à 0,6 mm et retire les pastilles des compétences pour éviter leurs hauteurs supplémentaires. Statut Interrompu conservé à 16 pt.
- **Vérifications** : même jeu fictif de 26 séances longues avec compétences, désormais 2 pages récapitulatif inclus ; les deux pages PNG inspectées, sans débordement. Lint des 7 Twig et diff réussis. Essai initial à 1 mm laissait le récapitulatif seul sur une troisième page, corrigé à 0,6 mm. Aucun accès à la base, aucune suppression de données, aucun déploiement.
- **Limites / suite** : deux pages vérifiées sur le jeu fictif, pas de garantie universelle si davantage de séances ou de compétences/libellés plus longs. PDF utilisateur non réexporté ; prochaine action : relancer son export pour confirmer. Tests API non relancés (présentation uniquement).

## J-021 — 12 novembre 2026 — Création du parcours : choix des optionnelles dès le départ

- **Demande utilisateur** : au moment de créer le parcours, afficher les séances obligatoires avec des cases cochées et grisées, et les optionnelles non grisées et sélectionnables.
- **Changements** : `PatientDetailPage.tsx` : le bouton « Créer le parcours » (état sans parcours, commun aux onglets Parcours et Parcours bis) ouvre `CreateProgramDialog` : séances systématiques (26, cochées, désactivées) puis optionnelles (7, à cocher). À la validation : création du parcours (API inchangée, qui sélectionne les systématiques) puis sélection des optionnelles cochées (PATCH `selected` par séance). Si une optionnelle échoue, avertissement et renvoi vers « Choisir optionnel ».
- **Vérifications** : TypeScript et ESLint sans erreur. Navigateur : dialogue affiché avec 26 systématiques grisées et 7 optionnelles ; création avec « Les AVK » cochée : base = 27 séances sélectionnées sur 33, dont O1. Test réalisé sur un patient de test (Zztest Creation, rendu éligible par SQL) créé puis supprimé par SQL avec son parcours et ses 33 lignes de séances ; aucune autre donnée touchée.
- **Limites** : la liste des séances vient du catalogue publié (`/modules`), sans regroupement par chapitre (le titre du chapitre n'est pas fourni par cette API) ; le post-test (PT) figure parmi les 26 systématiques, comme dans l'API de création.

## J-022 — 12 novembre 2026 — Mise en page du PDF retouchée par l'utilisateur

- **Contexte** : l'utilisateur a modifié lui-même les gabarits PDF (`_layout`, `_patient`, `patient`, `patients` et nouveaux `_patient_layout`, `_report_icon` : icônes, bloc d'en-tête, colonnes). Je ne les ai ni écrits ni relus en détail ; ils sont commités tels quels avec le reste des changements J-019 à J-021.
- **Vérification** : suite API 174 tests / 1021 assertions réussie (génération des PDF patient, multi-patients et statistiques). Rendu visuel non inspecté par moi.

## J-023 — 12 novembre 2026 — Point 3 : durées, période et post-test dans les statistiques

- **Décisions validées par l'utilisateur** : les exports doivent refléter la période ; le score d'un cours validé est définitif, donc il compte même si le parcours n'est pas terminé (l'utilisateur a refusé de limiter le score aux parcours achevés, proposition initiale) ; le post-test est présenté à part, hors des moyennes.
- **Règles implémentées** (`StatisticsBuilder`, centre et national, écrans et exports) : **score moyen des parcours** = moyenne, sur les parcours ayant au moins une séance validée dans la période (post-test exclu), du score de chaque parcours (moyenne de ses cours validés, post-test exclu) ; sans période, tout l'historique. **Durée moyenne d'un parcours** = parcours **achevés dans la période** (date de clôture), « — » s'il n'y en a aucun. Bornes incluses, heure de Paris (inchangé). **Post-test** : exclu des scores moyens des séances, du mensuel et des IDE (`NurseActivityBuilder` aussi : activité personnelle) ; conservé dans le nombre de séances validées ; ligne propre « post-test, hors moyennes » dans le tableau des cours. Effectifs et statuts : inchangés (à date).
- **Changements** : `StatisticsBuilder` (`aggregate`, `courses` avec `postTest`, `monthly`, `nurses` via AVG conditionnel sur le code PT), `NurseActivityBuilder` (`isPostTest`), `SpreadsheetWriter` (en-têtes qui précisent la règle ; type « Post-test (hors moyennes) »), `statistics.html.twig` (note de règle, libellé du post-test), `CoursesTab.tsx` et `types.ts` (indicateur `postTest`). Changement de chiffres : le score moyen des parcours exclut le post-test et suit la période ; la durée moyenne suit la période de clôture.
- **Vérifications** : suite API 175 tests / 1045 assertions, dont un nouveau test (moyenne sans période, période passée, période courante, période vide, bornes incluses du jour de clôture, post-test compté en séance mais hors score) ; TypeScript et ESLint sans erreur. Non vérifié : affichage navigateur de l'étiquette du post-test ; PDF statistiques non inspecté visuellement ; exclusion du post-test dans le score moyen par IDE couverte seulement par l'exécution des tests existants, sans assertion dédiée.
- **Limites** : les écrans de résultats n'affichent pas encore le score moyen ni la durée moyenne des parcours (seulement les exports) ; le rapprochement des écrans et des exports (mode `screen`) reste au point 5.
