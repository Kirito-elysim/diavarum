# Audit technique et fonctionnel — 12 novembre 2026

## Conclusion

Les corrections de cette passe sont validées localement. Le projet n'est pas encore prêt à ouvrir **tout le catalogue** : les contenus manquants et les polices de marque restent à fournir. Aucun déploiement distant n'a été effectué.

Le catalogue de développement inspecté contient 33 cours officiels : 29 sans écran, S1 avec 17 écrans, et S4/S7/S17 avec du contenu de démonstration. S99 est un modèle de référence non publié, avec 40 écrans. Les seuls fichiers de cours versionnés sont S1 et S99. Cet inventaire concerne la base locale, pas une éventuelle base distante.

## Corrections effectuées

- Mise à jour ciblée de 11 composants Symfony vers 7.4.23 : les 16 avis de sécurité remontés par Composer ne sont plus présents. Les contraintes de versions du projet sont conservées. Exemple d'avis officiel : [Symfony Serializer](https://symfony.com/cve-2026-118515).
- Validation de séance : la limite de compétences était de 5, alors que l'éditeur et les cours en autorisent 6. La requête utilise maintenant la constante métier commune, avec un test de validation réelle de six compétences.
- Bandeau du cours, titre, consigne, compteur et progression centralisés dans `CourseHeader`, utilisé par le lecteur, l'aperçu apprenant et l'aperçu tablette. Les blocs et la navigation étaient déjà partagés.
- Connexion : la destination conserve les paramètres et l'ancre du lien demandé, notamment l'identifiant du cours et le mode aperçu.
- Lecteur : un parcours absent ou introuvable affiche une erreur explicite ; l'état du lecteur est réinitialisé quand le patient, le parcours ou le mode change.
- Validation des contenus renforcée : listes mal formées, identifiants dupliqués, activités vides, champs obligatoires, paires de mémoire incomplètes et nombre de réponses des textes à trous. Le contrôle s'applique aussi à POST/PATCH `/api/modules`, qui pouvait contourner le validateur d'intégration.
- Import : contrôle du titre, de la durée et des compétences également en ligne de commande ; refus d'un import publié sans écran.
- Éditeur : refus des durées non entières/invalides, des identifiants de pages/blocs dupliqués et de plus de six compétences.
- Installation initiale : création préalable de S99 avant l'import `content/*.json`, dans `make content` et le guide de déploiement.
- Ajout de commandes reproductibles `npm run test:unit` et `npm run test:courses` dans `e2e/`.

## Vérifications

| Vérification | Résultat |
|---|---|
| PHPUnit | 165 tests, 892 assertions, réussis après mise à jour Symfony |
| Schéma Doctrine | Entités et base synchronisées |
| Configuration Symfony | Conteneur de services et 26 fichiers YAML valides |
| Build frontend | TypeScript et Vite réussis |
| ESLint | 0 erreur, 6 avertissements Fast Refresh préexistants |
| Audit dépendances de production | npm : 0 avis ; Composer : 0 avis |
| Modèles de cours | 37 modèles : création, validation et sérialisation réussies |
| Rendu des cours | 73 écrans, 26 types de blocs, en 1280×800 et 800×1280, sans débordement horizontal |
| Rendu du build de production | Même recette de 73 écrans réussie sur Nginx, avec API simulée |
| CODEX (interface) | Écrans, cadran, orientation, restitution, décision IDE et reprise après erreur vérifiés |
| Aperçus | Thème partagé dans l'aperçu apprenant et l'iframe tablette paysage/portrait |
| Éditeur | Création, médias, quiz formatif, brouillon, sauvegarde avec erreur/reprise, duplication et annulation |
| Parcours apprenant | Interactions, QCU/QCM, score, retour protégé par PIN, validation IDE |
| Navigation | Paramètres conservés après connexion ; parcours absent/introuvable traité |
| Tablettes | 9 pages métier, navigation et interactions tactiles en 768×1024, 1024×768 et 800×600 |
| Profil patient | Saisie, erreur/reprise, conservation des données et annulation |
| Pagination | 205 patients/séances récupérés sur 3 pages avec filtres conservés |
| Production locale isolée | Images PHP/Nginx construites ; DB, PHP, Nginx et worker démarrés ; migrations sur base vide ; import S1/S99 réussi ; `/api/health` valide |

