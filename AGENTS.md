# Instructions pour les agents — Diaverum

## À l'ouverture d'une tâche

1. Lire [HANDOFF.md](HANDOFF.md) pour connaître l'état courant et la prochaine action.
2. Lire le lot concerné dans [ROADMAP_PRODUCTION.md](ROADMAP_PRODUCTION.md) et consulter [AUDIT_PRODUCTION.md](AUDIT_PRODUCTION.md) pour les constats de départ. Pour un arbitrage fonctionnel, citer le paragraphe du cahier des charges final.
3. Vérifier la branche et `git status --short`. Préserver les modifications existantes, y compris les fichiers non suivis.

## Traçabilité obligatoire

Tenir à jour [JOURNAL_PROJET.md](JOURNAL_PROJET.md) à chaque intervention. Ouvrir une entrée datée avec la demande et le lot ou la tâche de référence. La compléter lors d'une décision, d'un blocage ou d'un changement de direction significatif, puis avant de rendre la main.

Pour chaque intervention, consigner le périmètre, les changements et leurs fichiers, les décisions avec leur motif et leur source, les vérifications réellement exécutées et leur résultat, les limites, le reste à faire et la prochaine action. Si une tâche est interrompue, noter l'état atteint et où reprendre. Les erreurs utiles au diagnostic et les essais abandonnés qui influencent la suite doivent rester visibles. Ne pas recopier les sorties brutes, secrets, identifiants d'accès ou données de patients.

Distinguer une décision validée par l'utilisateur ou le client, un choix technique réversible et une proposition en attente. Pour une décision qui en remplace une autre, ajouter une entrée liée à l'ancienne. Ne pas réécrire l'historique. Une décision client en attente reste ouverte jusqu'à validation explicite.

Actualiser le résumé de [HANDOFF.md](HANDOFF.md) à la fin de chaque intervention, y compris une revue sans modification fonctionnelle. Cocher dans la feuille de route uniquement les tâches dont les critères sont vérifiés. Signaler les écarts de vérification au lieu de les présenter comme acquis.

## Règles de travail

- Réutiliser le template de cours commun au lecteur et aux aperçus. Vérifier les changements de rendu sur les tailles de tablette concernées.
- Pour les KPI, documenter la source des données, le dénominateur et la règle de période. Comparer les chiffres des écrans et des exports à périmètre égal.
- Utiliser des données fictives et une base de test pour la recette. Attention : `make fixtures` et `make e2e` rechargent les données de démonstration. Vérifier l'environnement avant toute opération qui modifie la base.
- Voir [DEPLOYMENT.md](DEPLOYMENT.md) pour les procédures d'exploitation. Consigner tout déploiement, migration ou changement externe effectivement réalisé avec sa cible et son résultat.
