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

## J-024 — 12 novembre 2026 — Point 4 : dernière validation par cours et par parcours

- **Décision validée par l'utilisateur** : pour les chiffres fondés sur les séances, ne retenir que la dernière validation de chaque cours dans chaque parcours ; l'historique n'est ni supprimé ni fusionné. Vérification préalable en production non réalisée (accès non disponible) : la règle est appliquée par précaution. Base locale : aucun doublon (11 séances validées, 11 cours validés).
- **Règle** : une séance validée est écartée si une validation plus récente (date de fin, puis identifiant) existe pour le même cours et le même parcours, quel que soit l'IDE ; la comparaison est faite sur tout l'historique, avant l'application du filtre de période.
- **Changements** : nouvelle classe `LatestValidation` (`restrict` pour les requêtes DQL, `supersededIds` pour les listes en mémoire), appliquée à : activité des IDE des statistiques centre/national (`StatisticsBuilder::nurses`), activité personnelle de l'IDE (`NurseActivityBuilder::sessions`, donc totaux, mensuel, cours, patients), tableau de bord (KPI validées/score, validées du mois, courbe mensuelle des validations). Inchangés : bilan patient (déjà la dernière validation), statistiques générales (suivi par cours, une valeur par cours), liste « Séances » et son résumé (historique complet).
- **Test** : `testOnlyTheLatestValidationOfACourseCountsForSessionBasedFigures` (deux validations du même cours : une seule compte pour l'IDE, les statistiques et le tableau de bord). Le test existant `testNurseSeesOnlyHerOwnSessionsInHerCenters` validait trois fois le même cours dans le même parcours : ses séances portent maintenant sur des cours distincts.
- **Vérifications** : suite API 176 tests / 1053 assertions. Non vérifié : performance du sous-select sur un gros volume (à mesurer avec le lot « volume représentatif » des améliorations à planifier) ; affichage des écrans.
- **Reste** : les séances interrompues (traitement à confirmer : elles ne comptent déjà pas comme validées) ; vérifier en production s'il existe réellement des doublons ; point 5.

## J-025 — 12 novembre 2026 — Point 5 : écrans et exports alignés

- **Décisions validées par l'utilisateur** : exports sur les mêmes règles que les écrans ; ligne « Archivés (hors indicateurs) » par centre dans les statistiques ; score moyen et durée moyenne des parcours affichés à l'écran.
- **Changements** : suppression du mode « historique » : `StatisticsBuilder::build` n'a plus de paramètre `screen` (statuts d'activité partout, archivés exclus de l'activité des IDE), `ReportingController` simplifié ; nouveaux champs `patients.archived` (compte à date par centre, jamais dans les indicateurs) et `programs.notStarted` toujours présent ; Excel : colonnes « Non démarrés », « Inactifs (15 jours) » (remplace « Non actifs »), « Archivés (hors indicateurs) » ; PDF : mêmes colonnes ; écran Vue d'ensemble : tuiles « Score moyen des parcours » et « Durée moyenne d'un parcours » avec leur règle, mention des archivés ; types front resserrés.
- **Test** : `testStatisticsExcelMatchesTheScreenFigures` compare l'Excel à l'écran (patients, archivés, statuts de parcours, score moyen, séances des IDE) sur les mêmes filtres ; un archivé est compté à part et absent des indicateurs.
- **Vérifications** : suite API 177 tests / 1060 assertions ; TypeScript et ESLint sans erreur ; navigateur : tuiles affichées sur les résultats nationaux (score 63 %, durée 3 h 21). `KPI_REGLES.md` réécrit (moyennes, périodes, post-test, doublons, écrans = exports).
- **Non vérifié** : rendu visuel des PDF statistiques ; rapprochement automatisé du PDF (même source de données que l'Excel mais non comparé cellule à cellule) ; droits IDE/cadre/administrateur des exports revérifiés par la suite existante seulement ; volumes importants.
- **Reste du lot 1** : logs de connexion/déconnexion (décision utilisateur en attente) ; doublons de production à compter ; revue visuelle des PDF ; le lot 1 n'est pas marqué terminé.

## J-026 — 12 novembre 2026 — Logs de connexion : pas d'export

- **Décision validée par l'utilisateur** : aucun export des connexions et déconnexions (option « pas de logs » retenue). Clôt la question laissée en attente en J-014. Le journal d'accès existant reste inchangé (lecture réservée à l'administrateur national).
- **Reste du lot 1** : doublons de production à compter, revue visuelle des PDF, recette des droits par rôle sur les exports. Lot 1 non terminé.

## J-027 — 12 novembre 2026 — Recette des droits par rôle sur les exports (lot 1)

- **Demande utilisateur** : recetter les droits sur les exports pour l'IDE, le cadre et l'administrateur national, y compris les refus hors centre.
- **Périmètre testé** (`ExportRightsTest`, 8 tests / 145 assertions, jeu de données fictif : centres Paris et Lyon, trois patients dont un archivé, IDE et cadres de chaque centre, IDE sans centre, administrateur national) : anonymes (401 sur les six routes d'export et `/api/statistics`) ; bilans Excel sans sélection : chaque rôle ne reçoit que les patients actifs de ses centres (archivés et autres centres exclus ; IDE sans centre : fichier vide ; administrateur : tous) ; patients demandés hors périmètre : 404 pour l'Excel, le PDF multi-patients et le PDF individuel, y compris quand la sélection mêle un patient autorisé et un autre ; accès autorisé confirmé pour les centres propres et pour l'administrateur ; patients archivés exportables seulement quand ils sont sélectionnés et dans les centres de l'utilisateur ; PDF multi-patients : sélection obligatoire et limite de 50 (400) ; statistiques (Excel, PDF, écran) : 403 pour tout IDE, accès cadre limité à ses centres (403 sur un centre hors périmètre), administrateur sur tout centre, contenu de l'Excel limité aux centres du périmètre ; `/api/statistics/me` accessible à tous les rôles.
- **Défaut trouvé et corrigé** : un utilisateur sans aucun centre recevait un fichier vide (200) en demandant des patients précis, au lieu de 404 (et le PDF d'un patient pouvait échouer). `ReportingScope::patients` renvoie maintenant 404 dans ce cas. Aucune donnée n'était exposée.
- **Vérifications** : suite API complète à jour ; fonctionnement constaté par les tests HTTP seulement, pas par une recette sur les écrans.
- **Limites** : la recette porte sur les droits d'accès aux exports ; le rapprochement des chiffres du PDF avec l'écran et la revue visuelle des PDF restent à faire, donc la ligne de la feuille de route n'est pas cochée. Les droits ont été vérifiés sur des données de test, pas en production.

## J-028 — 12 novembre 2026 — Décisions lot 0 (compétences, suppression) et suppression définitive d'un patient

- **Décisions validées par l'utilisateur** : (1) **six compétences** par cours (le code accepte déjà six ; alignement de l'éditeur et de l'import restant à faire, lot 2) ; (2) **suppression définitive** selon la version recommandée : réservée au cadre et à l'administrateur national dans leurs centres, uniquement sur un patient **déjà archivé**, avec saisie du nom et du prénom, effacement complet, trace d'audit sans donnée de santé. L'utilisateur a aussi évoqué l'anonymisation des données (pour réutiliser des statistiques) ; recommandation donnée de ne pas la mélanger à cette suppression : décision de principe et avis du DPO de Diaverum requis (voir ci-dessous). Source : cahier des charges §3.4 (paragraphe non relu dans ce document ; à citer lors de la validation avec Diaverum).
- **Changements** : `POST /api/patients/{id}/erase` (`PatientEraseController`, `ErasePatientRequest`), service `PatientEraser` : refuse un patient non archivé et une confirmation inexacte (insensible à la casse et aux accents, 422) ; efface en une transaction SQL, dans l'ordre : séances (compétences en cascade), tests CODEX, parcours (séances de suivi et motifs d'interruption en cascade), patient (raisons d'éligibilité en cascade). SQL volontaire : la suppression physique est interdite ailleurs (`PreventHardDeleteListener`, inchangé). Trace au journal d'accès : action `delete`, ressource `patient` + identifiant, détail « centre · n parcours · n séances · n tests CODEX », sans nom. Front : bouton « Supprimer définitivement » sur la bannière d'un patient archivé (cadre/administrateur), dialogue de confirmation avec saisie, retour à la liste.
- **Conservé volontairement** : les anciennes lignes du journal d'accès qui citent l'identifiant (UUID) du patient, sans nom ni donnée de santé ; les sauvegardes jusqu'à leur rotation (7 jours snapshots, 30 jours stockage objet, §9), ce que le dialogue indique à l'utilisateur.
- **Effets** : le patient disparaît définitivement des listes, exports et statistiques ; les moyennes historiques calculées sans lui peuvent changer (il n'y était déjà pas, étant archivé).
- **Vérifications** : `PatientErasureTest` (3 tests, 28 assertions : droits IDE et cadre d'un autre centre, patient non archivé, confirmation inexacte ou vide, effacement complet sans toucher un autre patient, trace sans nom, 404 au second appel) ; suite API complète ; TypeScript et ESLint sans erreur ; navigateur : patient de test créé, archivé, puis supprimé via l'interface (base : 0 ligne, trace d'audit présente).
- **Limites** : pas d'effacement des fichiers importés ou des exports déjà téléchargés (hors base) ; les exports et fichiers d'import contenant ce patient (`import_file`) ne sont pas purgés ; avis du DPO non obtenu ; l'archivage et la restauration ne sont pas recettés séparément ici (ligne de la feuille de route non cochée).
- **Anonymisation (avis, décision ouverte)** : conserver des données anonymisées permettrait de garder l'historique statistique, mais contredit la règle J-008 (archivés hors KPI) et suppose une anonymisation réellement irréversible (nom, prénom, date de naissance, notes libres, mots et notes CODEX, réponses libres) ; dates, centre et combinaisons rares peuvent rester ré-identifiantes dans un petit centre. À arbitrer avec le DPO avant tout développement.

## J-029 — 12 novembre 2026 — Limite de six compétences alignée (lot 2)

- **Décision** : six compétences par cours (J-028, validée par l'utilisateur). Le PDF du cahier des charges mentionne cinq (§4.6) : à faire confirmer par Diaverum.
- **État constaté** : l'API appliquait déjà six partout via `Module::MAX_COMPETENCIES` (import de contenu, création directe d'une compétence, validation d'une séance). Seul l'éditeur de cours avait la valeur 6 écrite en dur à trois endroits.
- **Changements** : éditeur (`model.ts`, `CourseEditorPage.tsx`) : constante unique `MAX_COMPETENCIES = 6` pour la validation, le bouton « Ajouter une compétence » et son libellé ; tests API : `testAtMostSixCompetencies` vérifie maintenant l'acceptation de six, le refus de sept sans modifier le cours, et `testSeventhCompetencyIsRefusedWhenAddedDirectly` couvre `POST /api/module_competencies`. La validation IDE de six compétences était déjà testée (`testSessionWithSixCompetenciesCanBeValidated`).
- **Compatibilité des cours existants** : base locale : maximum de six compétences actives par cours (S12 : six actives et une archivée), aucun cours à adapter. Les contenus des cours de production n'ont pas été examinés.
- **Vérifications** : suite API 189 tests / 1237 assertions ; TypeScript et ESLint sans erreur ; contrôle du modèle de l'éditeur (`e2e/course-editor-model.mjs`) réussi. Non vérifié : affichage de l'écran de validation IDE avec six compétences sur tablette.

## J-030 — 12 novembre 2026 — Profil patient retiré, ratio de progression, recette du chronomètre (lot 2)

- **Demandes de l'utilisateur** : (1) enlever le bloc « profil du patient » car il reprend le CODEX ; (2) s'occuper du ratio de progression ; (3) tester que le chronomètre fonctionne à la pause, à la reprise et à la sortie, et que le temps remonte bien. Interprétation de (1), la demande étant formulée de façon elliptique : retrait de l'**onglet « Profil patient »** (saisie libre de notes et de questions/réponses) et de la **carte « Profil patient »** de l'onglet Parcours ; la ligne de résultat du CODEX est conservée et renommée « Test CODEX : ». À confirmer par l'utilisateur.
- **Profil patient** : `PatientDetailPage.tsx` (onglet, contenu et carte retirés), composant `PatientProfile.tsx` et script `e2e/patient-profile.mjs` supprimés, README mis à jour. Les champs `medicalData` et `administrativeData` restent en base et dans l'API, sans interface, donc les données déjà saisies ne sont pas perdues et la décision est réversible. Conséquence pour le lot 2 : le questionnaire médical et administratif validé n'a plus d'emplacement dans la fiche en attendant son intégration.
- **Ratio de progression** : `TrainingProgram::getValidatedCount` ne compte plus que les séances validées **et sélectionnées** (numérateur inclus dans le dénominateur) ; avant, une séance validée puis désélectionnée pouvait donner « 5/4 » sur la fiche alors que Parcours bis affichait « 4/4 ». Les moyennes, durées totales et le bilan continuent d'inclure ces séances. `hasValidatedModule` (nouveau) garde la condition de validation du parcours par le cadre (au moins une séance validée, même désélectionnée). Test `testProgressRatioNeverExceedsTheSelectedCoursesAfterDeselectingAValidatedOne`.
- **Chronomètre** : logique lue dans `TrainingSessionPage.tsx` (`useStopwatch` : un tick par seconde, actif seulement en séance démarrée, hors pause, hors invite du code de sortie ; la durée envoyée à la validation est celle affichée ; le post-test n'est pas chronométré). Nouveau script `e2e/stopwatch.mjs` (horloge du navigateur simulée par Playwright, API simulée, connexion et code IDE réels) : le temps avance ; en pause il ne bouge pas (10 s simulées) et repart de la valeur atteinte ; la tentative de sortie suspend le temps, l'annulation le reprend sans recréer la séance ; une veille d'une minute n'est pas comptée ; la durée envoyée à la validation est égale à la durée affichée ; la sortie validée par le code interrompt la séance côté serveur sans durée enregistrée, et un nouveau lancement repart à zéro. Deux exécutions réussies, aucun dossier réel modifié (sessions simulées).
- **Constat sur les sorties** : quitter ou recharger la page crée une nouvelle séance au relancement ; le temps de la séance interrompue n'est pas repris (règle du cahier des charges : reprise depuis le début ; durées interrompues non comptées). Le rechargement de la page en cours de séance n'a pas été testé.
- **Vérifications** : suite API 190 tests / 1250 assertions ; TypeScript et ESLint sans erreur ; `e2e/stopwatch.mjs` réussi deux fois.
- **Limites** : navigateur tactile émulé, pas la tablette physique (appareil nécessaire pour la veille réelle, la mise en arrière-plan et le verrouillage de l'écran) ; la veille est simulée par un saut d'horloge ; le script suppose le jeu de démonstration (patient DUPONT Jean) et force par interception le statut du parcours ; le `make e2e` n'a pas été relancé (il recharge les données).

## J-031 — 12 novembre 2026 — Parcours de bout en bout rejoué (lot 2)

- **Demande utilisateur** : rejouer le parcours de bout en bout (CODEX, éligibilité, sélection et confirmation sans optionnel, interruption, rappel, reprise depuis le début, validation IDE, clôture par le cadre).
- **Décision de méthode** : le scénario navigateur réel `make e2e` recharge les données de démonstration et aurait écrasé la base locale de l'utilisateur. Une sauvegarde a été faite (`backups/diaverum-20261112-194332.sql`, dossier ignoré par git, base de développement, données fictives) puis l'exécution a été **refusée par le système de sécurité** (destruction locale irréversible) ; elle n'a pas été contournée. Le scénario `scenario.mjs` n'a donc **pas** été rejoué. À lancer par l'utilisateur s'il le souhaite : `make db-dump` puis `make e2e`, puis `make db-restore f=<sauvegarde>`.
- **Ce qui a été rejoué sans rien détruire** : (1) nouveau test `EndToEndJourneyTest` sur la base de test, par l'API : enregistrement du patient, refus de parcours tant que non éligible, CODEX anormal puis décision non éligible (motif obligatoire), nouveau CODEX normal et éligibilité, création du parcours (systématiques cochées, optionnelles non, statut non démarré), sélection puis retrait d'une optionnelle, séance quittée (cours « non terminé », parcours actif), trois cours inachevés, reprise depuis le début (nouvelle séance, ancienne interrompue), interruption du parcours avec motif obligatoire et refus de séance, reprise, validation IDE d'un cours noté (score serveur 100 %, 1 validé), clôture réservée au cadre, parcours achevé non modifiable, annulation de la clôture par le cadre et cours validé toujours verrouillé (93 assertions) ; (2) scripts navigateur à écritures simulées : `codex-protocol.mjs`, `learner-workflow.mjs` (confirmation sans optionnel, interactions, code, validation), `patient-program-bis.mjs`, `course-routing.mjs`, `stopwatch.mjs`, et le nouveau `resume-prompt.mjs` (liste des cours inachevés, proposition du plus récent, fermeture non répétée, reprise depuis le début). Tous réussis.
- **Correction de script** : `learner-workflow.mjs` échouait parce que le parcours local de DUPONT Jean est « interrompu » (état issu des essais de l'utilisateur) : il force désormais le statut du parcours par interception, comme `stopwatch.mjs` et `resume-prompt.mjs`. Aucun défaut applicatif en cause.
- **Écart de spécification à trancher** : la feuille de route parle d'un rappel « à partir de trois cours inachevés ». Le code propose le rappel dès un cours inachevé (liste si plusieurs, puis le plus récent) ; le PDF du cahier des charges n'a pas pu être relu (outil de lecture indisponible), la règle exacte n'est donc pas vérifiée. Aucune modification faite.
- **Non couvert** : parcours complet dans un vrai navigateur sans simulation (cf. ci-dessus) ; tablette physique ; rappel selon le seuil du cahier des charges.
- **Vérifications** : suite API complète (voir ci-dessous) ; base de développement inchangée (7 patients, mêmes séances et tests CODEX qu'avant).

## J-032 — 12 novembre 2026 — Base de recette fictive (lot 5)

- **Demande utilisateur** : commencer par la base de recette fictive ; le lot 4 est déjà géré par l'utilisateur (non traité).
- **Livrables** : `RecetteDataLoader` (jeu de données déterministe, dates relatives au jour du chargement) ; commande `app:recette:load` avec garde-fou (refuse toute base dont le nom ne contient pas « recette » et toute base contenant déjà des comptes) ; cible `make recette-base` (crée la base dédiée `diaverum_recette`, migre, charge) sans toucher à la base de développement ; `RECETTE_BASE_FICTIVE.md` (contenu, comptes, résultats attendus calculés à la main, procédure de consultation) ; `RecetteDatasetTest` (6 tests) qui compare les écrans (statistiques nationales, par centre, cadre limité à son centre, périodes, résultats des IDE) et les exports Excel à ces valeurs en dur.
- **Contenu** : trois centres, administrateur, trois cadres, quatre IDE ; 12 patients (10 actifs, 2 archivés) ; parcours non démarré, en cours (×2), inactif, interrompu, achevé et un parcours archivé ; séances sur environ deux mois, une ancienne validation répétée, un cours sans note, un post-test.
- **Écart trouvé et corrigé** : le bilan patient (Excel, PDF) affichait le statut du cycle de vie (« Non actif », « En cours » même pour un parcours inactif depuis 20 jours) et non celui des écrans. Il utilise maintenant le statut de suivi : Non démarré, En cours, Inactif (15 jours), Interrompu, Achevé (`Labels::ACTIVITY`, `Labels::PROGRAM` supprimé). Test : `testPatientReportStatusesUseTheScreenVocabulary`.
- **Vérifications** : suite API 197 tests / 1418 assertions ; la commande refuse la base de développement (constaté) ; `make recette-base` exécuté : base `diaverum_recette` = 12 patients, 7 parcours, 11 séances, 8 comptes ; l'application a été pointée sur cette base (connexion du compte de recette 200, compte de développement 401), puis remise sur la base de développement (connexion 200, 7 patients inchangés). Un premier essai a donné des erreurs 502 : nginx doit être redémarré après la recréation du conteneur php (indiqué dans la procédure).
- **Limites** : les PDF ne sont pas comparés aux écrans ; pas de recette sur tablette ; les accès par rôle dans l'interface ne sont pas rejoués sur cette base (les droits des exports sont couverts par `ExportRightsTest`) ; la base `diaverum_recette` reste présente dans le Postgres local (suppression : `DROP DATABASE diaverum_recette`).

## J-033 — 12 novembre 2026 — Comparaison de deux périodes dans Résultats

- **Demande et décisions de l'utilisateur** : une option pour comparer les données de deux périodes, sur tous les onglets, en haut de l'écran ; la seconde période se choisit comme la première (un mois contre un autre mois, une période prédéfinie contre une autre) ; pas d'export de la comparaison ; un test.
- **Changements (front uniquement, API inchangée)** : `StatisticsView` : bouton « Comparer », barre A / B avec second `PeriodPicker` et bouton « Période précédente », seconde requête `useStatistics` pour la période B ; `lib/compare.ts` (écart A − B et en % de B, sens favorable, formats) ; `lib/period.ts` : nouveaux préréglages « Mois en cours », « Mois précédent », « Trimestre précédent », « Année précédente » (disponibles aussi pour la période principale) et `previousPeriod` (mois, trimestre ou année civils complets → le précédent ; sinon même nombre de jours juste avant ; aucune pour « toute l'activité ») ; `CompareLine` affiche « B : valeur, écart » sous les valeurs de A dans les indicateurs du haut, la Vue d'ensemble (score et durée moyens des parcours, motifs de clôture), Séances, Centres et IDE ; l'onglet Parcours (liste à date) affiche une mention explicative. Couleur verte ou rouge pour les indicateurs « plus haut = mieux » (séances, scores, achevés), grise pour les durées et les clôtures.
- **Choix de conception** : les effectifs et statuts de patients restent à date et identiques ; la courbe mensuelle reste celle de la période A (mention affichée) ; une valeur absente donne « — » sans écart ; un pourcentage n'est pas calculé quand B vaut zéro.
- **Défaut découvert et corrigé en passant** : `NewSessionPage` importait encore le composant « Profil patient » supprimé en J-030, ce qui **cassait le build de production** depuis le commit e1cf37e. Mes contrôles de J-030 à J-032 utilisaient `tsc --noEmit -p .`, qui ne compile pas les sources (la configuration racine ne contient que des références) : l'affirmation « TypeScript sans erreur » de ces entrées était donc fausse pour le build. La carte du profil est retirée de la page de lancement d'une séance (cohérent avec J-030). Désormais vérifié avec `npm run typecheck`, `npm run build` et `npm run lint` (0 erreur, 6 avertissements préexistants).
- **Tests** : `e2e/compare-logic.mjs` (écarts, couleurs, préréglages, passages d'année et bissextile, période précédente de mois, trimestre, année et dates libres) ; `e2e/results-compare.mjs` (navigateur, API des statistiques simulée avec deux jeux de valeurs : activation, période B par défaut, écarts sur le haut de page, Vue d'ensemble, Séances, Centres, IDE, mention sur Parcours, B = mois précédent, A = mois en cours puis « Période précédente », désactivation), réussis deux fois ; rendu contrôlé sur les données locales réelles (B sans activité : « B : 0 », « B : — »).
- **Limites** : pas d'export de la comparaison (décision) ; les motifs de clôture présents seulement en B ne sont pas listés ; la comparaison n'est pas conservée dans l'adresse de la page ; le contrôle navigateur réel n'a porté que sur la Vue d'ensemble en largeur réduite.

- **Reprise de l'affichage (même jour, J-033)** : retour de l'utilisateur : l'écart entre les deux périodes n'était pas assez visible (valeur B en petit texte gris). Refonte : en comparaison, les trois indicateurs du haut deviennent des cartes « Période A » (grand, orange) et « Période B » (grand, grisé) avec une pastille d'écart colorée (▲ vert, ▼ rouge, gris pour les durées et clôtures) et la variation en % ; la Vue d'ensemble affiche de même le score et la durée des parcours ; les tableaux Séances, Centres et IDE ont des colonnes distinctes « (A) », « B » et « Écart » ; la barre de comparaison rappelle les effectifs à date (identiques pour A et B). Les indicateurs « à date » (patients, parcours en cours) quittent la rangée du haut pendant la comparaison et restent dans la barre et la Vue d'ensemble. Composants `DeltaPill`, `ValuePair`, `CompareKpi`, `BAndDeltaCells`. `e2e/results-compare.mjs` mis à jour (étiquettes A/B, valeurs B, pastilles, colonnes) ; rendu des deux captures inspecté. Sur 7 exécutions, 6 réussies ; l'échec venait d'un délai d'affichage de la page de connexion (hors comparaison), sans reproduction ensuite.

## J-034 — 12 novembre 2026 — Poussée sur `main` (déploiement automatique Coolify)

- **Demande validée par l'utilisateur** : « commit et pousse en prod ».
- **Action réalisée** : `git push origin main` (`2fb60dc..677d574`, 13 commits : de `bef0c36` à `677d574`, lots 1 et 2, base de recette, comparaison de périodes). Le webhook GitHub de l'application Coolify (diaverum.elysium-solution.com, décrite comme préproduction dans la mémoire de l'assistant) lance le déploiement automatique ; les migrations, dont `Version20261112120000` (suivi d'activité des parcours), s'appliquent au démarrage du service `php` (DEPLOYMENT.md). Aucun second déploiement n'a été lancé (règle : le double déploiement a corrompu PostgreSQL le 17 octobre 2026).
- **Avant la poussée** : suite API 197 tests réussie sur le dernier état du code serveur, build et vérification de types du front réussis, scripts navigateur à écritures simulées réussis. Non fait : relecture d'ensemble par une personne tierce ; essai de la migration sur une copie des données distantes ; vérification des sauvegardes PostgreSQL de Coolify (DEPLOYMENT.md les recommande).
- **Suivi du déploiement** : l'outil Coolify (serveur MCP elysium) est indisponible dans cette session (authentification rejetée) ; l'état du déploiement n'est donc pas lisible depuis ici. À vérifier dans Coolify : déploiement terminé, service `php` sain (migrations appliquées), connexion et KPI par rôle.

## J-035 — 16 novembre 2026 — Filtre multi-centres avec recherche (Patients et Parcours)

- **Demande de l'utilisateur** : sur les pages Patients et Parcours, un filtre de centres avec recherche et sélection multiple.
- **Changements** : nouveau composant `CenterMultiSelect` (liste cochable filtrée par nom ou ville, sans accents ; « N centres » quand plusieurs ; « Tous les centres » remet à zéro). Il remplace la liste à choix unique des deux écrans. `api/hooks.ts` : `query` accepte une liste (`center[]=…`) ; `usePatients` et les filtres de parcours prennent `center: string[]`. Serveur : `/api/patients` et `/api/training_programs` acceptaient déjà plusieurs valeurs (filtre IRI d'API Platform) ; `SummaryController::filterCommon` (compteurs par statut) accepte désormais `center` ou `center[]`, sans changer les autres écrans (séances, Résultats). Le centre imposé par l'écran Résultats (`centerId`) est conservé.
- **Tests** : `ListFiltersTest` réussi (6 tests, 38 assertions, `make test c="--filter ListFiltersTest"` sur la base de test) dont le nouveau `testSeveralCentersCanBeSelectedAtOnce`. Vérification de types et lint du front réussis. Contrôle navigateur sur l'application locale (compte de démonstration) : Patients, un centre = 4 patients, deux centres = 7 ; Parcours, recherche « lyon » puis sélection = 3 parcours et pastilles recalculées. Suite complète non relancée.
- **Non fait** : les exports Excel/PDF des patients ne reprennent pas encore le filtre de centres (ils suivent la sélection cochée).
- **Suite (même jour) : écran Résultats** : `StatisticsView` utilise `CenterMultiSelect` (libellé « National (tous les centres) » ou « Tous mes centres » ; l'API des statistiques acceptait déjà `centers[]`). `ProgramsTable` reçoit `centerIds` (remplace `centerId`) : l'onglet Parcours suit la sélection de la page et n'affiche plus son propre sélecteur (qui apparaissait en double quand « tous » était choisi). Contrôle navigateur local : un centre = 4 patients, deux centres = 7, onglet Parcours = 6 parcours ; types et lint du front réussis. Non repris : le filtre de centre de l'écran Séances (`SessionsTable`) reste à choix unique.

## J-036 — 16 novembre 2026 — Modification de son propre compte (page Mon compte)

- **Demande de l'utilisateur** : pouvoir modifier son compte depuis `/account`.
- **Choix** (sans arbitrage explicite) : prénom, nom, email et mot de passe modifiables ; le rôle et les centres restent gérés par un cadre ou un administrateur. Le mot de passe actuel confirme toujours la demande (comme pour le code de sécurité). Un changement d'email ou de mot de passe ferme les sessions du compte (jetons de rafraîchissement supprimés) et le front déconnecte : l'identifiant du jeton est l'email, il ne survivrait pas au changement.
- **Changements** : `PATCH /api/me` (`ProfileController`, `UpdateProfileRequest`) : 403 si mot de passe actuel faux, 422 si email déjà pris (comparé en minuscules) ou nouveau mot de passe trop faible (12 caractères, robustesse moyenne, mêmes règles que les comptes) ; front : `useUpdateProfile`, bouton « Modifier mon compte » et boîte de dialogue dans `AccountPage`, phrase sur la gestion des informations corrigée.
- **Tests** : `ProfileTest` (5 tests, 17 assertions : nom modifié, mauvais mot de passe, email pris, connexion avec nouveaux identifiants et refus des anciens, mot de passe faible), réussis ; types et lint du front réussis ; navigateur local : mot de passe faux refusé, prénom modifié puis rétabli. Le changement d'email ou de mot de passe n'a été vérifié que par l'API (pour ne pas altérer les comptes de démonstration), pas dans le navigateur. Suite complète non relancée.
- **Limites** : pas de limitation de débit sur la confirmation par mot de passe (comme le code de sécurité) ; un jeton d'accès déjà émis reste valable jusqu'à 15 minutes après un changement de mot de passe.

## J-037 — 16 novembre 2026 — Onglet Parcours unique (ex-« Parcours bis »)

- **Demande de l'utilisateur** : Éligibilité à gauche de Parcours ; supprimer l'ancien onglet Parcours ; « Parcours bis » devient le vrai Parcours.
- **Changements** : `PatientDetailPage` : onglets Éligibilité, Parcours, Séances, Compétences ; l'ancien contenu de l'onglet Parcours est retiré (la section de création/composition `ProgramSection` reste utilisée par la vue Parcours quand il n'y a pas de parcours ou que le patient n'est pas éligible) ; l'onglet « Parcours bis » prend le nom « Parcours ». Le composant `PatientProgramBis` garde son nom de fichier. CLAUDE.md : consigne « conserver les deux onglets » remplacée. Ouverture par défaut inchangée (Parcours si éligible, sinon Éligibilité).
- **Perte assumée** : la case à cocher qui permettait de décocher une séance déjà validée (écart noté en J-019) disparaît avec l'ancienne vue ; le choix des optionnelles se fait par « Choisir optionnel ».
- **Vérifications** : typecheck réussi ; navigateur local : ordre des onglets, vue Parcours d'un patient avec parcours et d'un patient sans parcours. `e2e/patient-program-bis.mjs` mis à jour (non rejoué). **Non mis à jour** : `learner-workflow.mjs`, `stopwatch.mjs`, `resume-prompt.mjs`, `scenario.mjs` ciblent le balisage de l'ancienne vue (par ex. `div.p-3.rounded-xl`) et peuvent échouer ; ils rechargent les données, donc non lancés ici.

## J-038 — 16 novembre 2026 — Test CODEX : une seule passation par patient

- **Demande de l'utilisateur** : bloquer le test CODEX une fois passé (une seule fois) ; « Faire passer le test » grisé ensuite.
- **Changements** : `CodexTestProcessor` refuse (422, `WorkflowException`) tout nouveau test d'un patient qui en a déjà un ; fiche patient (onglet Éligibilité) : bouton grisé avec info-bulle dès qu'un test existe ; `CodexTestPage` affiche un message avec retour à la fiche si le patient a déjà un test (accès direct par l'adresse), sauf pendant la fin de la validation du test qu'on vient d'enregistrer. Aucune migration, aucune contrainte en base : les patients qui ont déjà plusieurs tests (données historiques) sont inchangés et l'historique reste affiché.
- **Tests** : `CodexTest::testTheTestCanOnlyBePassedOncePerPatient` ajouté ; `EndToEndJourneyTest` adapté (il repassait un second CODEX à l'étape 4 : désormais refusé, l'éligibilité se rétablit par décision de l'IDE). Suite complète : 204 tests, 1452 assertions réussis. Navigateur local : bouton grisé pour un patient testé, page du test bloquée par adresse directe.
- **Limites** : une annulation de test par un cadre (cas d'une erreur de saisie) n'existe pas ; la règle n'est pas garantie en base face à deux envois simultanés. Scripts e2e qui repassent un CODEX (`scenario.mjs`, `learner-workflow.mjs`…) non revus.
- **Suite (même jour) : info-bulle au survol** : l'attribut `title` du bouton grisé ne s'affichait pas (un bouton désactivé ne reçoit pas le survol). Le bouton est enveloppé dans un `Tooltip` (message « Le test CODEX a déjà été passé : il ne peut l'être qu'une seule fois. »), et `components/ui/tooltip.tsx` passe par un `Portal` (sans lui, l'info-bulle restait invisible dans la carte). Vérifié dans le navigateur local ; typecheck réussi. Le bouton PDF de la liste des patients a le même défaut (`title` sur bouton désactivé), non repris.

## J-039 — 16 novembre 2026 — « Éligible » seulement après le test CODEX

- **Demande de l'utilisateur** : dans la fiche Éligibilité, ne pas proposer « Éligible » tant que le CODEX n'est pas passé (obliger à le faire) ; avant : seulement « Enregistré » et « Non éligible ».
- **Changements** : front (`EligibilitySection`) : l'option « Éligible » n'apparaît qu'une fois un test CODEX enregistré, avec une mention sous le champ ; un patient déjà éligible (dossier antérieur à la règle) la garde. Serveur (`PatientProcessor`, branché sur le PATCH de `Patient`) : passage à « éligible » refusé (422) sans test CODEX ; le non-éligible reste possible sans CODEX ; un patient déjà éligible n'est pas concerné. L'écran de passation du CODEX n'est pas affecté (le test est enregistré avant la décision).
- **Tests** : `CodexTest::testPatientCanOnlyBeDeclaredEligibleAfterTheCodex` ajouté ; `PatientArchiveTest` adapté (il déclarait un patient éligible sans CODEX) ; suite complète : 205 tests, 1463 assertions réussis. Navigateur local : patient sans CODEX → options « Enregistré » et « Non éligible » seulement.
- **Non fait / limites** : les imports en masse et le chargeur de démo ne passent pas par cette règle (les patients de démonstration éligibles sans test existent) ; non vérifié dans le navigateur : l'apparition de l'option après passation d'un CODEX.

## J-040 — 16 novembre 2026 — Libellés : séances optionnelles et bibliothèque

- **Demande de l'utilisateur** : bouton « Choisir optionnel » renommé « Sélection séances optionnelles » ; « Bibliothèque » renommé « Bibliothèque des cours ».
- **Changements** : `PatientProgramBis.tsx` (bouton et phrase d'aide), `PatientDetailPage.tsx` (message d'erreur qui cite le bouton), `Sidebar.tsx` (entrée du menu) et `CourseLibraryPage.tsx` (titre de la page, auparavant « Bibliothèque de cours », aligné sur le menu). Aucun script e2e ne citait ces textes. Vérifié dans le navigateur local ; typecheck réussi.

## J-041 — 16 novembre 2026 — « Valider le parcours » visible mais grisé pour une IDE

- **Demande de l'utilisateur** : le bouton doit apparaître pour une IDE, grisé, avec un message au clic ou au survol : « Seul un profil "Cadre de santé" peut valider définitivement le parcours d'EHD d'un patient. »
- **Changements** : `PatientDetailPage` (`ProgramActions`) : pour un profil non cadre, le bouton est affiché sur un parcours actif, grisé (`aria-disabled`, pas `disabled`, pour rester cliquable), avec info-bulle au survol et notification au clic ; cadres et administrateurs inchangés (bouton actif, désactivé seulement sans séance validée). Le serveur refusait déjà la validation à une IDE (`ROLE_CADRE` sur `/complete`) : rien à changer côté API.
- **Vérifications** : typecheck réussi ; navigateur local en IDE de démonstration : bouton grisé, info-bulle et notification affichées. Non revérifié ici : l'aspect pour un cadre (code inchangé).
- **Remarque** : l'application nomme ce profil « Cadre de service » (libellés de rôle) alors que le message dit « Cadre de santé », conformément à la demande ; à harmoniser si besoin.

## J-042 — 16 novembre 2026 — Fenêtre « Créer le parcours » : systématiques en accordéons

- **Demande de l'utilisateur** : pour un patient éligible, l'onglet Parcours propose bien « Créer le parcours » avec sa fenêtre ; dans la fenêtre, les cours obligatoires restent cochés et grisés mais regroupés dans des accordéons, pour arriver directement sur les optionnelles, puis le bouton « Valider ».
- **Changements** : `CreateProgramDialog` (`PatientDetailPage`) : séances systématiques regroupées par chapitre dans un `Accordion` replié par défaut (cases cochées et désactivées, nombre de séances par chapitre) ; optionnelles visibles dessous ; bouton « Créer le parcours » → « Valider ». Nouveau hook `useChapters` (les modules n'exposent que l'IRI du chapitre). Le bouton « Créer le parcours » de l'onglet Parcours existait déjà pour un patient éligible sans parcours : inchangé, la fenêtre ne s'ouvre pas d'elle-même.
- **Vérifications** : typecheck réussi ; navigateur local (IDE Lyon de démonstration, patient éligible sans parcours) : chapitres repliés, ouverture d'un chapitre → lignes cochées et grisées, bouton « Valider ». Création effective du parcours non testée (pour ne pas modifier les données de démonstration).
- **Correction (même jour, J-042)** : retour de l'utilisateur : les systématiques ne doivent pas être un accordéon par chapitre mais **un seul accordéon**, « Séances systématiques (26) · incluses d'office », replié par défaut. Fait : un seul `Accordion` ; à l'intérieur, les 26 séances (cochées, grisées), avec le nom du chapitre en petit repère. Vérifié dans le navigateur local : optionnelles et bouton « Valider » visibles sans défilement, 26 lignes cochées et désactivées à l'ouverture.

## J-043 — 16 novembre 2026 — « Parcours d'EHD à valider » (tableau de bord et liste Parcours)

- **Demande de l'utilisateur** : en plus de « Éligibilité à statuer », une carte pour les cadres et administrateurs nationaux avec les patients ayant fini toutes leurs séances ; le même filtre dans la page Parcours. Titre de la carte : « Parcours d'EHD à valider ».
- **Définition retenue** : parcours ni achevé ni interrompu, avec au moins une séance sélectionnée et toutes les séances sélectionnées validées (post-test compris s'il est sélectionné). Un parcours inactif (15 jours sans activité) mais terminé compte aussi.
- **Changements** : API : paramètre `readyToValidate=true` sur `/api/training_programs` (`ProgramReadyToValidateFilter`), compteur `toValidate` dans `/api/summaries/training_programs` ; front : pastille « À valider (n) » après « Tous » dans `ProgramsTable` (visible par tous les profils, aussi via `/parcours?statut=a_valider`), carte du tableau de bord réservée aux cadres et administrateurs (5 patients, nombre total, lien « Voir les n parcours »), `useProgramList` accepte `enabled`.
- **Tests** : `ProgramActivityTest::testProgramsWithEveryChosenSessionValidatedAreReadyToValidate` (terminé / reste une séance / sans séance, disparaît une fois validé) ; navigateur local en administrateur : carte et pastille affichées (aucun parcours local terminé : vide, la liste non vide n'est vérifiée que par le test d'API).
- **À arbitrer** : la pastille est visible des IDE (elles ne peuvent pas valider) ; à réserver aux cadres si souhaité.
- **Ordre (même jour, J-043)** : à la demande de l'utilisateur, la carte « Parcours d'EHD à valider » passe avant « Séances en cours » sur le tableau de bord (ordre : Parcours d'EHD à valider, Séances en cours, Éligibilité à statuer). Vérifié dans le navigateur local ; typecheck réussi.
- **Ordre (même jour, J-043, suite)** : « Éligibilité à statuer » passe aussi avant « Séances en cours ». Ordre final du tableau de bord : Parcours d'EHD à valider, Éligibilité à statuer, Séances en cours, Activité récente. Vérifié dans le navigateur local ; typecheck réussi.

## J-044 — 16 novembre 2026 — « Achevé(s) » devient « Validé(s) » dans Résultats

- **Demande de l'utilisateur** : dans Résultats, remplacer partout « Achevés » par « Validés ».
- **Changements (libellés seulement, aucun calcul ni nom de champ modifié)** : écran Résultats : indicateur « Parcours validés », Vue d'ensemble (« Parcours validés », « Validés », « Du patient enregistré au parcours validé », mention de période), tableau Centres (colonne « Validés ») ; statut de parcours « Validé » dans les listes et pastilles (`PROGRAM_ACTIVITY_LABELS`, `PROGRAM_STATUS_LABELS`, donc aussi l'onglet Parcours de Résultats, la liste Parcours et l'écran de l'IDE) et « Validé le … » dans la liste ; exports statistiques : colonne « Validés » et note de durée (Excel), colonne et indicateur du PDF. `e2e/scenario.mjs` mis à jour.
- **Non modifié (hors Résultats, à arbitrer)** : fiche patient (« Parcours achevé », « sera achevé », bandeau vert), bilan patient (statut « Achevé » via `Labels::ACTIVITY`, « Achevé le » dans l'Excel et le PDF, test `RecetteDatasetTest` qui l'attend), rappel de reprise (« cours n'ont pas été achevés »), commentaires de code. Le vocabulaire est donc mixte entre Résultats et ces écrans.
- **Vérifications** : typecheck réussi ; 206 tests API réussis ; navigateur local : plus aucune occurrence d'« achev… » dans les onglets Vue d'ensemble, Parcours et Centres.

## J-045 — 16 novembre 2026 — Champs obligatoires : nouvel utilisateur et nouveau centre

- **Demande de l'utilisateur** : création d'un utilisateur : tous les champs obligatoires ; nouveau centre : seul le nom obligatoire.
- **Utilisateur** : les quatre champs de saisie (nom, prénom, email, mot de passe provisoire) étaient déjà obligatoires ; le rôle a une valeur par défaut. Ajouts : astérisque sur chaque libellé, mention « Tous les champs sont obligatoires » dans la fenêtre, et blocage à l'envoi avec le message « Choisissez au moins un centre. » quand aucun centre n'est choisi (l'API le refusait déjà pour une IDE ou un cadre ; un administrateur national n'a pas de centre). À la modification d'un compte, le mot de passe reste facultatif.
- **Centre** : `CenterDialog` : seul « Nom * » est obligatoire (la ville ne l'est plus) ; `Center::city` n'a plus `NotBlank` (la colonne reste non nulle : chaîne vide si absente). `CenterImporter` : la ville reste obligatoire pour l'import en masse (colonne du modèle), règle rendue explicite ; sinon `ImportTest` aurait changé de comportement.
- **Tests** : `CenterTest::testOnlyTheNameIsRequired` ajouté ; suite complète : 207 tests, 1475 assertions réussis ; typecheck réussi ; navigateur local : astérisques et refus sans centre (aucun compte créé), fenêtre centre avec seul le nom obligatoire.
- **À noter** : un centre sans ville s'affiche sans ville dans les listes (la clé de doublon nom + ville reste valable) ; la création de centre n'a pas été testée de bout en bout dans le navigateur.

## J-046 — 16 novembre 2026 — Message de confirmation de fin de cours

- **Demande de l'utilisateur** : dans la fenêtre d'alerte de validation des compétences : « Êtes-vous sûr ? Vous ne pourrez pas modifier le score ou les compétences validées. »
- **Changement** : `TrainingSessionPage` (`CompetencyValidationScreen`, confirmation de « Terminer le cours ») : titre « Êtes-vous sûr ? » (avant « Clôturer la séance ? ») ; texte « Vous ne pourrez pas modifier le score ou les compétences validées. » (avant « La durée et le score seront enregistrés ; cette action est définitive. ») ; le décompte « n compétence(s) validée(s) sur m » est conservé au-dessus. Boutons inchangés. Typecheck réussi ; fenêtre non vérifiée dans le navigateur (elle s'ouvre en fin de séance patient).

## J-047 — 16 novembre 2026 — « Clôturer le parcours » réservé aux cadres (grisé pour une IDE)

- **Demande de l'utilisateur** : pour les IDE, faire sur « Clôturer le parcours » la même chose que sur « Valider le parcours » : bouton grisé avec un texte.
- **Décisions (non précisées par l'utilisateur, à corriger si besoin)** : texte « Seul un profil « Cadre de santé » peut clôturer le parcours d'EHD d'un patient. » ; la restriction est aussi appliquée côté serveur : `POST /api/training_programs/{id}/interrupt` exige désormais `ROLE_CADRE` (une IDE pouvait jusqu'ici clôturer un parcours). La reprise d'un parcours interrompu (« Reprendre ») reste ouverte aux IDE.
- **Changements** : `PatientDetailPage` : composant `CadreOnlyButton` (bouton `aria-disabled`, info-bulle au survol, notification au clic) utilisé pour « Valider » et « Clôturer » ; `TrainingWorkflowController::interruptProgram` : `#[IsGranted('ROLE_CADRE')]`. Tests adaptés : `EndToEndJourneyTest` et `TrainingWorkflowTest` clôturent désormais par un cadre et vérifient le 403 pour une IDE.
- **Vérifications** : 207 tests, 1479 assertions réussis ; typecheck réussi ; navigateur local en IDE de démonstration : bouton grisé, info-bulle au survol, notification au clic, aucune fenêtre de clôture ouverte. Aspect côté cadre non revérifié (code inchangé).

## J-048 — 16 novembre 2026 — Code national affichable par les administrateurs nationaux (options A + C)

- **Demande de l'utilisateur** : après analyse du cahier des charges (l'« envoi automatique à tous les admin nationaux » n'y précise pas le canal ; le mot « mail » n'y figure nulle part) : options A (copie chiffrée affichée sur demande) et C (date et auteur du dernier changement) ; mot de passe redemandé à chaque affichage ; **pas d'email** : une notification à la connexion d'un administrateur national (« le code national a été modifié par …, cliquer pour le voir ») ; tous les administrateurs nationaux peuvent l'afficher. Masquage automatique après 30 secondes (point 2, réponse implicite).
- **Serveur** : colonnes `code_encrypted` (texte) et `seen_by` (jsonb) sur `national_security_code` (migration `Version20261116120000`) ; `NationalCodeVault` (libsodium secretbox, clé `NATIONAL_CODE_KEY` en base64 sur 32 octets, absente de la base ; sans clé : rien n'est chiffré ni affichable, la vérification hachée continue) ; `SecurityCodeManager` : plus d'envoi d'email, `nationalCodeStatus`, `revealNationalCode`, `acknowledgeNationalChange` ; `SecurityCodeController` : `GET /api/national-security-code` (état, jamais le code), `POST …/reveal` (mot de passe redemandé, limiteur 5 essais / 15 min, réponse `no-store`, ligne « Code national affiché » au journal d'accès), `POST …/acknowledge`. Celui qui change le code est considéré comme prévenu ; chaque nouveau changement prévient de nouveau les autres. Un code défini avant cette fonction n'est pas affichable (hash seul) : pas de popup pour lui, le panneau demande de le redéfinir.
- **Front** : panneau « Code national » (date et auteur, « Afficher le code » avec mot de passe, code en grand, copier, masquage à 30 s, section « Changer le code national ») ; popup `NationalCodeNotice` dans `AppLayout` pour les administrateurs nationaux (« Voir le code », « Plus tard » pour la session, « Ne plus me le rappeler » = acquittement) ; absente sur la page du code.
- **Configuration** : `api/.env` (`NATIONAL_CODE_KEY=` vide), `.env.test` (clé de test), `compose.override.yaml` (clé de développement), `docker-compose.prod.yml` + `.env.prod.example` + `DEPLOYMENT.md` (à définir dans Coolify avant le déploiement ; perdue ou changée : le code ne s'affiche plus, un administrateur le redéfinit ; vérification des codes non affectée). README mis à jour.
- **Tests** : `SecurityCodeTest` : test d'email remplacé (0 email) ; ajout : affichage par tous les administrateurs avec mot de passe, refus cadre/IDE, trace au journal, notification puis acquittement, nouveau changement, ancien code non affichable (409), limitation à 5 essais. Suite complète : 211 tests, 1521 assertions réussis ; typecheck et lint (0 erreur, 6 avertissements préexistants). Navigateur local : ancien code non affichable, redéfinition (9999), mauvais mot de passe refusé, affichage, masquage à 30 s, journal, popup après simulation d'un changement par un autre administrateur (SQL sur la base locale), « Voir le code » mène au panneau et la popup se ferme. La base locale a gardé le code de démonstration 9999.
- **Avant déploiement** : créer `NATIONAL_CODE_KEY` dans Coolify (`openssl rand -base64 32`) puis pousser (un push déclenche le déploiement : pas de second déploiement) ; la migration s'applique au démarrage ; un administrateur doit redéfinir le code une fois pour qu'il devienne affichable. Les mails de création de compte et de mot de passe oublié restent hors périmètre (cahier des charges muet).
- **Limites** : le code est réversible pour qui détient la base **et** la clé du serveur ; pas de rotation de clé prévue ; l'ancien envoi d'email est supprimé (le cahier des charges demande un « envoi automatique », ici remplacé par la notification dans l'application : à faire valider par le client).

## J-049 — 16 novembre 2026 — Mot de passe provisoire : changement obligatoire à la première connexion

- **Question de l'utilisateur** : comment gérer les IDE qui oublient leur mot de passe ? Réponse retenue (pas d'email) : option 1 = garder le circuit actuel (le cadre ou l'administrateur réinitialise et transmet un mot de passe provisoire) et **forcer la personne à choisir le sien** dès la connexion. Le cahier des charges ne dit rien du mot de passe oublié ; les options avec lien par email (invitation, « mot de passe oublié » libre-service) restent à proposer au client avec un vrai SMTP.
- **Serveur** : colonne `must_change_password` sur `app_user` (migration `Version20261116130000`), exposée dans `/api/me` et dans la liste des utilisateurs ; `UserProcessor` la passe à vrai dès qu'un cadre ou un administrateur fixe un mot de passe (création ou réinitialisation) ; `ProfileController` la remet à faux quand la personne choisit son mot de passe (changer son nom ou son email ne la lève pas). Comptes créés par la commande `app:user:create` ou les jeux de démonstration : non concernés.
- **Front** : `ForcedPasswordDialog` (bloquante, non fermable) dans `AppLayout` : mot de passe provisoire, nouveau mot de passe, confirmation ; contrôles de concordance, de différence avec le provisoire et de robustesse ; après enregistrement : message puis déconnexion (l'API ferme les sessions), reconnexion avec le nouveau mot de passe. Prioritaire sur la fenêtre du code de sécurité (code demandé à la connexion suivante). Textes des fenêtres « Nouvel utilisateur » et « Réinitialiser le mot de passe » mis à jour.
- **Tests** : `ProfileTest` : mot de passe fixé par un cadre → obligation ; changer son nom ne la lève pas ; choisir son mot de passe la lève ; compte créé par un cadre → obligation. Suite complète réussie (voir ci-dessous) ; typecheck et lint (0 erreur, 6 avertissements préexistants). Navigateur local (IDE Lyon de démonstration, indicateur forcé par SQL) : fenêtre bloquante, refus si confirmation différente, changement valide → déconnexion, reconnexion sans fenêtre, puis mot de passe de démonstration rétabli et vérifié.
- **Limites** : l'obligation n'est appliquée que par l'interface (un appel direct à l'API reste possible avec le mot de passe provisoire) ; un administrateur national seul qui perd son mot de passe n'a toujours pas de recours dans l'application (autre administrateur ou commande serveur) ; aucun indicateur « mot de passe provisoire » dans la liste des utilisateurs (la donnée est disponible).

## J-050 — 16 novembre 2026 — Diaporama de présentation refait (sans contenu de séances)

- **Demande de l'utilisateur** : refaire le diaporama de présentation de l'application avec les dernières évolutions, sans aucun contenu de séances dans les écrans ou ailleurs ; puis ajouter le logo Diaverum sur la page de couverture.
- **Réalisation** : le diaporama existant (hors dépôt, publié comme artefact) est mis à jour sur le même lien : 30 diapositives (trois nouvelles : mot de passe provisoire, code national, validation du parcours), 24 nouvelles captures prises sur la **base de recette fictive** (noms fictifs, aucune donnée de test personnelle), titres des séances et des thématiques remplacés dans la page avant chaque capture (« Intitulé de la séance », « Thématique »). Les écrans de la tablette (lecteur de cours, compétences, clavier du code) sont remplacés par des schémas sans contenu ; les bilans PDF par un schéma avec des codes de séance seulement ; les captures de connexion sont sans le bloc des comptes de démonstration. Vocabulaire à jour : « validé » au lieu d'« achevé ». Logo officiel (`front/public/brand/diaverum-logo-primary.svg`, converti en PNG) sur une plaque blanche en couverture.
- **Base de recette** : migrée à la version actuelle, parcourue via la procédure de `RECETTE_BASE_FICTIVE.md`, puis rétablie dans son état documenté (modifications temporaires annulées : parcours de Bruno EnCours, tests CODEX, éligibilité de Gaëlle EnAttente ; code national remis à 9999) ; l'application locale est revenue sur la base de développement, non touchée.
- **Limites** : les captures datent de l'état de l'application au 16 novembre 2026 (dernier commit `8911b91`) ; le diaporama est privé (lien visible du seul propriétaire tant qu'il n'est pas partagé) ; pas de capture des écrans de la tablette (choix délibéré).

## J-051 — 16 novembre 2026 — Diaporama : vrais exports PDF, vrais écrans de fin de cours, code et comparaison

- **Demande de l'utilisateur** : dans le diaporama, mettre un vrai export PDF dans la page « Le bilan du patient, prêt à imprimer », les vrais visuels de fin de cours, préciser dans les résultats qu'on peut comparer, et mettre le vrai écran du code de sécurité.
- **Réalisation (diaporama, hors dépôt)** : première page d'un **vrai bilan PDF** (page « Le bilan du patient ») et d'une **vraie synthèse statistique PDF** (page « Cinq exports ») générés par l'application sur la base de recette fictive, avec les titres de séances remplacés dans cette base jetable avant génération ; vrais écrans de fin de cours (compétences, confirmation « Êtes-vous sûr ? », « Cours validé ») et du clavier du code, pris avec l'interface réelle mais un contenu de cours neutre simulé (aucune écriture en base) ; nouvelle diapositive « Comparer deux périodes, en un clic » avec capture du mode comparaison, et mention dans la diapositive Résultats. Contenu des séances toujours absent (intitulés et compétences neutres, mention sous les captures).
- **Corrections trouvées en route (application)** : synthèse statistique PDF : en-tête « Durée moy. (achevés) » resté à l'ancien vocabulaire → « (validés) », et tableau « Parcours » qui dépassait de la page → mise en page resserrée (`table.dense`, `statistics.html.twig`, `_layout.html.twig`) ; écran « Cours validé » : le bouton « Cours suivant » avait une hauteur fixe et son texte débordait → `min-h` au lieu de `h` (`TrainingSessionPage.tsx`). Typecheck et 213 tests réussis ; non commité.
- **Bases de données** : la base de recette a été sauvegardée (`pg_dump`), parcourue puis **restaurée à l'identique** (`pg_restore`) ; l'application locale est revenue sur la base de développement, non touchée.
- **Limites** : le bilan PDF ne montre pas de compétences validées (les données fictives n'en ont pas) ; le diaporama a aussi été modifié depuis la page par l'utilisateur (couverture, titre de la diapositive « patient ») : ces modifications ont été conservées. Le titre « La patient active du centre » semble contenir une faute (« La file active » attendu), à vérifier.
- **Suite (même jour, J-051)** : à la demande de l'utilisateur, la page « Le bilan du patient » du diaporama reprend son PDF réel `bilans-patients-2026-11-12.pdf` (première page, DUPONT Jean ; ce PDF affiche les intitulés des séances) à la place de mon export, et la page « La tablette passe au patient » remplace le schéma par deux vraies captures du lecteur de cours (accueil de la séance et une page du cours S1, seul cours disposant de contenu dans la base de développement), avec un patient de démonstration et la création de séance simulée (aucune séance enregistrée). Les écrans de fin de cours (page « L'IDE reprend la tablette ») gardent un contenu neutre. L'application est revenue sur la base de développement.

## J-052 — 16 novembre 2026 — Intégration des cours S1 et S2, évolutions du lecteur et de l'éditeur

- **Demande de l'utilisateur** : commencer l'intégration des cours (storyboards et graphismes déposés dans `doc/integration/`), tout intégrer en local puis pousser en production ; validation page par page, rien de plus sans son accord.
- **Contenus** : intitulés définitifs S1 à S16 (migration `Version20261116140000`) ; S1 repris avec les graphismes définitifs (pictos, pages) puis retouché par l'utilisateur dans l'éditeur (15 pages, 4 questions de quiz) ; S2 intégrée (17 pages, 12 images d'animation, 3 pictos sur planche). Pages 1 et 2 de S2 validées, la suite à relire. Commande `app:content:export` ajoutée : base → `api/content/<code>.json` (les retouches de l'éditeur ne sont versionnées qu'après cet export ; un `app:content:import` sans export les écraserait).
- **Lecteur** : cartes à retourner qui remplissent la page (hauteur réglable), image à légendes avec pictos issus d'une planche (taille proportionnelle à l'image, titres cachés jusqu'au toucher, légendes sans texte acceptées), picto « ? » du graphiste sur les pages interactives seulement, encadrés (cadre vert 3 px, sans fond ni titre), texte des cartes de carrousel encadré, questions en texte normal avec retours à la ligne et gras `**`, bouton de validation centré, mention « Question non notée » retirée, image sans fond à sa taille d'origine (hauteur réglable), activité image + texte centrée, carrousel sans points ni fond (image adaptée à la hauteur de l'écran), marges du bandeau réduites sur tablette basse, titres longs du bandeau plus petits.
- **Éditeur** : image à légendes (aperçu fixe, légendes en accordéon, planche de pictos importée une fois, taille des repères), réglages de hauteur des cartes et des images, aide au formatage des questions ; les aperçus (apprenant, tablette 1280 × 800) utilisent le même rendu que le lecteur.
- **Vérifications** : build et typecheck du front réussis, lint sans erreur (5 avertissements préexistants), 214 tests API / 1534 assertions ; relectures dans le lecteur sur 1024 × 768 et 1280 × 800. Test `CourseContentTest` adapté aux 4 questions de la version retouchée de S1.
- **Limites** : rendus relus sur ordinateur (pas sur la vraie Galaxy Tab) ; la maquette XD de S1 n'est pas reproduite en tout (réponses en cases bordées, titres des quiz « QUIZ DE FIN DE MODULE 1/5 »…) ; images S2 non relues page par page au-delà de la page 2 ; en production il faudra importer les contenus (`app:content:import content/S1.json content/S2.json`) après le déploiement ; `NATIONAL_CODE_KEY` à créer dans Coolify (J-047/J-048).
- **Suite (même jour)** : à la demande de l'utilisateur, la confirmation « Aucun cours optionnel sélectionné / Revoir le parcours / Lancer le cours » est **supprimée** (`useCourseLaunch` lance directement le cours) ; un parcours sans cours optionnel peut donc être lancé sans avertissement. Tests e2e `learner-workflow.mjs` et `stopwatch.mjs` adaptés (syntaxe vérifiée, non rejoués).
- **Suite (même jour) : S0 retirée et bouton « Aperçu » supprimé** : la séance S0 est archivée par la migration `Version20261116150000` (absente de la bibliothèque et des nouveaux parcours ; retirée des parcours existants où elle n'a jamais été lancée, conservée sinon pour l'historique ; réversible par `down`). Le parcours passe à 25 séances pré-cochées sur 32 ; `TrainingProgramTest` adapté (214 tests / 1534 assertions réussis). Le bouton « Aperçu » (prévisualisation sans séance) à côté de chaque cours du parcours du patient est supprimé ; l'aperçu de l'éditeur de cours est conservé.

## J-053 — 18 novembre 2026 — Écran de lancement de S1 (lot 3)

- **Demande utilisateur** : afficher les compétences à valider avant de commencer le cours, dans le bloc blanc proposé ; élargir les deux blocs et faire tenir le rappel de sécurité sur deux lignes à la taille tablette.
- **Choix de présentation** : dans `front/src/pages/TrainingSessionPage.tsx`, les deux blocs du gabarit de lancement passent à 576 px maximum. Le titre complet et la liste « Compétences à valider » figurent dans le bloc blanc ; la liste reprend les libellés du cours utilisés pour la validation IDE, sans saisie en double. Le storyboard S1 VF2, diapositive 38 (« COMPÉTENCES COURS N°1 »), confirme les deux thèmes ; la formulation existante de la compétence sur les directives anticipées est conservée. Aucun arbitrage métier.
- **Vérifications** : typecheck, build et diff réussis. Première tentative sous Vite dev sans rendu dans Chromium ; reprise sur le build servi localement. Avec API simulée, les deux compétences S1 s'affichent, le titre reste entier, le rappel tient sur deux lignes et le bouton est visible aux tailles 1280 × 800, 800 × 1280, 1024 × 768 et 768 × 1024. Captures des deux orientations inspectées. À 390 × 640, le rappel passe sur trois lignes et le bouton reste accessible par défilement ; le toucher lance la séance et ouvre le premier écran.
- **Limites et suite** : pas de recette sur la tablette physique ; rendu contrôlé avec la police de repli (Euclid non disponible au build). Aucun changement de contenu, de base ou de déploiement. Relire l'écran avec l'utilisateur, puis poursuivre les retours de S1 page par page ; aucun critère complet du lot 3 à cocher.

## J-054 — 18 novembre 2026 — Consigne de la page 1 de S1 (lot 3)

- Demande utilisateur : afficher « Touchez une carte pour répondre à la question. » sur « Droits du patient 1/2 ». Le storyboard S1 VF2, diapositives 2 à 4, confirme mot pour mot la consigne.
- Modification ciblée du champ `instruction` de `p01` dans `api/content/S1.json`. Le bandeau partagé donne priorité à ce champ sur la consigne générique des cartes. Après contrôle de la stack Docker de développement et du contenu existant, application de ce seul champ à S1 dans la base locale `diaverum` (une ligne mise à jour, valeur retournée vérifiée).
- JSON et diff vérifiés. Le premier essai Chromium via le serveur de développement n'a pas chargé l'application à temps. Sur le build local avec patient fictif et API simulée, contrôle de l'affichage du libellé exact dans le lecteur. Recette sur tablette physique et relecture des pages suivantes à poursuivre. Aucun déploiement ni critère complet du lot 3 à cocher.

## J-055 — 18 novembre 2026 — Consigne par défaut des cartes à retourner (lot 3)

- Demande utilisateur : généraliser « Touchez une carte pour répondre à la question. » comme consigne par défaut et conserver la priorité des consignes renseignées. Décision qui étend la correction ciblée J-054.
- Le bandeau commun (`front/src/lib/courseVisuals.ts`) utilise la consigne de la page si elle est renseignée, puis celle du bloc de cartes, puis la nouvelle valeur par défaut. Les espaces seuls équivalent à un champ vide. L'éditeur (`front/src/components/course-editor/BlockFields.tsx`) montre le texte par défaut sous le champ « Consigne des cartes ». Les textes déjà renseignés, dont les anciens libellés explicites du modèle S99, restent prioritaires.
- Typecheck, build, suite unitaire et diff réussis. Vérification ciblée du défaut et des priorités avec des données fictives. Rendu du défaut vérifié dans Chromium à 1280 × 800 et 800 × 1280 avec API simulée. Le premier essai de redimensionnement en plein écran a échoué et a été rejoué avec le plein écran simulé. Pas de vérification sur tablette physique, d'écriture en base ou de déploiement. Poursuivre la relecture de S1 page par page. Aucun critère complet du lot 3 à cocher.

## J-056 — 18 novembre 2026 — Questions non notées sans correction (lot 3)

- Demande utilisateur : sur la page 4 de S1 et pour toutes les questions non notées, ne révéler aucune solution et n'attribuer aucun score. La page 4 est déjà configurée en QCU non noté dans le contenu versionné.
- Le storyboard S1 VF2 (diapositive 13, page 4) précise une seule tentative, aucune notification de solution et aucun score. Le §4 du cahier des charges est la référence du calcul existant dans `ScoreCalculator` : les exercices notés seuls entrent au numérateur et au dénominateur.
- Le composant partagé `QuizComponent.tsx` applique la règle aux QCU, QCM et associations, y compris avec l'ancien flag `showCorrection: true`. La progression repose sur la réponse validée et le score de cette réponse est absent (null). `scoring.ts`, le lecteur et les aperçus représentent cette absence. L'éditeur masque les réglages de correction hors notation et son validateur ainsi que `ContentValidator.php` permettent d'enregistrer une question non notée sans bonne réponse, même avec l'ancien flag. Les configurations de correction déjà saisies sont conservées pour une éventuelle réactivation de la notation.
- Vérifications : typecheck, build, suite unitaire et diff réussis. PHPUnit sur `diaverum_test` : 32 tests / 212 assertions réussis après reprise du filtre mal cité dans Make. Chromium avec API simulée : QCU page 4, QCM et associations, portrait et paysage, aucune correction et séance sans note. Scénario éditeur et aperçu apprenant réussi avec authentification simulée après correction du sélecteur de la fixture, qui importait la planche de pictos au lieu de l'image principale. Tests adaptés dans `e2e/course-editor.mjs` et `api/tests/Api/ContentIntegrationTest.php`.
- La page 4 de S1 était déjà non notée dans la base de développement (vérifié en lecture seule). Aucun déploiement. Recette sur tablette physique et relecture de la page suivante à poursuivre. Aucun critère complet du lot 3 à cocher.

## J-057 — 18 novembre 2026 — Zoom des images sur option (lot 3)

- Demande utilisateur : retirer la loupe de la page 6 de S1 et désactiver l'agrandissement par défaut. Ajouter une case à cocher pour les images qui nécessitent un zoom.
- Choix technique : l'option booléenne facultative `zoomEnabled` des blocs Image (`front/src/types/index.ts`) est désactivée si elle est absente. `BlockFields.tsx` expose « Autoriser le zoom sur cette image ». `TrainingSessionPage.tsx` affiche la loupe et ouvre la vue agrandie uniquement lorsque l'option est cochée. Le rendu est partagé par le lecteur et les aperçus. S1 p06 hérite du nouveau défaut sans modification de contenu. Le réglage porte sur les blocs Image, qui utilisaient la loupe.
- Typecheck, build et diff réussis. Dans Chromium avec API simulée, p06 sans loupe au départ et au clic sur l'image, activation puis ouverture et fermeture en 800 × 1280 et 1280 × 800, option enregistrée dans le JSON de la requête, puis retrait de la loupe après décochage. Pas de vérification sur tablette physique, d'écriture en base ou de déploiement. Poursuivre les retours sur S1. Aucun critère complet du lot 3 à cocher.

## J-058 — 18 novembre 2026 — Coins arrondis des images de carrousel (lot 3)

- Demande utilisateur : reprendre l'arrondi des autres images sur les illustrations à l'intérieur des carrousels.
- `front/src/components/CarouselView.tsx` applique l'arrondi de 16 px directement à l'image et la centre dans la zone de défilement. L'image garde ses proportions avec des limites de largeur et de hauteur. Le composant est partagé entre lecteur et aperçus.
- Build et diff réussis. Aperçu Chromium sur les deux premières illustrations du carrousel de la page 5 de S1 avec API simulée : rayon de 16 px, proportions et navigation précédent/suivant vérifiés à 800 × 1280 et 1280 × 800. Tablette physique à recetter. Aucun changement de contenu, écriture en base ou déploiement. Continuer la relecture de S1. Aucun critère complet du lot 3 à cocher.

## J-059 — 18 novembre 2026 — Hauteur du carrousel de S1 page 5 (lot 3)

- Demande utilisateur : augmenter la hauteur du carrousel uniquement sur « Personne de confiance 2/3 » (S1 p05).
- Le gabarit partagé (`front/src/components/CarouselView.tsx`, type dans `front/src/types/index.ts`) accepte la variante de hauteur `large`, appliquée uniquement au bloc `s1-pc-role` dans `api/content/S1.json`. En base Docker de développement `diaverum`, mise à jour ciblée de ce même champ, une ligne confirmée.
- Build et diff réussis. Chromium avec API simulée : zone d'image mesurée à 400 px en 1280 × 800 (+70 px) et 480 px en 800 × 1280 (+80 px). Défilement, arrondi et proportions vérifiés. Contrôle de la page 8 à 330 px en paysage. L'image conserve ses proportions et peut être limitée par la largeur disponible. Aucun déploiement, tablette physique à recetter. Poursuivre la relecture de S1. Aucun critère complet du lot 3 à cocher.

## J-060 — 18 novembre 2026 — Commit des retours sur S1 (lot 3)

- Demande utilisateur : créer un commit local des retours J-053 à J-059 sur le lancement, les consignes, les questions non notées, le zoom et les carrousels. Le commit regroupe le contenu S1, le gabarit, l'éditeur, les tests adaptés et le suivi de ces interventions.
- Vérification avant commit : diff sans erreur et index initialement vide. Les vérifications fonctionnelles sont détaillées dans les entrées J-053 à J-059. La note de poussée J-034 déjà modifiée dans `HANDOFF.md` et les fichiers non suivis restent dans le dossier de travail. Poursuivre la relecture du cours 1. Aucun déploiement ni critère du lot 3 à cocher.

## J-061 — 18 novembre 2026 — Carrousel de S1 page 5 sur l'espace disponible (lot 3)

- Demande utilisateur : remplacer la simple augmentation de hauteur de J-059 par un carrousel qui occupe l'espace de la page, uniquement sur S1 p05.
- Choix de mise en page : réutilisation de la variante `large` de J-059, renseignée uniquement sur S1 p05. Dans `courseVisuals.ts`, `TrainingSessionPage.tsx` et `CarouselView.tsx`, quand le carrousel est seul sur la page, il utilise la colonne extensible qu'emploient déjà les cartes. La zone d'image prend la hauteur restante après la question et la légende et l'illustration reste entière, avec ses coins arrondis. Les aperçus emploient le même gabarit.
- Build et diff réussis. Lecteur en aperçu Chromium avec API simulée : à 800 × 1280 et 1280 × 800, la zone correspond exactement à l'espace restant après question, légende et marges, sans défilement vertical dans le scénario. Proportions, arrondi, précédent/suivant et hauteur standard de p08 à 330 px contrôlés. Le premier essai mesurait un seuil fixe inadapté aux retours à la ligne en portrait ; remplacé par la mesure de l'espace effectivement disponible. Pas de tablette physique, d'écriture en base ni de déploiement. Poursuivre la relecture de S1. Aucun critère complet du lot 3 à cocher.

## J-062 — 18 novembre 2026 — Légendes du carrousel de S1 page 9 (lot 3)

- Demande utilisateur : inclure le mot « choix » dans le passage en gras de la première légende et aligner à gauche toutes les légendes de la page 9 (« Directives anticipées 3/3 », identifiant p08).
- Le contenu `api/content/S1.json` étend le gras à « faire connaître ses choix » et active l'alignement gauche sur `s1-da-role`. Le rendu partagé `CarouselView.tsx` lit l'option facultative déclarée dans `types/index.ts`. Mise à jour ciblée des deux champs dans la base Docker de développement `diaverum`, une ligne confirmée.
- Build et diff réussis. Chromium avec API simulée : alignement des quatre légendes et présence du passage en gras vérifiés dans l'aperçu apprenant à 800 × 1280 et 1280 × 800. Tablette physique à recetter. Aucun déploiement. Poursuivre la relecture de S1. Aucun critère complet du lot 3 à cocher.

## J-063 — 18 novembre 2026 — Texte à côté de l'image en page 10 de S1 (lot 3)

- Demande utilisateur : centrer verticalement le texte par rapport à l'image, le justifier et remplacer « la loi permet la sédation » par « elle permet la sédation » en gardant le gras.
- `api/content/S1.json` applique le centrage et la justification au bloc `s1-sedation` (p09) et remplace le libellé dans le passage en gras. Le gabarit partagé `TrainingSessionPage.tsx` et `types/index.ts` prennent en charge le centrage vertical par bloc. `TextStyleFields.tsx` expose l'alignement justifié. Mise à jour ciblée de ce bloc en base Docker de développement `diaverum`, une ligne confirmée.
- Build et diff réussis. Chromium avec API simulée : centrage, justification et balise de gras vérifiés dans l'aperçu à 800 × 1280 et 1280 × 800, après correction du sélecteur de test du champ Alignement. Tablette physique à recetter. Aucun déploiement et aucun critère complet du lot 3 à cocher. Poursuivre la relecture de S1.

## J-064 — 18 novembre 2026 — Conclusion de S1 page 11 (lot 3)

- Demande utilisateur : choisir une composition image à gauche et texte à droite pour la page 11, même si le storyboard diffère. Centrer le texte en hauteur, l'aligner à gauche, utiliser des tirets et arrondir l'image.
- Choix validé par l'utilisateur pour cette page : réutiliser le bloc image et texte de la page précédente. `api/content/S1.json` réunit l'image et le texte de la conclusion en un bloc `image-text`, aligné à gauche et centré en hauteur. La même illustration utilise les coins arrondis du gabarit et quatre tirets remplacent les puces rondes. Mise à jour ciblée de p10 en base Docker de développement `diaverum`, une ligne confirmée.
- JSON et diff vérifiés. Chromium avec API simulée sur le build local : image à gauche, arrondi, quatre tirets, alignement du texte et centrage en hauteur vérifiés à 800 × 1280 et 1280 × 800. Tablette physique à recetter. Aucun déploiement ni critère complet du lot 3 à cocher. Poursuivre la relecture de S1.

## J-065 — 18 novembre 2026 — Consigne commune des QCU et QCM (lot 3)

- Demande utilisateur : employer par défaut « Touchez la ou les réponses qui vous paraissent exactes. » et retirer la mention « Plusieurs réponses ».
- `front/src/lib/courseVisuals.ts` utilise le nouveau texte pour les deux types de choix lorsqu'aucune consigne de page n'est renseignée. `front/src/components/QuizComponent.tsx` retire la mention redondante du gabarit partagé. Les consignes explicites et celles des activités d'association restent prioritaires dans leur contexte.
- Build et diff réussis. Chromium avec API simulée : texte exact sur QCU et QCM, suppression de la mention, consigne personnalisée et progression après validation contrôlées. Le rendu QCM a été vérifié en 800 × 1280 et 1280 × 800. Pas de tablette physique, d'écriture en base ou de déploiement. Poursuivre la relecture de S1. Aucun critère complet du lot 3 à cocher.

## J-066 — 18 novembre 2026 — Validation éditoriale et commit de S1 (lot 3)

- Validation explicite de l'utilisateur : le cours 1 est validé. Il demande un commit local des révisions J-061 à J-065, en complément de J-060.
- Périmètre : contenu S1, rendu partagé et champ de justification de l'éditeur, avec la traçabilité associée. Le diff est sans erreur et les médias référencés par S1 sont suivis dans Git. Les vérifications navigateur et les limites sont consignées dans J-061 à J-065. La note J-034 et les fichiers non suivis restent locaux.
- Suite : reprendre le lot 3 sur le cours suivant, avec la recette sur tablette physique et la publication comme étapes distinctes. Aucun critère global du lot 3 à cocher.

## J-067 — 18 novembre 2026 — Reprise de l'intégration du cours S2 (lot 3)

- Demande utilisateur : intégrer le cours 2 après validation du cours 1. Reprise de la version locale de J-052, qui comporte 17 écrans et trois compétences. Sources : storyboard `S2_EHD_diaverum_VF.pptx` et graphismes de la séance 2 fournis dans `doc/integration/`.
- Comparaison de la copie locale avec Git avant import : contenu et métadonnées identiques. Le premier export de vérification préfixait le JSON par l'affichage de la base, retiré avant comparaison. Correspondance avec le storyboard vérifiée pour le déroulé, les exercices et les compétences. La page 4 du storyboard (diapositives 9 à 19) prévoit une vidéo : remplacement du carrousel provisoire par le MP4 fourni dans `front/public/courses/S2/contaminations-croisees.mp4` et ajout de la transcription issue du contenu existant. Le bloc vidéo est reconnu par le validateur, le lecteur et l'éditeur. La couverture de rendu `e2e/course-theme.mjs` inclut ce type.
- Page 15 (diapositives 36 et 37) : jusqu'à deux tentatives pour le classement. Premier essai entièrement juste validé immédiatement. En cas d'erreur, nouvelle tentative sur les choix précédents, correction et score à la dernière validation. Choix d'implémentation : seul le dernier résultat est compté, selon le calcul existant du §4 du cahier des charges. Le lecteur et les aperçus réutilisent le même bloc. Les réponses attendues existantes sont conservées, la grille de correspondance du storyboard étant ambiguë sur certains éléments et les explications de la page 6 soutenant le classement intégré.
- Pages 7 et 8 : consigne commune et aucune correction ni note, conformément à la décision générale J-056 qui prime ici sur « Notifier la solution » du storyboard. Clés des exercices et trois compétences existantes conservées. Les changements touchent `api/content/S2.json`, `ContentValidator.php`, `TrainingSessionPage.tsx`, `InteractiveBlocks.tsx`, l'éditeur (`model.ts` et `BlockFields.tsx`) et `types/index.ts`.
- Vérifications : typecheck, build, tests unitaires front et 13 tests PHP de contenu (24 assertions) réussis. Chrome, API simulée : 17 écrans et médias contrôlés à 1280 × 800 et 800 × 1280, vidéo lue avec commandes natives et transcription, carrousels de quatre images parcourus, trois compétences affichées avant lancement, second essai du classement réussi et avance débloquée. Un premier mesurage relevait le débordement transitoire de l'animation de navigation, contrôle repris une fois le rendu stabilisé.
- Import S2 uniquement en base Docker de développement `diaverum`, 17 pages confirmées et export final identique au fichier du dépôt. Pas de déploiement. Suite : relecture utilisateur page par page, en reprenant à partir de la page 3, avec validation éditoriale et recette sur tablette physique encore à obtenir. Aucun critère complet du lot 3 à cocher.

## J-068 — 18 novembre 2026 — Intégration des cours S3, S4 et S5 (lot 3)

- Demande utilisateur : intégrer également les cours 3, 4 et 5. Sources : storyboards et graphismes des trois séances dans `doc/integration/`. Reprendre le gabarit partagé et les règles de consigne et de notation déjà validées.
- Avant import, inventaire et sauvegarde JSON locale des trois entrées. S3 et S5 n'avaient aucun écran. S4 contenait trois écrans génériques de démonstration, sauvegardés dans `/tmp/diaverum-before-J068-S4.json` avant remplacement. La requête d'inventaire initiale mal citée a été rejouée en lecture seule et a confirmé la base locale `diaverum`.
- Ajout de `api/content/S3.json` (20 écrans, 3 compétences), `S4.json` (13 écrans, 3 compétences) et `S5.json` (24 écrans, 1 compétence) et de 45 médias sous `front/public/courses/S3`, `S4` et `S5`. Titres, descriptions, durées et statut du catalogue conservés. S3 précise la durée prescrite dans une compétence conformément au storyboard. Repères positionnés sur les images après inspection.
- Choix à relire : les numéros contradictoires des storyboards S3 et S5 ont été normalisés dans l'ordre des diapositives en conservant les exercices distincts. La question orale Oui/Non de S5 est non notée, l'appréciation relève de l'IDE. Dans l'exercice S3 sur les symptômes, le classement porte sur les signes explicitement cités dans l'écran d'apprentissage. La catégorie complémentaire « Autres signes » évite de qualifier de bénins des symptômes et la grille du storyboard est à rapprocher du texte avant validation éditoriale, notamment pour les nausées. Les six illustrations d'« Après la dialyse : que surveiller ? » ne figurent pas parmi les graphismes S3 reçus. Les six textes sont intégrés en cartes à retourner, composition provisoire à revoir si les images sont fournies.
- Vérifications : build front, présence des médias, diff et 16 tests PHP de contenu (36 assertions) réussis. Le premier aperçu utilisait un build antérieur qui ne contenait pas les nouvelles images. Après rebuild, 57 écrans parcourus dans chacune des deux orientations Chromium (1280 × 800 et 800 × 1280), carrousels parcourus, médias décodés et légendes ouvertes avec API simulée. Import uniquement des trois cours en base locale, puis export de contrôle identique aux trois JSON sources.
- Suite : relecture utilisateur page par page de S2 à S5 et recette sur tablette physique avant publication. Aucun déploiement distant ni critère complet du lot 3 à cocher.

## J-069 — 18 novembre 2026 — Relecture de S2 pages 1 et 2 (lot 3)

- Demande utilisateur : mettre l'affirmation de la page 1 en gras et faire tenir la page 2 sur un seul écran, avec des fenêtres pour les légendes si nécessaire.
- Précision utilisateur : un retour qui désigne une page s'applique uniquement à cette page dans ce cours. Généraliser un comportement seulement si la demande le précise. Cette règle guidera les retouches suivantes.
- `api/content/S2.json` met l'affirmation de p01 en gras et active `legendDialog` uniquement sur le bloc à légendes de p02. Le lecteur et les aperçus partagent cette variante facultative via `TrainingSessionPage.tsx` et `types/index.ts`. Dans ce mode, les trois pictogrammes ouvrent une légende en fenêtre et l'illustration est redimensionnée en paysage étroit. Mise à jour ciblée de ces deux champs dans la base de développement `diaverum`, une ligne confirmée.
- Build et diff réussis. Chromium avec API simulée : gras de p01, trois fenêtres et p02 sans défilement en 1280 × 800, 800 × 1280, 1024 × 768 et 1200 × 800. Contrôle sur une autre page à légendes (S3) : légende intégrée, sans fenêtre. Un premier essai a nécessité de cibler l'illustration précisément et de réduire la largeur à 1024 × 768. Tablette physique à recetter, aucun déploiement. Poursuivre la relecture de S2.

## J-070 — 18 novembre 2026 — Relecture de S2 page 3 (lot 3)

- Demande utilisateur : réduire l'image, tenir sur un écran, centrer le texte en hauteur et mettre « précautions standard d’hygiène. » en gras. Ce passage identifie la page 3 de S2.
- `api/content/S2.json` ajoute au seul bloc `s2-standard` le centrage vertical existant et une largeur d'image maximale de 320 px, déclarée dans `front/src/types/index.ts` et lue par le gabarit partagé `TrainingSessionPage.tsx`. Les autres blocs sans ce champ utilisent leur largeur habituelle. Mise à jour ciblée de p03 dans la base Docker locale `diaverum`, une ligne confirmée.
- Build et diff réussis. Chromium avec API simulée : gras, largeur maximale, centrage et absence de défilement vérifiés en 1280 × 800, 800 × 1280, 1024 × 768 et 1200 × 800. La tablette physique reste à recetter. Aucun déploiement ni critère complet du lot 3 à cocher. Poursuivre la relecture de S2.

## J-071 — 18 novembre 2026 — Relecture de S2 page 5 (lot 3)

- Demande utilisateur : agrandir les deux images, mettre leurs légendes en gras et placer la phrase introductive dans un encadré Important, avec seulement « 2 techniques différentes » en gras. La phrase identifie S2 p05.
- `api/content/S2.json` applique au seul bloc p05 une largeur d'image de 340 px maximum et met les deux légendes en gras. La phrase passe dans un encadré Important utilisant le gabarit existant. Le champ optionnel `imageWidth` dans `types/index.ts` et `PictoGridView.tsx` est limité aux blocs qui le renseignent. Mise à jour ciblée en base locale `diaverum`, une ligne confirmée.
- Build et diff réussis. Chromium avec API simulée : largeur, légendes en gras, gras partiel dans l'encadré et absence de défilement vérifiés en 1280 × 800, 800 × 1280, 1024 × 768 et 1200 × 800. Page 6 contrôlée à 100 px pour ses pictos. Tablette physique à recetter, aucun déploiement. Poursuivre la relecture de S2.

## J-072 — 18 novembre 2026 — Encadré Important de S2 page 5 (lot 3)

- Demande utilisateur : centrer et resserrer l'encadré Important, puis accentuer l'espace qui le sépare des images, sur la page 5 uniquement.
- Variante facultative `compact` activée sur le seul bloc `s2-techniques-important` dans `api/content/S2.json`. Le gabarit (`TrainingSessionPage.tsx`, type dans `types/index.ts`) ajuste la largeur au contenu, réduit les marges internes et l'icône, et augmente l'intervalle avant les images de 20 à 40 px. Mise à jour ciblée en base Docker de développement `diaverum`, une ligne confirmée.
- Build et diff réussis. Chromium avec API simulée : centrage, boîte resserrée, intervalle d'environ 40 px et absence de défilement vérifiés en 1280 × 800, 800 × 1280, 1024 × 768 et 1200 × 800. Le contrôle de largeur des images a été rejoué avec une tolérance d'arrondi d'un pixel. Aucun déploiement ni recette sur tablette physique. Poursuivre la relecture de S2.

## J-073 — 18 novembre 2026 — Taille de l'icône de S2 page 5 (lot 3)

- Demande utilisateur : conserver la taille d'origine de l'icône Important. Ce choix remplace la réduction d'icône de J-072.
- `front/src/pages/TrainingSessionPage.tsx` rend à l'icône de l'encadré compact sa taille standard de 80 px sur tablette. L'encadré reste ajusté au contenu et centré avec 40 px avant les images. Aucun changement du JSON ou de la base locale.
- Build et diff réussis. Le premier test isolait p05 comme premier écran et affichait l'indication supplémentaire de navigation, avec défilement à 1024 × 768. Test repris en avançant depuis p04 : icône de 80 px, centrage, intervalle et absence de défilement confirmés dans Chromium aux quatre dimensions tablette habituelles. Aucun déploiement. Poursuivre la relecture de S2.

## J-074 — 18 novembre 2026 — Espacement et comparaison en S2 pages 5 et 6 (lot 3)

- Demande utilisateur : augmenter l'espace sous l'encadré à la page 5. À la page 6, mettre l'introduction en texte normal, agrandir les images, mettre les deux titres en gras au-dessus des images et aligner les explications à gauche sous chaque image.
- `api/content/S2.json` porte à environ 52 px l'écart sous le seul encadré de p05. À p06, la comparaison utilise deux illustrations de 250 px maximum, les titres au-dessus en gras, les explications alignées à gauche et l'introduction en graisse normale. Options limitées aux blocs concernés dans `types/index.ts`, `TrainingSessionPage.tsx` et `PictoGridView.tsx`. Titres modifiables dans `BlockFields.tsx` sur les blocs de comparaison. Mise à jour ciblée en base Docker locale `diaverum`, une ligne confirmée.
- Build et diff réussis. Lecteur Chromium avec API simulée : écart p05, taille de l'icône, styles et placement des textes et images p06, absence de défilement sur p05 et p06 en 1280 × 800, 800 × 1280, 1024 × 768 et 1200 × 800. Aucun déploiement, tablette physique à recetter. Poursuivre la relecture de S2.

## J-075 — 18 novembre 2026 — Images et explications de S2 page 6 (lot 3)

- Demande utilisateur : agrandir les images et centrer chaque bloc de texte sous son image, en conservant le texte aligné à gauche. La demande suit la comparaison de la page 6 (J-074).
- `api/content/S2.json` porte la largeur de 250 à 320 px sur p06. En mode comparaison (`PictoGridView.tsx`), le texte utilise la largeur de l'image et se centre sous celle-ci avec les lignes alignées à gauche. Application ciblée en base Docker de développement `diaverum`, une ligne confirmée.
- Build, diff et vérification Chromium avec API simulée réussis : même largeur et même bord gauche pour l'image et son texte sur les deux colonnes, alignement à gauche et absence de défilement à 1280 × 800, 800 × 1280, 1024 × 768 et 1200 × 800. Page 5 également contrôlée. Aucun déploiement. Poursuivre la relecture de S2.

## J-076 — 18 novembre 2026 — Puces, pictos et mise en page de S2 (lot 3)

- Demande utilisateur : tirets à gauche et carrés à droite à la page 6. Aérer les pictos et appliquer le gras sélectif sur l'écran identifié par la phrase « Pour limiter la prolifération… » (p09 dans S2). Page 10, mettre tout le texte à droite de l'image, centré verticalement, avec le gras du storyboard.
- `api/content/S2.json` applique les tirets et carrés à p06, les trois passages demandés en gras à p09, et réunit le texte de p10 dans le bloc image-texte. Le gras de p10 suit les portions de la diapositive 25 du storyboard. La mention « page 7 » a été interprétée comme p09, seule page qui contient la phrase citée et les trois pictos. La vraie p07 est un QCU.
- La variante facultative `spread` (type dans `types/index.ts`) étire le bloc de pictos de p09 et répartit ses lignes verticalement via `PictoGridView.tsx`, `courseVisuals.ts` et `TrainingSessionPage.tsx`. Rien d'autre ne l'active. Application ciblée des trois pages sur la base Docker de développement `diaverum`, après contrôle des anciens blocs, une mise à jour confirmée.
- Build et diff réussis. Chrome avec API simulée : puces de p06, gras et répartition de p09, position, centrage et gras de p10 contrôlés à 1280 × 800, 800 × 1280, 1024 × 768 et 1200 × 800. P09 et p10 tiennent sans défilement à ces tailles. Aucun déploiement. Poursuivre la relecture de S2.

## J-077 — 18 novembre 2026 — S2 page 12, espacements et gras (lot 3)

- Demande utilisateur : centrer verticalement le texte face à l'image et au picto, reprendre le gras du storyboard et répartir les blocs sur la hauteur. Pour les prochaines pages traitées, appliquer ce principe de mise en page et suivre le gras du storyboard, en gardant la règle de périmètre de J-069.
- `api/content/S2.json` reprend les deux passages en gras de la diapositive 30 du storyboard, centre les deux textes par rapport aux illustrations et active la disposition facultative `layout: spread` uniquement sur p12. Dans `types/index.ts`, `courseVisuals.ts`, le lecteur et les aperçus (`TrainingSessionPage.tsx`, `CourseEditorPage.tsx`, `TabletPreview.tsx`), cette disposition distribue l'espace vertical disponible autour des blocs. Variante absente des autres pages.
- Build et diff réussis. Chromium avec API simulée : centres verticaux et passages en gras contrôlés, espace de 57 à 185 px entre les blocs selon le format, aucun défilement à 1280 × 800, 800 × 1280, 1024 × 768 et 1200 × 800. Page 13 vérifiée dans sa disposition habituelle. Application ciblée de p12 dans la base Docker locale `diaverum`, une ligne confirmée. Aucun déploiement. Poursuivre la relecture S2 avec ce principe.

## J-078 — 18 novembre 2026 — Retrait de S2 page 16 (lot 3)

- Demande utilisateur : retirer l'écran p16 du cours 2, la question sur les symptômes d'une infection de l'abord. Ajuster la numérotation des trois exercices restants sans modifier leurs réponses.
- `api/content/S2.json` supprime p16 et renumérote les titres p14, p15 et p17 de 1/3 à 3/3. La page p17 occupe maintenant la 16e position. Le score est calculé sur les exercices restants selon le calcul existant. Les réponses et identifiants des exercices conservés ont été comparés à l'export précédent et sont identiques.
- JSON, diff et 16 tests PHP de validation des contenus réussis (36 assertions). Mise à jour ciblée de la fin du cours dans la base Docker de développement `diaverum` après comparaison des quatre écrans, une ligne confirmée et 16 écrans en base. Aucun déploiement. Poursuivre la relecture de S2.

## J-079 — 18 novembre 2026 — Commit du cours S2 (lot 3)

- Demande utilisateur : créer le commit local du cours 2. Périmètre : contenu S2, vidéo, gabarit partagé, éditeur, validation et recette liées aux interventions J-067 et J-069 à J-078.
- Vérifications : index initialement vide, diff sans erreur, 16 écrans et médias référencés présents. Les tests de rendu et de contenu sont détaillés dans les entrées précédentes. Les fichiers et notes d'intégration S3 à S5 (J-068) et la note J-034 restent dans le dossier de travail. Aucun déploiement.

## J-080 — 18 novembre 2026 — Relecture de S3 pages 1 à 4 (lot 3)

- Demande utilisateur : encadrés Important au-dessus des images aux pages 1 et 3, accompagnement de l'équipe déplacé dans le texte à droite à la page 1, mise en gras conforme au storyboard, introduction du carrousel en gras à la page 2, puces carrées à la page 3 et légendes en fenêtres à la page 4.
- `api/content/S3.json` réutilise les blocs et variantes du lecteur : encadrés Important centrés au-dessus de l'image et texte à droite et centré verticalement en p01 et p03, gras de la diapositive 2 en p01, consigne en gras p02 et deux puces carrées p03. `legendDialog` est activé uniquement sur p04. Le texte sur l'accompagnement de l'équipe fait désormais partie du paragraphe de p01. Application ciblée des quatre pages dans la base Docker locale `diaverum` après comparaison de l'état existant, une ligne confirmée et 20 écrans conservés.
- Diff et 7 tests PHP de contenu (27 assertions) réussis. Chrome avec API simulée : gras, puces et fenêtres vérifiés, p01 et p03 sans défilement en 1280 × 800, 800 × 1280, 1024 × 768 et 1200 × 800. Comportement en ligne de la légende de p05 également contrôlé. Aucun déploiement. Poursuivre la relecture de S3.

## J-081 — 18 novembre 2026 — Largeur de l'image en S3 page 1 (lot 3)

- Demande utilisateur : faire occuper au moins la moitié de la largeur de l'écran par l'image de la page 1, si le rendu le permet.
- `api/content/S3.json` remplace le plafond de 340 px de p01 par l'option `imageWidth: half-screen`, déclarée dans `types/index.ts` et appliquée dans `TrainingSessionPage.tsx`. En aperçu, le plafond relatif de 60 % du bloc laisse de la place au texte si la fenêtre est plus étroite que l'écran. La correction a été appliquée uniquement à p01 dans la base Docker locale `diaverum`, une ligne confirmée.
- Build et diff réussis. Chrome avec API simulée : image mesurée à 640, 400, 512 et 600 px sur les quatre tailles, exactement la moitié de la largeur, texte à droite et centré en hauteur. Le premier test sans défilement a signalé un dépassement. Mesure finale : aucun en portrait, 21 à 53 px de défilement en paysage avec l'indication du premier écran. Page 3 vérifiée à sa largeur précédente de 320 px. Aucun déploiement. Poursuivre la relecture de S3.

## J-082 — 18 novembre 2026 — Relecture de S3 pages 2 à 4 (lot 3)

- Demande utilisateur : centrer et resserrer l'encadré p02, agrandir l'image de p03 jusqu'à la moitié de l'écran si possible, et mettre l'introduction de p04 en gras.
- `api/content/S3.json` utilise les variantes existantes. P02 : encadré Objectif conservé conformément au storyboard, centré avec marges internes compactes et icône de 80 px, sans marge ajoutée après le dernier bloc. P03 : image à 50 % de la largeur de l'écran aux tailles testées. P04 : phrase intégralement en gras. Application ciblée des trois pages en base Docker de développement `diaverum` après comparaison de l'état initial, une ligne confirmée.
- Diff et 7 tests PHP de contenu (27 assertions) réussis. Chrome avec API simulée : alignement et taille du pictogramme p02, largeur et centrage p03, gras et fenêtres p04 vérifiés en 1280 × 800, 800 × 1280, 1024 × 768 et 1200 × 800. L'encadré utilise la largeur disponible en portrait lorsque le texte s'enroule. P03 tient en portrait et présente de 4 à 36 px de défilement selon le paysage testé. Aucun déploiement. Poursuivre la relecture de S3.

## J-083 — 18 novembre 2026 — Image au-dessus de la navigation en S3 page 1 (lot 3)

- Demande utilisateur : remonter légèrement l'image sur la page 1 pour qu'elle reste entièrement au-dessus de « Précédent » et « Page suivante ».
- `api/content/S3.json` réduit la marge sous l'encadré et désactive l'indication de geste sur la seule p01 pour dégager la hauteur nécessaire. Le champ facultatif `showSwipeHint` dans `types/index.ts` et `TrainingSessionPage.tsx` laisse le geste et les boutons disponibles. Mise à jour ciblée en base Docker locale `diaverum` après comparaison de l'état existant, une ligne confirmée.
- Build et diff réussis. Chrome avec API simulée : image toujours à 50 % de la largeur, au-dessus de la navigation et page sans défilement en 1280 × 800, 800 × 1280, 1024 × 768 et 1200 × 800. Pages 2 à 5 parcourues et conservées. Aucun déploiement. Poursuivre la relecture de S3.

## J-084 — 20 novembre 2026 — Relecture de S3 pages 3 à 8 (lot 3)

- Demande utilisateur : espacer les puces p03, rétablir les légendes sous l'image p04, modifier les encadrés et textes p05 à p07, et utiliser des fenêtres sans titre et des repères plus petits p08.
- S3 p03 : ligne vide entre les deux puces. P04 : légendes intégrées rétablies, remplace J-080. P05 : introduction en gras, encadré Important en premier et fenêtres avec le texte seul. P06 : encadré en premier, phrases demandées rétablies et quatre puces carrées. P07 : encadré compact centré avec icône standard, illustration limitée à 170 px et texte à 20 px pour garder la ligne du coussin entière en portrait. P08 : repères ramenés de 48 à 32 px, fenêtres sans titre et passage demandé en gras.
- Fichiers : `api/content/S3.json`, `types/index.ts` et `TrainingSessionPage.tsx` pour l'option facultative masquant le titre de fenêtre. Les autres fenêtres conservent leur titre.
- Build et diff réussis. Chrome avec API simulée : six pages contrôlées à 1280 × 800, 800 × 1280, 1024 × 768 et 1200 × 800, fenêtres ouvertes pour chaque repère p05/p08, absence du mot Repère, légende intégrée p04 et ligne du coussin sur une seule ligne p07. Le script initial avait perdu ses interceptions API, réparées avant reprise. Réduire seulement l'image à 110 px ne suffisait pas en portrait ; choix final image 170 px et texte 20 px. Import ciblé des six pages en base locale `diaverum`, une ligne confirmée, 20 pages conservées. Aucun déploiement. Poursuivre la relecture S3.

## J-085 — 23 novembre 2026 — Retrait des puces dans les cours (lot 3)

- Demande utilisateur : retrait de 10 px entre texte courant et lignes à puces, quel que soit le type de puce, avec contrôle de la page 1 de S3. Généralisation explicitement demandée. Les symboles existants sont conservés, notamment les carrés de S3 page 3.
- `front/src/components/CourseText.tsx` reconnaît les lignes précédées d'une puce ronde, carrée ou d'un tiret et ajoute un padding gauche de 10 px, avec le gras et les sauts de ligne conservés. Rendu partagé par le lecteur et les aperçus.
- Build et diff réussis. Chrome avec API simulée : quatre lignes à puces de S3 p01 mesurées à 10 px de padding en 1280 × 800, 800 × 1280, 1024 × 768 et 1200 × 800, passages en gras conservés. Aucun changement de contenu ou de base. Recette physique à poursuivre. Aucun déploiement.

## J-086 — 23 novembre 2026 — Puces carrées de S3 page 1 (lot 3)

- Correction demandée par l'utilisateur : remplacer les tirets de p01 par des puces carrées en conservant le retrait de 10 px.
- `api/content/S3.json` remplace les quatre tirets de s3-p01-b1 par « ▪ ». Autres pages comparées à l'état initial et identiques. Mise à jour ciblée de p01 en base Docker locale `diaverum`, une ligne confirmée.
- Diff et contrôle Chromium avec API simulée réussis : quatre carrés, retrait de 10 px et gras conservés aux quatre dimensions tablette habituelles. Préparation du script reprise après une erreur de syntaxe sed. Aucun déploiement.

## J-087 — 23 novembre 2026 — Fenêtres de S3 page 4 (lot 3)

- Demande utilisateur : afficher les légendes de p04 en fenêtres au clic, sans texte sous l'image. Remplace le choix de légendes intégrées de J-084.
- Activation de `legendDialog` uniquement sur `s3-p04-b1` dans `api/content/S3.json`. Application ciblée de la page en base Docker de développement `diaverum` après comparaison de l'état initial, une ligne confirmée.
- Diff et recette Chromium avec API simulée réussis : ouverture et fermeture des deux fenêtres, texte absent sous l'image, aux quatre dimensions tablette habituelles. Aucun changement du gabarit. Aucun déploiement.

## J-088 — 23 novembre 2026 — Légendes au clic sans titres de repère (lot 3)

- Demande utilisateur : généraliser l'affichage du seul texte explicatif lors d'un clic, sans titre « Repère x », en fenêtre ou en légende intégrée. La généralisation est explicite.
- `TrainingSessionPage.tsx` retire les titres et les numéros dans les explications ouvertes des images à légendes, en fenêtres et sous l'image. Les boutons auxiliaires nommés « Repère x » montrent leur numéro seul. `InteractiveBlocks.tsx` applique le texte seul au bloc historique reveal-legends, en conservant le libellé si la description est vide.
- Build et diff réussis. Chromium avec API simulée sur S3 p04 : deux fenêtres sans titre ni « Repère », descriptions présentes, ouverture/fermeture vérifiée aux quatre tailles tablette habituelles. Aucun changement de base. Les contrôles en fenêtre ont été rejoués, la variante historique reveal-legends a été vérifiée par lecture du rendu modifié et compilation. Aucun déploiement.

## J-089 — 23 novembre 2026 — Liste imbriquée de S3 page 6 (lot 3)

- Demande utilisateur : agrandir l'image de p06, présenter les deux phrases en puces carrées et les quatre conseils en sous-liste à tirets sous la deuxième phrase.
- `api/content/S3.json` ajoute à s3-p06-b1 une liste structurée, deux li de premier niveau carrés et quatre li imbriqués à tirets sous la seconde phrase. Image maximale portée de 320 à 430 px. `types/index.ts` et `TrainingSessionPage.tsx` prennent en charge cette option sur les blocs qui la renseignent. La liste utilise des éléments ul/li et le retrait de 10 px.
- Build et diff réussis. Chrome avec API simulée : hiérarchie des six li, symboles, retrait et largeur agrandie contrôlés aux quatre tailles tablette. Largeur mesurée de 346 à 430 px, sans débordement horizontal. Le script a été corrigé pour viser le li imbriqué puis attendre la fin de l'animation d'entrée avant mesure. Pas de contrôle d'absence de défilement vertical acquis sur cette intervention. Application ciblée de p06 dans la base locale `diaverum`, une ligne confirmée. Aucun déploiement.

## J-090 — 23 novembre 2026 — Convention des colonnes de cours (lot 3)

- Décision utilisateur validée : répartir l'espace en colonnes égales pour homogénéiser les visuels. Une colonne image et une colonne texte correspondent à 50 % / 50 %. Une colonne image et deux colonnes texte correspondent à 1/3 / 2/3.
- Convention durable ajoutée à `AGENTS.md`, sur la largeur disponible du contenu en tenant compte des marges et de la gouttière. Les demandes ciblées restent limitées aux pages citées selon J-069. Aucun changement d'écran demandé dans cette intervention.
- Vérification : relecture de la convention et diff sans erreur. Aucun test fonctionnel nécessaire pour cette note, aucun changement de base ni déploiement. Appliquer ces ratios aux prochaines retouches demandées.

## J-091 — 23 novembre 2026 — Clarification sur la page à répartir en colonnes (lot 3)

- Demande utilisateur : p05, une colonne image et une colonne texte, typographie standard et espacement normal du texte à droite.
- Inspection : p05 de S3 est une image à légendes en fenêtres. Le texte à droite avec la liste imbriquée est p06. Clarification demandée sur l'écran visé avant modification, pour respecter le périmètre des pages imposé par l'utilisateur.
- Aucun changement fonctionnel ou de base. Branche et état du dépôt contrôlés, modifications antérieures préservées. Reprendre sur la page confirmée avec un ratio 50 % / 50 % et les espacements standards.

## J-092 — 23 novembre 2026 — Deux colonnes et espacement standard en S3 page 6 (lot 3)

- Clarification utilisateur : modifier uniquement la page 6. Une colonne image et une colonne texte, soit 50 % / 50 % de l'espace disponible, et réduire les espacements de la liste tout en conservant la typographie.
- Réalisation J-092 : `api/content/S3.json` active uniquement sur p06 les variantes `imageWidth: half` et `listSpacing: normal`. `types/index.ts` et `TrainingSessionPage.tsx` conservent les rendus précédents pour les blocs sans ces options. Les autres pages du JSON ont été comparées et sont identiques. Mise à jour ciblée de p06 en base Docker locale `diaverum`, une ligne confirmée.
- Build et diff réussis. Chromium avec API simulée : colonnes mesurées à largeur égale aux quatre formats tablette, police 25 px et interligne standard 34,375 px, marges supplémentaires des li ramenées à zéro. Les puces carrées, sous-listes à tirets et retrait 10 px sont conservés. Aucun déploiement.

## J-093 — 23 novembre 2026 — Préservation des pages validées (lot 3)

- Instruction explicite utilisateur : une retouche doit porter uniquement sur la page demandée, sans modifier les pages déjà reprises ou validées, ni introduire un changement partagé qui altère leur mise en page, sauf demande explicite.
- Règle durable inscrite dans `AGENTS.md` et rappelée dans `HANDOFF.md`. Les adaptations du gabarit doivent être facultatives, désactivées par défaut, et activées seulement sur la page concernée. En cas de page ambiguë, clarifier avant modification. Cette règle complète J-069 et précise J-090.
- Relecture et diff vérifiés. Aucun changement fonctionnel additionnel, de base ou de déploiement. Reprendre la relecture sur la prochaine page désignée.

## J-094 — 23 novembre 2026 — Interligne de S3 page 6 (lot 3)

- Demande utilisateur : vérifier l'écart apparent de police et d'interligne sur p06 uniquement.
- Diagnostic : la règle globale `p, li { line-height: 1.65 }` s'applique directement aux li et remplace l'interligne hérité du bloc, alors que les paragraphes du gabarit portent `leading-snug` (1,375). Taille déclarée du bloc : 25 px, famille héritée du thème du cours.
- Correction limitée aux listes portant `listSpacing: normal`, utilisé uniquement par S3 p06 : interligne 1,375 appliqué aux li via `TrainingSessionPage.tsx`.
- Build et diff réussis. Chromium avec API simulée : taille de 25 px et interligne 34,375 px identiques pour le texte et les deux niveaux de li aux quatre dimensions tablette, famille CSS identique. Colonnes toujours égales. Euclid n'est pas disponible dans les fichiers de police locaux ; le navigateur utilise la police de repli commune. Aucun changement de contenu ou de base, aucun déploiement.

## J-095 — 23 novembre 2026 — Homogénéité visuelle et typographique (lot 3)

- Décision utilisateur : conserver une présentation homogène, sauf demande spécifique. La correction d'interligne J-094 motive cette précision.
- Règle durable ajoutée à `AGENTS.md` : mêmes polices, tailles, graisses, interlignes et espacements pour les éléments de même rôle, listes alignées sur le texte courant. Adapter d'abord la disposition et conserver les exceptions explicitement validées. La règle guide les interventions futures, sans élargir le périmètre aux autres pages.
- Relecture et diff vérifiés. Aucun changement fonctionnel, de base ou déploiement. Reprendre la page suivante demandée.

## J-096 — 23 novembre 2026 — S3 pages 7 et 8 (lot 3)

- Demande utilisateur : deux colonnes égales image/texte à p07, et passages « prise en charge rapide » et « corriger la situation » en gras à p08.
- `api/content/S3.json` utilise la variante existante `imageWidth: half` sur p07, avec la taille de texte déjà demandée et validée de 20 px conservée. P08 ajoute le gras sur les deux passages de l'encadré. Les autres pages ont été comparées à l'état initial et sont identiques.
- Diff et vérification Chromium avec API simulée réussis : colonnes égales à 1280 × 800, 800 × 1280, 1024 × 768 et 1200 × 800, taille 20 px conservée, deux passages en gras présents sur p08. Mise à jour ciblée des deux pages dans la base Docker locale `diaverum`, une ligne confirmée, 20 pages conservées. Aucun déploiement.

## J-097 — 23 novembre 2026 — Taille standard du texte en S3 page 7 (lot 3)

- Retour utilisateur : texte de p07 trop petit. Il utilisait encore l'exception de 20 px introduite en J-084 pour tenir une phrase sur une ligne. Rétablissement à la taille standard de 25 px sur cette page uniquement, avec les colonnes égales conservées.
- Suppression de la taille spécifique de 20 px sur le seul bloc s3-p07-b1 dans `api/content/S3.json`. Le texte reprend 25 px, le standard du gabarit. Application ciblée en base Docker locale `diaverum` après comparaison de l'état initial, une ligne confirmée.
- Diff et contrôle Chromium avec API simulée réussis : police calculée à 25 px, colonnes toujours égales aux quatre dimensions tablette habituelles. Les autres pages n'ont pas été modifiées. Pas de contrôle de maintien de la phrase sur une seule ligne acquis avec cette taille standard. Aucun déploiement.

## J-098 — 23 novembre 2026 — S3 pages 9 et 10 (lot 3)

- Demande utilisateur : phrase introductive p09 en gras. P10, une colonne image et deux colonnes texte, encadré à droite avec le texte et vérification de la formulation.
- `api/content/S3.json` met l'introduction de p09 en gras et place l'encadré de p10 dans la colonne de texte. Options facultatives `imageWidth: third` et `infoCard` dans `types/index.ts` et `TrainingSessionPage.tsx`, activées uniquement sur p10. Texte et quatre gras de p10 rapprochés de la diapositive 24 du storyboard : formulation identique, notamment toxines, surcharge hydrique, fatigue et complications.
- Build et diff réussis. Chromium avec API simulée : p09 en gras, rapport des colonnes exactement 1:2 aux quatre dimensions tablette habituelles, encadré dans la colonne de droite sous le texte, gras vérifiés et pas de débordement horizontal. Autres pages comparées au JSON initial et seuls p09/p10 modifiés. Application ciblée des deux pages en base locale `diaverum`, une ligne confirmée, 20 pages conservées. Aucun déploiement.

## J-099 — 23 novembre 2026 — Encadré et gras de S3 page 11 (lot 3)

- Demande utilisateur : introduction « Pour limiter ce risque, il faut : » en gras et ajout de la phrase sur le risque d'hémorragie dans un encadré Important sous le carrousel.
- `api/content/S3.json` met la phrase introductive du carrousel en gras et ajoute l'encadré Important après le carrousel. Le paragraphe sur la désinsertion est conservé et la phrase ajoutée correspond au storyboard (diapositives 25, 27 et 29).
- Diff et contrôle Chromium avec API simulée réussis : gras, texte de l'encadré, position sous les images aux quatre tailles tablette et changement d'image vérifiés. Pas de garantie d'absence de défilement vertical sur cette composition. Application ciblée de p11 en base locale `diaverum`, une ligne confirmée. Aucun déploiement.

## J-100 — 23 novembre 2026 — Encadré introductif de S3 page 11 (lot 3)

- Demande utilisateur : placer le paragraphe « En cas de désinsertion d’une aiguille… » dans un bloc Important sur p11.
- `api/content/S3.json` convertit s3-p11-b1 en encadré Important, même texte et position avant le carrousel. Application ciblée de p11 en base Docker locale `diaverum`, une ligne confirmée.
- Diff et contrôle Chromium avec API simulée réussis : les deux encadrés sont présents, le paragraphe demandé figure dans le premier et le second reste sous le carrousel aux quatre dimensions tablette. Aucun déploiement.

## J-101 — 23 novembre 2026 — Suppression de S3 page 12 (lot 3)

- Demande utilisateur : supprimer « Après la dialyse : que surveiller ? », écran s3-p12 intégré provisoirement en cartes à retourner en J-068.
- Suppression uniquement de s3-p12 dans `api/content/S3.json` et en base Docker locale `diaverum`, après contrôle de l'identifiant, du contenu et du nombre initial d'écrans. Une ligne mise à jour, 19 pages confirmées. Les huit exercices restent numérotés de 1/8 à 8/8.
- Diff et 7 tests PHP de contenu réussis (27 assertions). Aucun changement du gabarit ni déploiement. Reprendre la relecture sur les exercices, désormais à partir de la page 12.

## J-102 — 23 novembre 2026 — Suppression de S3 pages 14 à 17 (lot 3)

- Demande utilisateur : supprimer les pages 14, 15, 16 et 17 selon la numérotation actuelle après J-101.
- Suppression des écrans s3-p15, s3-p16, s3-p17 et s3-p18 dans `api/content/S3.json`. Les quatre exercices restants (s3-p13, s3-p14, s3-p19 et s3-p20) sont renumérotés de 1/4 à 4/4. Leurs réponses sont conservées, les écrans d'apprentissage restent identiques.
- Diff et 7 tests PHP de contenu réussis (27 assertions). Application en base Docker locale `diaverum` après comparaison complète du cours à l'état initial, une ligne confirmée et 15 écrans restants. Aucun déploiement.

## J-103 — 23 novembre 2026 — Gras de S3 page 12 (lot 3)

- Demande utilisateur : mettre en gras toute l'affirmation sur la tenue vestimentaire et la pesée à la page 12 actuelle.
- `api/content/S3.json` encadre uniquement le texte de la question s3-p13 (position 12) par les marqueurs de gras du gabarit. Réponses conservées. JSON et diff vérifiés. Application ciblée en base Docker locale `diaverum`, une ligne confirmée. Le rendu en navigateur n'a pas été rejoué pour cette modification de balisage. Aucun déploiement.

## J-104 — 23 novembre 2026 — Correspondance S3 page 13 avec la diapositive 42 (lot 3)

- Correction utilisateur : la page 13 actuelle doit correspondre à la diapositive 42 du storyboard S3.
- `api/content/S3.json` remplace le Vrai/Faux de s3-p14 (position 13) par la question sur le malaise en séance et ses quatre propositions de la diapositive 42. Type QCM conformément à la consigne DEV, même avec une seule réponse correcte : signaler la sensation de malaise à un soignant. « en priorité » reste en gras. Numéro 2/4 conservé.
- Diff et 7 tests PHP de contenu réussis (27 assertions). Mise à jour ciblée de la page en base Docker locale `diaverum`, une ligne confirmée. Pas de recette navigateur rejouée sur cette intervention. Aucun déploiement.

## J-105 — 23 novembre 2026 — Validation éditoriale du cours S3 (lot 3)

- Validation explicite de l'utilisateur : « cours 3 validé ». Cette décision clôt la relecture éditoriale des 15 écrans actuels de S3 après les corrections J-080 à J-104.
- État : contenu dans `api/content/S3.json`, médias sous `front/public/courses/S3/` et corrections chargées dans la base de développement locale. Les validations techniques réellement exécutées et leurs limites figurent dans les interventions correspondantes.
- Vérification de cette intervention : branche et état du dépôt contrôlés, modifications existantes préservées, diff sans erreur. Aucun changement fonctionnel, commit, migration ou déploiement réalisé dans cette intervention.
- Suite : reprendre la relecture du cours suivant. La recette sur tablette physique et la publication restent à traiter ; aucun critère global du lot 3 n'est coché sur la seule validation éditoriale de S3.

## J-106 — 23 novembre 2026 — S4 page 1, repères et fenêtres (lot 3)

- Demande utilisateur : repositionner les pictogrammes, retirer la mention « Repère » et ouvrir les textes en fenêtres sur p01 uniquement.
- `api/content/S4.json` positionne cinq marqueurs de 40 px autour du rein après inspection du graphisme et des repères de la diapositive 2 du storyboard. Les étiquettes deviennent des chiffres simples et les légendes utilisent les fenêtres avec le texte seul, conformément à J-088. Les autres pages sont conservées.
- Diff et vérification Chromium avec API simulée réussis : cinq repères, cinq descriptions, ouverture/fermeture des fenêtres sans titre « Repère » aux quatre tailles tablette habituelles. Le message de succès du script réutilisé mentionne deux légendes mais la boucle et l'assertion ont bien vérifié les cinq. Application ciblée de p01 en base locale `diaverum`, une ligne confirmée. Aucun déploiement.

## J-107 — 23 novembre 2026 — S4 pages 2, 3, 4 et 6 (lot 3)

- Demande utilisateur : affirmations en gras p02/p03, encadré en haut p04, encadré et légendes en fenêtres avec marqueurs repositionnés et sans « Repère » p06.
- Correction limitée aux quatre pages dans `api/content/S4.json`. Le texte introductif existant de p06 devient un encadré Important, sans ajout de contenu médical. Quatre marqueurs de 40 px placés sur le circuit et le dialyseur après inspection du graphisme. Autres pages comparées à la sauvegarde et inchangées.
- Vérifications : structure des contenus validée par les 7 tests PHP (27 assertions) ; les quatre fenêtres de p06 s'ouvrent et se ferment sans titre aux quatre formats tablette dans Chrome avec API simulée. Comparaison des autres pages inchangées et diff sans erreur. Mise à jour ciblée du contenu S4 dans la base locale `diaverum` avec garde d'égalité sur l'ancien contenu : une ligne modifiée. Pas de déploiement ni de commit.
- Suite : poursuivre la relecture de S4 ; recette sur tablette physique restante.

## J-108 — 23 novembre 2026 — Encadré Important S4 page 1 (lot 3)

- Demande utilisateur : encadrer « Lorsque les reins fonctionnent normalement, ils filtrent le sang en permanence. » dans une box Important.
- `api/content/S4.json` déplace l'introduction de p01 dans un encadré Important avant l'image. Marqueurs et fenêtres conservés, autres pages comparées et inchangées.
- Correction appliquée à p01 en base locale `diaverum` avec garde sur l'ancien contenu : une ligne modifiée. Test Chrome avec API simulée réussi : encadré et phrase présents, cinq fenêtres sans titre ouvertes/fermées aux quatre formats tablette. Le premier essai attendait à tort un titre « Important » : le composant commun n'affiche que l'icône et le texte ; sélecteur corrigé sans changement du rendu commun. Diff sans erreur. Aucun commit ni déploiement. Suite : poursuivre la relecture S4.

## J-109 — 23 novembre 2026 — Encadré sous l'image S4 page 1 (lot 3)

- Précision utilisateur remplaçant la disposition J-108 : placer la phrase sur la filtration permanente sous l'image. L'encadré Important est conservé et déplacé après le bloc image à légendes dans `api/content/S4.json`, uniquement sur p01. Les autres pages sont comparées et inchangées.
- Vérifications : ordre des deux blocs et conservation des autres pages contrôlés, diff sans erreur. Application ciblée en base locale `diaverum` avec garde sur l'ancienne page : une ligne modifiée. Pas de nouvelle recette navigateur pour cette inversion de blocs ; les composants restent ceux vérifiés en J-108. Aucun commit ni déploiement. Suite : poursuivre la relecture S4.
- Rectification du résultat d'application ci-dessus : la première requête a modifié zéro ligne, la base ayant des positions de marqueurs différentes et encore une introduction simple. Lecture de contrôle puis mutation limitée à l'introduction et à l'ajout de l'encadré après l'image : une ligne modifiée, positions existantes en base préservées. Le JSON conserve ses positions antérieures ; cette divergence préexistante est signalée pour la reprise.

## J-110 — 23 novembre 2026 — Alignement S4 p07 et disposition p08 (lot 3)

- Demande : centrer les textes avec les pictogrammes p07 ; placer l'encadré à droite de l'image p08 et limiter la hauteur de l'image.
- Options réversibles limitées aux pages concernées : `alignCaptions` supprime les marges automatiques des pictos en ligne et aligne les textes dans l'espace restant ; `imageMaxHeight` limite l'image à 380 px et à la hauteur disponible. P08 réutilise l'encadré imbriqué existant dans la colonne texte et un tiers de largeur image. Fichiers : S4.json, PictoGridView.tsx, TrainingSessionPage.tsx, types/index.ts, index.css. Les autres pages de contenu sont comparées et conservées ; aucune option nouvelle activée ailleurs.
- Vérifications : build TypeScript/Vite réussi (avertissements connus sur polices Euclid absentes et taille de bundle). Chrome avec API simulée : cinq textes centrés verticalement avec leur picto, encadré à droite et image de p08 limitée à 380 px sans dépasser la zone de navigation aux quatre formats tablette (1280×800, 800×1280, 1024×768, 1200×800). Mise à jour ciblée en base locale `diaverum` : une ligne par page, gardes d'égalité satisfaites. Diff sans erreur. Aucun déploiement ni commit ; tablette physique non testée.
- Suite : poursuivre la relecture S4.

## J-111 — 23 novembre 2026 — Centrage S4 p07, gras p09, retrait p13 (lot 3)

- Demande utilisateur : centrer horizontalement les ensembles picto/texte p07, introduction p09 en gras et suppression de p13.
- S4.json active une option de centrage limitée à p07, met en gras l'introduction du carrousel p09 et retire s4-p13. Les trois exercices restants sont renumérotés 1/3 à 3/3. Autres pages comparées et conservées. Option `centerRows` dans types/index.ts, PictoGridView.tsx et index.css : chaque ensemble est centré dans la largeur et sa légende centrée, sans modification des pages où l'option est absente.
- Vérifications : build TypeScript/Vite réussi (avertissements préexistants polices/bundle) ; Chrome avec API simulée confirme les cinq ensembles centrés horizontalement aux quatre formats tablette, l'introduction p09 en élément strong et les 12 pages sans s4-p13. Mise à jour locale `diaverum` en transaction avec gardes sur les pages d'origine : six mutations ciblées confirmées. Diff sans erreur. Aucun commit ni déploiement ; recette physique restante.
- Suite : poursuivre la relecture du cours 4.

## J-112 — 23 novembre 2026 — Bloc S4 p07 centré avec colonnes alignées (lot 3)

- Correction utilisateur de J-111 : les cinq lignes doivent rester alignées entre elles, avec le bloc complet au centre. `front/src/index.css` centre le conteneur de largeur ajustée au contenu au lieu de centrer chaque ligne séparément. Les pictos partagent une colonne et les textes un départ commun, aligné à gauche. La variante reste activée uniquement sur S4 p07 ; aucun contenu ni autre page modifié.
- Vérifications : build TypeScript/Vite réussi ; Chrome avec API simulée confirme aux quatre formats tablette le centrage du bloc, les cinq abscisses de pictos identiques, les cinq départs de texte identiques et le centrage vertical texte/picto. Diff sans erreur. Aucune modification de base, aucun commit ni déploiement ; tablette physique non testée. Suite : poursuivre la relecture S4.

## J-113 — 23 novembre 2026 — Validation éditoriale du cours S4 (lot 3)

- Décision validée explicitement par l'utilisateur : « cours 4 validé ». La relecture éditoriale des 12 pages actuelles est clôturée après J-106 à J-112.
- Contenu dans `api/content/S4.json`, médias sous `front/public/courses/S4/`, corrections chargées localement et ajustements de rendu dans les composants communs avec options ciblées. Les vérifications et limites sont détaillées dans les entrées correspondantes, dont la divergence préexistante des positions des marqueurs p01 entre JSON et base signalée en J-109, sans arbitrage supplémentaire ici.
- Vérifications de cette intervention : branche et état du dépôt contrôlés, 12 pages confirmées dans le JSON, modifications existantes préservées et diff sans erreur. Aucun changement fonctionnel, commit, migration ou déploiement. Aucun critère global du lot 3 coché sur la seule validation éditoriale.
- Suite : reprendre la relecture du cours 5. Recette sur tablette physique et publication restent à traiter.

## J-114 — 23 novembre 2026 — Relecture S5 pages 1 à 10 (lot 3)

- Demandes utilisateur : limiter l'image p01, gras ciblés p02/p03/p04/p07/p08 et DPCA p10 ; encadrés Important sous image/texte p05 et p06 ; légendes en fenêtres sans repères sous l'image p09.
- `api/content/S5.json` : limite de hauteur p01 à 380 px et hauteur disponible via l'option existante ; phrases introductives p05 et p06 déplacées dans un encadré final en conservant le gras sélectif ; p09 utilise les fenêtres communes et des étiquettes numériques. Autres textes conservés, pages 11 et suivantes comparées et inchangées. Aucun changement de composant partagé.
- Vérifications : 7 tests PHP de contenu réussis (27 assertions). Chrome avec API simulée contrôle les dix pages aux quatre formats tablette : image p01 sous la navigation, gras demandés présents, encadrés p05/p06 après l'ensemble image/texte et trois fenêtres p09 sans « Repère ». Les limites des images existantes des autres pages ne font pas l'objet de changements hors demande. Mise à jour locale `diaverum` transactionnelle : dix pages, gardes sur les anciens contenus satisfaites. Diff sans erreur. Aucun commit ni déploiement ; recette sur tablette physique restante.
- Suite : poursuivre la relecture du cours 5 à partir de p11.

## J-115 — 23 novembre 2026 — Retrait S5 pages 19, 23 et 24 (lot 3)

- Demande utilisateur : supprimer les pages 19, 23 et 24 selon la numérotation à 24 pages. Retrait de s5-p19, s5-p23 et s5-p24 dans `api/content/S5.json` ; les trois exercices conservés s5-p20 à s5-p22 deviennent 1/3 à 3/3. S5 compte désormais 21 pages. Les 18 premières pages sont comparées et inchangées, aucun rendu partagé modifié.
- Vérifications : 21 pages et absence des trois identifiants contrôlées ; 7 tests PHP réussis (27 assertions), diff sans erreur. Modification locale `diaverum` avec gardes sur les pages retirées et conservation des autres pages en base : une ligne, 21 pages confirmées. Pas de recette navigateur rejouée pour ce retrait de contenu. Aucun commit ni déploiement. Suite : poursuivre la relecture S5.

## J-116 — 23 novembre 2026 — Validation éditoriale du cours S5 (lot 3)

- Décision utilisateur explicite : « cours 5 validé ». Validation éditoriale des 21 pages actuelles, après les corrections J-114 et suppressions J-115. Contenu dans `api/content/S5.json`, médias dans `front/public/courses/S5/`, corrections chargées dans la base locale.
- Vérifications de cette intervention : branche et état du dépôt contrôlés, 21 pages confirmées, modifications existantes préservées, diff sans erreur. Aucune modification fonctionnelle, aucun commit ni déploiement. Les résultats de recette simulée figurent dans J-114/J-115 ; tablette physique et publication restent à traiter. Aucun critère global du lot 3 coché sur cette seule validation éditoriale.
- Suite : les cours S1 à S5 ont reçu une validation éditoriale utilisateur ; poursuivre selon la prochaine demande et préparer la recette finale avant publication.

## J-117 — 23 novembre 2026 — Intégration S6 et S7 depuis la matrice (lot 3)

- Demande : intégrer les cours 6 et 7 avec `Diaverum_EHD_test-matrice.xlsx` fourni sous Desktop/edi, graphismes et storyboards de `doc/integration/`. Matrice réservée explicitement à S6/S7, sans extrapolation aux autres cours. Le lien Google initial ne permettait pas un export anonyme (401) ; l'export utilisateur remplace cette tentative. Aucun fichier distant modifié.
- Inventaire local : S6 vide, S7 contient quatre pages de démonstration. Sauvegardes complètes dans `/tmp/diaverum-before-J117-S6.json` et `...S7.json` avant import. Titres, descriptions, durées et statut du catalogue conservés.
- Extraction XML de l'Excel conservant les segments gras et couleurs de correction. Pages barrées écartées : S6 SB18/SB22 et S7 SB17/SB18. Les trois questions finales de chaque cours sont renumérotées 1/3 à 3/3 ; identifiants des pages source conservés. Les questions orales Oui/Non restent non notées, leur appréciation relevant de l'IDE ; les quiz formatifs ne révèlent pas de correction conformément à la consigne utilisateur générale déjà validée, même si la colonne I propose OUI. Réponses sommatives dérivées des couleurs vertes de la matrice.
- Ajout de `api/content/S6.json`, `S7.json` et graphismes dans `front/public/courses/S6/`, `S7/`. Options et composants existants réutilisés, aucune modification des cours validés ni du rendu commun.
- Ajustements pendant recette : les titres de cellules entièrement gras sont lus en texte simple pour éviter l'affichage littéral de `**` dans le bandeau ; gras de corps conservés. Des repères de compression trop proches interceptaient les clics à la première passe : espacement corrigé uniquement dans S7. Une sélection de dossier par suffixe ambigu avait copié des médias S16/S17 : ces seules copies créées pendant l'intervention ont été retirées puis les dossiers exacts S6/S7 sélectionnés, références vérifiées. Les compétences en cellules grasses, d'abord non détectées, ont été réextraites en texte simple : trois par cours.
- P09 S7 conserve une grille de sept pictos avec textes, conformément à la matrice et au storyboard ; essai carrousel abandonné car il ajoutait une interaction absente de cette page. La formulation « éviter les sports » est mise sous forme d'action « pratiquer des sports… » dans la liste « je ne dois pas » afin de supprimer une double négation, sans changement de consigne médicale.
- Vérifications finales : build TypeScript/Vite réussi (avertissements connus polices Euclid non fournies et taille de bundle), 9 tests PHP de contenu / 35 assertions réussis. Contrôle du calcul serveur : S6 évalue trois questions, huit réponses attendues au total ; S7 évalue deux questions, deux réponses attendues, la troisième question finale étant orale et non notée. Les questions formatives et orales sont exclues du score.
- Chrome avec API simulée : 38 écrans sur quatre formats tablette (152 rendus), médias décodés dont les GIF, 24 cartes retournées, deux images du carrousel S6 parcourues et 15 légendes S7 ouvertes/fermées sans titre « Repère ». P09 S7 revue et rejouée aux quatre tailles après remplacement de l'essai carrousel par la grille conforme. Aucun débordement horizontal ; plusieurs pages denses défilent verticalement (jusqu'à 179 px hors grille p09 S7 ; cette grille nécessite jusqu'à 541 px à 1024×768). Typographie conservée, aucun correctif global pour comprimer les pages. Captures représentatives inspectées. Les 16 quiz sont également soumis dans Chrome : navigation déverrouillée et absence d'icônes de correction sur les questions non notées.
- Import limité à S6/S7 dans la base Docker locale `diaverum`, puis export final identique aux fichiers JSON. Aucun rechargement de fixtures, aucune écriture dans les dossiers patients par la recette simulée. Médias référencés présents, diff sans erreur. Aucun commit ni déploiement distant.
- Suite : relecture éditoriale utilisateur de S6 et S7, notamment disposition des pages denses et appréciation orale de S7 SB16. Recette sur tablette physique et publication restent à traiter. La matrice du 23 novembre fournie ne sert qu'à S6/S7 ; ne pas l'appliquer aux cours suivants.

## J-118 — 23 novembre 2026 — Intégration des séances S8 à S16 (lot 3)

- Demande utilisateur : intégrer uniquement les neuf séances 8 à 16 depuis les notes textuelles `Notes RDV conception ped. Diaverum EHD.docx` sous Desktop/edi, les graphismes et les storyboards dans `doc/integration/`. La matrice précédente reste réservée aux séances 6 et 7.
- Sources lues en conservant les gras, couleurs de réponses et passages barrés. Remarques de réalisation et consignes destinées aux développeurs séparées des textes apprenants. Les séances optionnelles, autres séances et post-test contenus dans le même document sont hors périmètre.
- Inventaire : neuf contenus locaux vides, exportés et sauvegardés dans `/tmp/diaverum-before-J118-S8.json` à `...S16.json` avant toute importation. Le dossier graphismes de S8 est absent ; question adressée à l'utilisateur, poursuite autonome des autres contenus et inventaire des réemplois possibles selon le storyboard.
- Mise à jour utilisateur : le dossier des graphismes S8 a été ajouté pendant l'intervention. Il est désormais présent et utilisé ; le besoin de réemploi provisoire est levé, sans recours à une génération d'illustrations.
- Production initiale : S8 21 écrans, S9 17, S10 14, S11 19, S12 14, S13 14, S14 18, S15 10, S16 18 (145 au total). Textes, encadrés, compétences et corrections des quiz issus des notes ; positions et choix des visuels rapprochés des storyboards. Titres et métadonnées du catalogue conservés. Les doublons de numérotation des notes sont normalisés sans supprimer d'activité distincte. Les questions finales orales ou de recueil de traitement personnel restent non notées, appréciées par l'IDE.
- Ajout de `api/content/S8.json` à `S16.json` et médias sous `front/public/courses/S8/` à `S16/`. Réutilisation du gabarit commun. Seule extension de rendu : image facultative sur le recto d'une carte (`frontImageUrl` dans types/index.ts et InteractiveBlocks.tsx), activée uniquement pour les quatre pictos blancs fournis en S11 p06. Les cartes existantes sans cette propriété conservent leur rendu.
- Ajustements de recette : paragraphes et listes resserrés sans changement de police ; limites de largeur calculées selon le ratio des illustrations pour conserver des coins visibles arrondis ; hauteur d'image réduite sur les pages à deux encadrés. Retrait des annotations « => IMG », « => QCM » et « Picto… » des textes apprenants. Préambules séparés des légendes S8 p09 et S15 p03 ; ordre des cinq symptômes S9 p11 repris d'après leurs numéros source.
- Extension facultative supplémentaire : pictos dans une liste à droite d'une image (`imageUrl` par entrée de liste dans types/index.ts et TrainingSessionPage.tsx), utilisée uniquement pour les deux pictos S8 p03. La branche de rendu des listes sans image reste inchangée. Le validateur exige un contenu texte non vide même lorsque la liste sert au rendu ; le texte source est donc conservé dans `content` et dans les deux entrées structurées, sans double affichage.
- Essais à conserver au diagnostic : une reconstruction du front pendant la première passe navigateur a invalidé un nom de chunk en cache (404) et interrompu la passe au début de S13 ; recette relancée sur un build stabilisé. Première validation après ajout des pictos S8 p03 refusée pour `content` vide ; texte source restauré, sans changement visuel.
- Vérifications finales : build TypeScript/Vite réussi ; 18 tests PHP de contenu / 71 assertions réussis. Neuf imports limités à S8–S16 dans la base Docker locale `diaverum`, exports finaux identiques aux neuf JSON. Aucun rechargement de fixtures ni changement de séance patient.
- Recette Chrome avec API simulée : 145 écrans sur quatre tailles tablette (580 rendus), aucune largeur débordante ; 66 cartes, 78 images de carrousels et 53 légendes exercées. Médias référencés vérifiés présents et images décodées ; captures représentatives inspectées. Certaines pages denses nécessitent un défilement vertical, jusqu’à 498 px dans les formats testés ; taille de texte commune conservée. La vidéo S11 p12 est intégrée avec son lecteur et sa transcription ; lecture audiovisuelle complète non certifiée. 42 QCU/QCM soumis dans Chrome, navigation déverrouillée et absence de correction visuelle sur les questions non notées. L’association par glisser-déposer S11 et les deux classements S8 sont validés structurellement mais leurs gestes complets ne sont pas recettés dans cette passe.
- Points éditoriaux à relire : S12 question finale sur les chélateurs du phosphore reprend la correction verte « strictement au milieu du repas », tandis que l'écran explicatif dit « pendant le repas ou juste avant selon prescription » ; divergence de la source conservée et signalée, à arbitrer par le référent pédagogique. Les questions orales S13/S15 et le recueil des traitements personnels S12 restent non notés malgré leur présence au quiz final. Aucun contenu médical nouveau ajouté.
- Diff sans erreur. Aucun commit ni déploiement distant. Suite : relecture utilisateur des séances 8 à 16, arbitrage des points éditoriaux, puis recette sur tablette physique avant publication. Les séances 1 à 7 ne sont pas retouchées par cette intégration ; seules options facultatives du gabarit ajoutées pour S8/S11.

## J-119 — 23 novembre 2026 — S6 image en haut p01 et gras p03/p13 (lot 3)

- Demande utilisateur : image au-dessus du texte et toute largeur p01 ; deux phrases citées en gras. Le texte « Il existe principalement… » identifie sans ambiguïté s6-p03 (carrousel, écran 3 actuel), malgré la mention page 2. Aucun changement à la question orale s6-p02.
- S6.json active `imagePosition: top` uniquement sur p01 et les gras sur p03/p13. Option facultative dans types/index.ts et TrainingSessionPage.tsx, absente des autres pages : image sur toute la largeur disponible et texte en dessous, typographie conservée. Autres pages S6 comparées et inchangées.
- Vérifications : build TypeScript/Vite réussi ; Chrome aux quatre formats tablette confirme l'image p01 de même largeur que le conteneur, texte entièrement en dessous et gras des deux phrases. Cartes p13 et carrousel p03 exercés. Base locale `diaverum` mise à jour par trois mutations ciblées avec gardes sur les pages d'origine, toutes confirmées. Diff sans erreur. Aucun commit ni déploiement. Suite : poursuivre la relecture S6.

## J-120 — 23 novembre 2026 — Gras limité à « ligne de vie », S7 p01 (lot 3)

- Demande utilisateur : seul « ligne de vie » doit être en gras, le reste du texte normal sur la page 1 du cours 7. `api/content/S7.json` retire les marqueurs de gras du corps et en conserve une paire autour de cette expression. Texte, image, encadré et disposition conservés ; autres pages comparées et inchangées.
- Vérifications : exactement une expression en gras dans le corps, conservation des autres blocs/pages et diff sans erreur. Mise à jour d'un seul champ en base locale `diaverum`, garde sur l'ancien texte satisfaite : une ligne modifiée. Pas de nouvelle recette navigateur pour ce changement de balisage ; aucun changement du composant commun, commit ou déploiement. Suite : poursuivre la relecture S7.

## J-121 — 23 novembre 2026 — Validation éditoriale des cours S6 et S7 (lot 3)

- Décision explicite de l'utilisateur : « cours 6 et 7 validé ». Validation éditoriale des versions actuelles : S6 20 pages après J-119, S7 18 pages après J-120. Contenus et médias intégrés, corrections chargées localement lors des interventions correspondantes.
- Vérifications de cette intervention : branche et état du dépôt contrôlés, nombres de pages confirmés, modifications existantes préservées, diff sans erreur. Aucun changement fonctionnel, commit ou déploiement. Les limites de recette sont conservées dans J-117/J-119/J-120 ; validation éditoriale distincte de la recette sur tablette physique et de la publication. Aucun critère global du lot 3 coché.
- Suite : les cours S1 à S7 sont validés éditorialement par l'utilisateur. Reprendre la relecture S8 à S16 selon la prochaine demande ; ces derniers restent à valider.

## J-122 — 23 novembre 2026 — Consigne secondaire retirée S8 p02 (lot 3)

- Demande : enlever « Faites glisser chaque élément dans la bonne zone » uniquement sur S8 p02. Ajout d'une option facultative `hideInstruction` au classement (types/index.ts, InteractiveBlocks.tsx), activée uniquement sur `s8-p02-b1` dans S8.json. La consigne de page et le texte explicatif sont conservés. Autres classements inchangés par défaut.
- Le bandeau secondaire complet est masqué, icône comprise, afin de ne pas laisser un encadré vide. Build TypeScript/Vite et diff réussis ; option ciblée chargée dans la base locale `diaverum` (une ligne). Pas de recette navigateur rejouée, aucun commit ni déploiement. Suite : poursuivre S8.

## J-123 — 23 novembre 2026 — S8 pages 5 à 8 (lot 3)

- Demandes : question p05 en gras avec davantage d'espace avant les pictos, introduction p06 en gras, dernier picto p07 centré sous la crème, image p08 au-dessus du texte. S8.json modifié uniquement sur ces quatre pages ; autres pages comparées et conservées.
- Options facultatives `questionGap: large` (espacement adaptatif) et `centerLastItem` (colonne centrale) ajoutées dans types/index.ts et PictoGridView.tsx, activées uniquement sur p05/p07. P08 réutilise `imagePosition: top` et retire la limite de largeur pour occuper la largeur disponible ; hauteur limitée conservée. Aucun changement typographique partagé.
- Recette : premier centrage refusé en portrait car la grille commune y change ses colonnes ; variante CSS ciblée `course-picto-center-last` ajoutée dans index.css pour conserver trois colonnes et positionner le quatrième ensemble sous le deuxième. Les essais intermédiaires à trois colonnes directes ne respectaient pas les spans de la grille commune à six pistes ; corrigés sans modifier ses règles par défaut.
- Vérifications finales : build TypeScript/Vite et diff réussis. Chrome aux quatre formats tablette confirme les gras, l'espace avant les pictos, le dernier ensemble sur le même axe que la crème et plus bas, puis le texte sous l'image p08. Carrousel parcouru. Quatre pages chargées en base locale, gardes sur les anciennes pages satisfaites. Aucun commit ni déploiement ; recette physique restante. Suite : poursuivre S8.

## J-124 — 23 novembre 2026 — Coins arrondis S8 p08 et règle durable (lot 3)

- Demande : arrondir l'image de p08 et noter que les images doivent toujours avoir des bords arrondis. Convention ajoutée dans AGENTS.md pour les interventions suivantes sans retouche globale des pages validées.
- L'image contenue était plus étroite que son élément à cause de la limite de hauteur : le rayon arrondissait les marges internes. Option facultative `imageAspectRatio` dans types/index.ts et TrainingSessionPage.tsx ajuste la largeur au ratio réel et à la hauteur disponible, activée uniquement sur S8 p08 dans S8.json. Le rayon existant s'applique ainsi aux coins réels du visuel.
- Vérifications : build TypeScript/Vite et diff réussis ; Chrome aux quatre formats tablette confirme un élément image au ratio du fichier sans marge interne, rayon positif et texte en dessous. Base locale mise à jour sur le seul champ de p08, une ligne confirmée. Aucun commit ni déploiement. Suite : poursuivre S8 avec cette convention.

## J-125 — 23 novembre 2026 — S8 pages 10 à 16, centrage et colonnes (lot 3)

- Demande : centrer verticalement le contenu p10/p13/p15/p16 ; colonnes image/texte égales p11/p12 ; quatre symptômes en véritables li avec tirets p12. Modifications limitées aux six pages citées dans S8.json, autres pages comparées et conservées.
- Option de page `layout: center` dans types/index.ts, courseVisuals.ts et TrainingSessionPage.tsx, activée uniquement sur ces quatre pages ; centrage de l'ensemble des blocs dans la zone disponible. P11/p12 retirent les limites de largeur/hauteur qui empêchaient le 50/50 et conservent l'image à son ratio naturel avec coins arrondis. Options de liste `listIntro` et `listMarker: dash` activées seulement p12, retrait de 10 px et typographie commune conservés.
- Vérifications : build TypeScript/Vite et diff réussis ; Chrome aux quatre formats tablette confirme centrages lorsque le contenu tient, colonnes égales après gouttière et quatre li p12. Six mutations ciblées en base locale `diaverum` avec gardes sur les pages d'origine, toutes confirmées. Les contenus dépassant la zone disponible restent défilants. Aucun commit ni déploiement ; recette physique restante. Suite : poursuivre S8.

## J-126 — 23 novembre 2026 — Consigne secondaire retirée S8 p21 (lot 3)

- Demande utilisateur : supprimer « Faites glisser chaque élément dans la bonne zone » sur p21 du cours 8. `api/content/S8.json` active l'option existante `hideInstruction` uniquement sur le bloc de classement de cette page. Consigne de page, question, catégories et réponses conservées ; autres pages comparées et inchangées. Aucun changement du gabarit commun.
- Vérifications : type du bloc et préservation des autres pages contrôlés, diff sans erreur. Un seul champ mis à jour en base locale `diaverum`, une ligne confirmée. Option de rendu existante réutilisée, sans nouveau build ni recette navigateur. Aucun commit ni déploiement. Suite : poursuivre la relecture S8.

## J-127 — 23 novembre 2026 — Validation éditoriale du cours S8 (lot 3)

- Décision explicite utilisateur : « cours 8 validé ». Validation éditoriale des 21 pages actuelles après les corrections J-122 à J-126. Contenu S8.json et médias intégrés, corrections chargées localement lors des interventions correspondantes.
- Vérifications de cette intervention : branche et état du dépôt contrôlés, 21 pages confirmées, modifications existantes préservées et diff sans erreur. Aucun changement fonctionnel, commit ou déploiement. Les limites de recette physique et des gestes de classement restent celles des entrées précédentes. Aucun critère global du lot 3 coché sur la seule validation éditoriale.
- Suite : S1 à S8 sont validés éditorialement ; reprendre la relecture S9 selon la prochaine demande. S9 à S16 sont intégrés et restent à valider.

## J-128 — 23 novembre 2026 — S9 pages 1 et 9, liste et colonnes (lot 3)

- Demande : quatre fonctions de l'eau en li à puces carrées p01 ; une colonne image et une colonne texte p09. S9.json réutilise la liste structurée standard p01, avec introduction et retrait de 10 px. P09 passe des légendes en fenêtres au bloc image/texte 50/50 : les quatre explications sont visibles à droite de l'image, encadré Important conservé dessous. Consigne de clic retirée puisqu'il n'y a plus de repère. Aucun texte supprimé ni composant commun modifié ; autres pages comparées et conservées.
- Vérifications : Chrome aux quatre formats tablette confirme les quatre li à symbole carré p01 et la largeur 50/50 après gouttière p09 ; médias décodés. Deux pages chargées en base locale `diaverum` avec gardes satisfaites. Diff sans erreur, aucun commit ni déploiement. Suite : poursuivre S9.

## J-129 — 23 novembre 2026 — S10 pages 1 et 2, tirets et pictos (lot 3)

- Le texte cité identifie S10 p01 malgré la formulation « page 10 » ; p02 S10 possède la planche fournie `p2-pictos.png`. Deux pressions en li à tirets p01 via options existantes. Planche à quatre lignes et deux états activée p02, taille 64 px, consigne adaptée au clic sur pictogramme. S10.json seul modifié, autres pages comparées et conservées ; aucune retouche S9 ni composant commun.
- Vérifications : Chrome aux quatre formats tablette confirme deux li à tirets p01, quatre marqueurs issus de la planche de pictos p02 ; quatre fenêtres ouvertes et fermées. Deux mutations ciblées en base locale `diaverum`, gardes satisfaites. Diff sans erreur. Aucun commit ni déploiement. Suite : poursuivre la relecture selon la prochaine demande.

## J-130 — 23 novembre 2026 — Picto Alerte commun (lot 3)

- Demande explicite de généralisation : utiliser le picto fourni `doc/integration/GRAPHISMES/Séance3/icon alerte.png` pour les encadrés Alerte. Remplacement de `front/public/pictos/warning.png`, ressource commune aux cours et aperçus. Ancienne image sauvegardée dans `/tmp/diaverum-warning-before-J130.png`. Aucun changement de taille, de texte, de disposition ni des autres catégories d'encadré.
- Vérifications : correspondance binaire avec le fichier source confirmée, build TypeScript/Vite réussi et diff sans erreur. Le composant commun continue d'utiliser le même chemin d'icône. Pas de recette navigateur rejouée pour ce remplacement d'asset ; aucun changement de base, commit ni déploiement. Suite : poursuivre la relecture des cours.

## J-131 — 23 novembre 2026 — S11 pages 1, 2, 5, 6, 7 et 9 (lot 3)

- Demande : listes à tirets p01 (cinq éléments) et p05 (trois), contenu p02 centré verticalement, images des cartes p06 agrandies, dernier ensemble p07/p09 centré sous le deuxième. S11.json active les options existantes de liste, centrage vertical et centrage du dernier picto. Autres pages comparées et conservées.
- Images des cartes portées de 80 à 120 px via propriété facultative `frontImageSize` dans types/index.ts et InteractiveBlocks.tsx, activée sur les quatre cartes S11 p06 uniquement. Les autres cartes restent à leur taille existante ; textes et typographie conservés.
- Vérifications : build TypeScript/Vite et diff réussis ; Chrome aux quatre formats tablette confirme cinq/trois li à tirets, centrage p02, quatre images de cartes de 120 px et derniers ensembles p07/p09 alignés sous la deuxième colonne. Quatre cartes retournées. Premier essai interrompu par sélecteur de test ambigu (conteneur et indication de glissement) ; sélecteur précisé sans modification du produit. Six pages chargées en base locale avec gardes satisfaites. Aucun commit ni déploiement ; recette physique restante. Suite : poursuivre S11.

## J-132 — 23 novembre 2026 — S12 pages 1 et 2, ordre et gras (lot 3)

- Le texte cité identifie S12 p01 malgré la mention « page 11 ». Introduction conservée au-dessus du carrousel avec séparation de paragraphes ; phrase « Le traitement est adapté à chaque patient. » déplacée dans un bloc texte après le carrousel. Typographie standard réutilisée.
- P02 : six textes de cartes rapprochés des segments gras des notes Word, rétablis dans S12.json. Option `formattedBack` dans types/index.ts et InteractiveBlocks.tsx active CourseText sur ces seuls versos pour afficher les gras, sans changer les cartes des autres pages. Autres pages S12 comparées et conservées.
- Vérifications : build TypeScript/Vite réussi ; Chrome aux quatre formats tablette confirme introduction au-dessus et conclusion sous l'image/carrousel, cinq images parcourues et gras présents dans les six versos retournés. Un essai a échoué sur une assertion de test héritée d'une page image/texte, retirée sans modification du produit. Deux pages chargées localement avec gardes satisfaites, diff sans erreur. Aucun commit ni déploiement. Suite : poursuivre S12.

## J-133 — 23 novembre 2026 — S13 pages 7 et 8, centrage (lot 3)

- Demande : centrer les pictos verticalement p07 ; centrer « Légère fièvre » sous « Rougeur » p08. S13.json active les options existantes `layout: center` et `centerLastItem` sur les seules pages demandées. Textes, images et typographie conservés, autres pages comparées et inchangées. Aucun composant commun modifié.
- Vérifications : Chrome aux quatre formats tablette confirme le centrage vertical p07 et le dernier ensemble p08 sur le même axe que « Rougeur », plus bas. Deux mutations ciblées en base locale avec gardes satisfaites ; diff sans erreur. Pas de nouveau build nécessaire (options existantes), aucun commit ni déploiement. Suite : poursuivre S13.

## J-134 — 23 novembre 2026 — Validation jusqu'à S16 et commit (lot 3)

- Décision utilisateur explicite : « valide jusqu'au cours 16 », puis demande « commit ». S9 à S16 rejoignent les cours déjà validés ; S1 à S16 sont validés éditorialement. La recette physique et la publication restent distinctes, aucun critère global du lot 3 coché sur cette validation.
- Préparation du commit : intégrations S3 à S16 encore non versionnées, médias de lecture, corrections du gabarit et suivi projet regroupés. Sources de conception volumineuses, fichiers temporaires et configuration locale hors périmètre conservés non suivis.
- Rapprochement avec les exports locaux avant commit : reprise des retouches existantes de l'éditeur sur S4 (positions des repères p01/p06 et catégorie Définition p06), S5 (repères p09), S7 (repères p06/p07/p10), S8 (question p02 sans titre répété et gras), S14 (positions K/t/V p03). Ces données proviennent des versions locales relues ; aucun nouvel import ni changement de base effectué ici. Résout notamment la divergence S4 signalée en J-109. Fichiers JSON désormais concordants avec la base locale pour S3–S16.
- Vérifications : build TypeScript/Vite réussi (avertissements connus polices et bundle), 18 tests PHP de contenu / 71 assertions réussis ; 231 pages S3–S16 et 278 références médias contrôlées présentes. Les tests navigateur des modifications figurent dans les entrées précédentes ; aucune nouvelle recette physique ni audiovisuelle complète. Point de formulation S12 signalé en J-118 conservé dans l'historique malgré la validation éditoriale générale ; aucune réécriture médicale.
- Contrôle final après rapprochement : 18 tests PHP / 71 assertions réussis à nouveau ; index préparé limité à 306 fichiers liés aux cours, au gabarit et au suivi, diff indexé sans erreur. Commit local demandé réalisé avec le titre « Intègre et valide les cours 3 à 16 ». Aucun push ni déploiement ; sources et configuration locales hors périmètre conservées.