Les tests navigateur de cours simulent les écritures métier pour préserver les dossiers locaux ; les règles serveur sont exercées par PHPUnit sur `diaverum_test`. Le scénario historique `e2e/scenario.mjs`, qui écrit dans la base de démonstration et contient encore des attentes anciennes sur S1 et le nombre de cours, n'a pas été utilisé pour certifier cette passe.

## À régler avant l'ouverture

1. **Contenus** : terminer et relire les cours réellement ouverts. Ne pas assimiler le statut « publié » du catalogue initial à la présence d'un contenu : les migrations créent des entrées vides publiées. Le lecteur affiche alors un message d'absence de contenu. Le post-test est lui aussi vide dans la base inspectée.
2. **Identité visuelle exacte** : fournir `EuclidCircularA-Regular.woff2`, `EuclidCircularA-Medium.woff2` et `EuclidCircularA-SemiBold.woff2` dans `front/public/fonts/`. Sans ces fichiers sous licence, le repli système peut modifier la police, les retours à la ligne et la hauteur des blocs entre Windows, Android et macOS. Le template commun est vérifié ; l'identité typographique exacte n'est pas certifiable en leur absence.
3. **Environnement distant** : vérifier le domaine HTTPS, les secrets, le SMTP réel et une restauration de sauvegarde sur l'hébergement cible. La recette locale ne vérifie pas la configuration Coolify distante. Le SMTP par défaut capture les courriels dans Mailpit et ne les délivre pas.
4. **Livraison Git** : inclure les nouvelles illustrations S1 et les fichiers de code/test non suivis nécessaires. Le répertoire contient des modifications antérieures à cette passe, conservées. Un déploiement depuis Git ne reçoit pas les fichiers locaux non commités.

## Améliorations à prioriser ensuite

- **Versionner un cours à l'ouverture d'une séance** : le score et les compétences utilisent actuellement le module courant. Une modification pendant une séance peut rendre ses réponses incompatibles ; une modification de libellé peut aussi changer la lecture de l'historique. Prévoir un instantané/version immuable plutôt que modifier les cours pendant leur utilisation.
- **Calculer les réponses justes entièrement sur le serveur** : aujourd'hui, le serveur vérifie les blocs et les totaux, mais le nombre de bonnes réponses provient du navigateur. Pour une intégrité renforcée des évaluations, transmettre les réponses brutes et les corriger côté API.
- **Distinguer catalogue et disponibilité** : afficher « contenu à venir » et désactiver les lancements vides dès la fiche patient ; définir comment les nouveaux cours rejoignent les parcours déjà créés. À ce jour, le parcours reçoit les cours publiés lors de sa création.
- **Automatiser la recette en CI** : build/lint, PHPUnit, modèles, médias et parcours navigateur. Actualiser le scénario historique au fil des changements pédagogiques.
- **Poursuivre la validation des activités avancées** : le validateur renforcé n'est pas un schéma exhaustif ; les arbres oui/non, scénarios, coordonnées et mots cachés bénéficieraient de contrôles sémantiques supplémentaires.

## Commandes utiles

Depuis la racine :

```sh
make test
make prod-check
make prod-build
```

Depuis `front/` :

```sh
npm run build
npm run lint
npm audit --omit=dev
```

Depuis `e2e/`, avec la stack locale et ses comptes de démonstration déjà disponibles :

```sh
npm run test:unit
E2E_BASE_URL=http://localhost:8091 npm run test:courses
E2E_BASE_URL=http://localhost:8091 node tablet-layout.mjs
```

Pour vérifier uniquement le rendu sans API, sur un serveur frontend :

```sh
E2E_OFFLINE=1 E2E_BASE_URL=http://localhost:8091 node course-theme.mjs
```
