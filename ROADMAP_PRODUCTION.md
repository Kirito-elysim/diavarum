# Feuille de route Diaverum

Objectif : livrer un catalogue exploitable sur tablette, des KPI cohérents entre écrans et exports, et un environnement de production conforme au cahier des charges final. Les rôles ci-dessous sont proposés et les dates dépendent de la disponibilité des contenus et de l’environnement cible.

## Lot 0 — Décisions fonctionnelles

| Tâche | Responsable proposé | Livrable attendu |
|---|---|---|
| Figer les définitions KPI (§7) | Diaverum + développement | Dictionnaire des KPI avec source, dénominateur, règle de période et exemples chiffrés. Appliquer la validation unique décidée en J-004 et définir le traitement des données historiques. |
| Préciser le statut après 15 jours (§2.3) | Diaverum | Définir l’événement qui compte comme activité, la date de référence et la distinction entre parcours jamais commencé et parcours devenu inactif. |
| Arbitrer la limite de compétences (§4.6) | Diaverum + pédagogie | **Décidé : six (J-028).** Les contenus existants sont compatibles (maximum de six compétences actives constaté). À faire confirmer par Diaverum : le PDF du cahier des charges mentionne cinq. |
| Valider la suppression définitive (§3.4) | Diaverum + DPO | Définir les données et relations à effacer, la trace d’audit à conserver et le traitement des sauvegardes. |
| Confirmer le périmètre de lancement | Diaverum + pédagogie | Liste des cours ouvrables, questionnaire final, post-test, polices et maquettes de référence. |

## Lot 1 — KPI, bilans et exports

