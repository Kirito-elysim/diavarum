# Reprise par Claude

Lire et appliquer `AGENTS.md`, puis lire `HANDOFF.md`, `KPI_REGLES.md` et le lot 1 de `ROADMAP_PRODUCTION.md`. `JOURNAL_PROJET.md` conserve les décisions et vérifications. Le dépôt contient de nombreux changements locaux et fichiers non suivis : les préserver, ne pas réinitialiser le travail existant.

## Sujet à reprendre

L’utilisateur confie à Claude la suite du lot 1, bilans et exports. Il a explicitement demandé un point fonctionnel **avant modification**. Les propositions présentées en J-009 ne sont pas encore validées : commencer par les arbitrer avec lui, puis implémenter celles acceptées.

Déjà validé et implémenté : KPI des écrans sur les patients non archivés ; archives séparées et restaurables ; inactivité après 15 jours sans lancement ni validation ; une seule validation définitive par cours et parcours, reprise possible seulement si non validé. La consultation ne constitue pas une activité. Depuis J-037, l'ancien onglet Parcours est supprimé et Parcours bis, renommé Parcours, est le seul parcours (onglets : Éligibilité, Parcours, Séances, Compétences). Conserver le verrouillage des cours validés et les logos officiels intégrés.

## Cinq arbitrages encore ouverts

1. Contenu du bilan patient : proposition identité/centre/éligibilité/statut/progression, détails par chapitre et cours (score, durée, date, soignant, compétences), résultat du post-test séparé ; jamais démarré = identité, éligibilité et statut uniquement.
2. Moyennes : proposition moyenne simple des cours validés notés, chaque cours de même poids, notes absentes exclues et vrais zéros inclus ; post-test séparé. Définir explicitement score de chapitre et de parcours.
3. Durées et période : proposition somme des séances validées pour le patient ; moyenne des parcours achevés dans la période pour la synthèse ; effectifs et statuts à date. Préciser la portée temporelle du score moyen des parcours.
4. Anciennes validations répétées : proposition dernière validation par cours/parcours pour les calculs, historique conservé. Aucun nettoyage/fusion réalisé.
5. PDF lisible et partageable / Excel détaillé : proposition, avec mêmes données que les écrans à filtres et droits égaux. Définir les feuilles/colonnes et le périmètre d’export des archives explicitement, sans les réintégrer aux KPI actifs.

## Points techniques

- `api/src/Reporting/PatientReportBuilder.php`, `StatisticsBuilder.php`, `SpreadsheetWriter.php`, `PdfWriter.php`, `Labels.php`, `api/templates/reports/` et `api/src/Controller/ReportingController.php`.
- Statut de suivi `activityStatus` séparé du cycle de vie `status`. `StatisticsBuilder::build(..., screen: true)` sert aux écrans ; les exports restent sur le mode historique. L’écart est volontaire et temporaire en attente de revue, pas une conformité acquise.
- L’activité IDE et certains compteurs interrogent les séances, tandis que d’autres agrégats utilisent le suivi par module. Rapprocher les doublons historiques après arbitrage.
- Migration `Version20261112120000` appliquée uniquement en local et test. Aucun déploiement distant.
- Dernière suite complète : 170 tests API / 961 assertions ; test ciblé supplémentaire de tri réussi. Build et lint (six avertissements préexistants) réussis. Recettes navigateur résultats et Parcours bis réussies. Ce sont des résultats historiques à revalider selon les modifications.
- `make test` utilise la base de test. `make fixtures` et `make e2e` rechargent les données : ne pas les lancer sur une base à préserver. `e2e/lot1-kpi.mjs` attend des identifiants par variables d’environnement, sans les enregistrer.

Consigner chaque intervention et décision dans le journal, actualiser le handoff, et ne pas marquer le lot 1 terminé avant rapprochement vérifié des écrans et exports.