- [x] J-008 : KPI des écrans exclusivement sur les patients non archivés ; pourcentages d’éligibilité sur cette population. Archivés accessibles séparément dans les archives (soft delete), exclus aussi des activités IDE et du tableau de bord.
- [ ] Revoir les bilans/exports avec l’utilisateur avant de les modifier ; comparer ensuite les périmètres et chiffres. L’ancienne demande de proportion des archivés au sein des KPI est remplacée par la décision J-008.
- [x] J-008 : implémenter les 15 jours d’inactivité. Vérifier la frontière à 14 et 15 jours, la reprise d’activité et la conservation des statuts achevé et interrompu.
- [ ] Rapprocher les totaux IDE, centre et national avec la validation unique décidée en J-004. Définir le traitement des anciennes répétitions et des séances interrompues.
- [ ] Ajouter le score moyen par chapitre dans le bilan patient. Définir la pondération, le traitement des cours sans note et la place du post-test.
- [x] J-023 : durée moyenne des programmes (achevés dans la période) et score moyen des parcours (avec une séance validée dans la période, post-test exclu) appliqués aux statistiques ; périodes sans activité et bornes de dates testées. Écrans et exports encore à rapprocher.
- [ ] Mettre le bilan patient au format attendu par statut. Pour un parcours jamais commencé, afficher son statut uniquement. Pour un parcours commencé, vérifier progression, dates et heures, score, durée et compétences. Pour un parcours achevé, vérifier le score global et la durée totale.
- [ ] Recetter les exports Excel et PDF avec les mêmes filtres et chiffres que les écrans. Vérifier les droits IDE, cadre et administrateur, y compris les refus hors centre. (J-025 : calcul unique, Excel comparé à l'écran par un test ; droits par rôle recettés en J-027 ; reste le rapprochement des chiffres du PDF et sa revue visuelle.)

## Lot 2 — Parcours patient et règles métier

- [ ] Intégrer le questionnaire médical et administratif validé. Vérifier que les réponses restent visibles pendant la sélection des cours et que les dossiers existants restent lisibles.
- [ ] Ajouter la suppression définitive selon l’arbitrage du lot 0, avec droits par centre, confirmation prévue au §3.4, contrôle des dépendances et exclusion des statistiques. Recetter séparément l’archivage et la restauration.
- [x] J-029 : limite de six compétences alignée (constante unique côté API, constante unique dans l'éditeur, import, création directe, validation IDE) ; tests aux limites (6 acceptées, 7 refusées) ; cours existants compatibles (maximum de six actives en base locale).
- [ ] Vérifier les parcours de bout en bout : CODEX, décision d’éligibilité, sélection et confirmation sans cours optionnel, interruption, rappel à partir de trois cours inachevés, reprise depuis le début, validation IDE et clôture par le cadre. (J-031 : rejoué par un test d'API complet et des scripts navigateur à écritures simulées, tous réussis ; reste le scénario réel `make e2e`, non lancé car destructif pour la base locale, et le seuil du rappel : le code rappelle dès un cours inachevé.)
- [x] J-030 : ratio de progression = séances validées parmi les séances sélectionnées / séances sélectionnées, sur tous les écrans (fiche, Parcours bis, liste des parcours, bilans) ; une séance validée puis désélectionnée reste dans les moyennes, durées et le bilan mais plus dans le ratio. Test API ajouté.
- [ ] Vérifier sur tablette le chronomètre, la pause, la sortie protégée par code, les exercices formatifs signalés comme non notés et l’absence de résultats pour une séance interrompue ou un aperçu. (J-030 : chronomètre, pause, reprise, sortie par le code, durée envoyée et relance à zéro recettés par `e2e/stopwatch.mjs` sur navigateur tactile émulé ; reste la recette sur la tablette physique, les exercices non notés et l'aperçu.)

## Lot 3 — Contenus et template

- [ ] Inventorier les cours par code et statut : à fournir, à intégrer, à relire, validé, publié. Utiliser les storyboards approuvés et S99 comme référence de composition.
- [ ] Récupérer les fichiers Euclid Circular A sous licence et vérifier leur chargement dans le lecteur, l’aperçu apprenant et l’aperçu tablette.
- [ ] Intégrer les cours, médias, questions et compétences via l’éditeur ou l’API dédiée. Identifier les entrées vides et décider comment signaler leur indisponibilité dans les parcours.
- [ ] Intégrer et relire les 10 à 20 QCU/QCM du post-test. Vérifier son accès après validation des cours sélectionnés, son score et l’absence de chronomètre.
- [ ] Recetter chaque cours livré sur une Galaxy Tab A11+ en portrait et paysage : titre, consigne, progression, lisibilité, médias, gestes, réponses, correction et validation IDE. Relever toute différence entre aperçu et séance réelle.
- [ ] Publier les cours après validation éditoriale et fonctionnelle. Vérifier leur visibilité dans les parcours nouveaux et existants.

## Lot 4 — Environnement et préparation de la mise en ligne

- [ ] Vérifier avec Diaverum l’environnement cible décrit au §9 : périmètre HDS, localisation, contrat, chiffrement, HTTPS, liste blanche IP et journalisation.
- [ ] Vérifier les sauvegardes quotidiennes et les rétentions du cahier des charges : 7 jours pour les snapshots et 30 jours pour le stockage objet. Tester une restauration de la base et des médias en recette.
- [ ] Configurer le SMTP et vérifier la notification du changement de code national, la première connexion et la gestion des codes IDE.
- [ ] Préparer le déploiement et le retour arrière : version Git, migrations, sauvegarde préalable, import des contenus approuvés et vérifications après démarrage.
- [ ] Mettre à jour le scénario historique de bout en bout et automatiser le build, les tests API, les vérifications du template et des médias dans la CI.

## Lot 5 — Recette client et ouverture

- [x] J-032 : base de recette fictive fournie (`make recette-base`, `RECETTE_BASE_FICTIVE.md`) : trois centres, tous les rôles, archivés, parcours non démarré, en cours, inactif, interrompu et achevé, séances étalées sur deux mois, ancienne validation répétée, cours sans note, post-test.
- [ ] Comparer les KPI et les exports à des résultats attendus calculés à l’avance. Recetter sur tablette les parcours soignant et patient, ainsi que les accès par rôle. (J-032 : KPI, résultats des IDE et exports Excel comparés à des valeurs calculées à la main par `RecetteDatasetTest` ; reste les PDF, la recette sur tablette et les accès par rôle dans l'interface.)
- [ ] Organiser la période de recette client d’au moins 15 jours prévue au cahier des charges. Suivre les anomalies, refaire les contrôles après correction et obtenir la validation des cours et de la plateforme.
- [ ] Après validation, déployer, vérifier l’accès par rôle et les KPI en production, puis contrôler les sauvegardes et l’envoi des notifications.

Le lot 1 a commencé en J-008 avec les règles validées d’archivage et d’inactivité. Les autres arbitrages et le point bilans/exports restent ouverts. Le lot 2 dépend de ses arbitrages. La préparation des contenus et de l’hébergement peut avancer en parallèle. La recette finale dépend de la livraison de tous les éléments retenus pour le lancement.

## Améliorations à planifier

- Versionner le contenu et les compétences au démarrage de la séance pour préserver la cohérence des séances en cours et de l’historique lors d’une modification.
- Corriger les réponses brutes côté serveur pour renforcer l’intégrité des scores.
- Tester les statistiques et les exports sur un volume représentatif du national et mesurer leurs temps de réponse.
