# Règles des KPI et du suivi — Lot 1

## Décisions validées (J-004 et J-008)

Les écrans de résultats, le tableau de bord et les résultats personnels IDE concernent exclusivement les patients dont `removedAt` est nul, dans les centres autorisés. L’archivage est une suppression logique réversible ; les dossiers sont consultables dans les archives, hors KPI. Une restauration réintègre le patient et son historique dans les KPI. Une archive ne change donc pas seulement le mois courant : les statistiques historiques sont recalculées sur la population non archivée à date.

Les patients « enregistrés » dans les KPI sont tous les non archivés du périmètre. Pour chacun des états éligible, non éligible et en attente, le pourcentage est l’effectif de cet état / l’effectif non archivé × 100, arrondi à une décimale. Sans patient, le pourcentage est absent (affiché « — »), sans division par zéro. Les effectifs sont à date, indépendants de la période d’activité choisie.

Une seule validation définitive par cours et parcours ; une séance interrompue peut être recommencée. Les données historiques existantes ne sont pas effacées.

## Suivi de l’activité d’un parcours

Source : `training_program.last_activity_at`, mise à jour lors d’un lancement de séance ou de sa validation. Les consultations, changements de sélection, interruptions et reprises administratives ne constituent pas une activité. Le dernier événement compte, même si le lancement est ensuite interrompu. Le démarrage initial du parcours reste conservé.

Le statut d’activité est calculé à la lecture :

- Achevé ou interrompu : statut prioritaire, même après 15 jours.
- Non démarré : aucune activité connue.
- Inactif : dernière activité antérieure ou égale à maintenant moins 15 jours.
- En cours : activité plus récente.

Les compteurs de statuts ont pour dénominateur les parcours des patients non archivés du périmètre, sans restriction de période. Le lancement d’une séance rend le parcours actif ; l’inactivité ne bloque pas les cours. Le statut `activityStatus` est exposé aux écrans séparément du statut de cycle de vie `status`, afin de conserver les règles existantes et la restitution des exports en attente de revue. Les filtres et le tri des listes utilisent le statut d’activité avant pagination.

La migration reprend la plus récente des dates connues : premier démarrage, démarrages de séances, validations de séances et dates de suivi des modules. Elle ne peut pas reconstituer un événement absent de l’historique.

## Moyennes, durées et période (J-019, J-023, J-024)

- **Score d'un cours** : pourcentage de réponses justes sur les exercices notés ; une validation est définitive. Chaque cours pèse autant. Un cours sans note est exclu des moyennes, un vrai 0 est inclus ; arrondi à l'entier.
- **Score de chapitre** (Parcours bis) : moyenne simple des cours validés et notés du chapitre, désélectionnés compris, post-test exclu ; « — » sans cours noté.
- **Score d'un parcours** : moyenne de ses cours validés, post-test exclu. Le post-test est affiché à part.
- **Statistiques, avec une période** : score moyen des parcours = parcours ayant au moins une séance validée dans la période (post-test exclu), chacun avec son score ; durée moyenne d'un parcours = parcours **achevés dans la période** (date de clôture) ; « — » si aucun. Sans période : tout l'historique. Bornes incluses, heure de Paris. Effectifs et statuts : à date.
- **Post-test** : hors de toutes les moyennes de score, ligne distincte dans le tableau des cours, compté comme séance réalisée.
- **Anciennes validations répétées** : pour les chiffres fondés sur les séances (activité des IDE, tableau de bord), seule la dernière validation de chaque cours dans chaque parcours compte ; l'historique est conservé (`LatestValidation`). Les durées de séances interrompues ne sont pas comptées comme validées.

## Écrans et exports (J-025)

Écrans, Excel et PDF des statistiques utilisent le même calcul (plus de mode « historique ») : statuts d'activité (non démarré, inactif 15 jours, en cours, clôturé, achevé), patients archivés exclus de tous les indicateurs, y compris l'activité des IDE. Les archivés sont comptés à part, par centre (« Archivés, hors indicateurs »). Un test compare les cellules de l'Excel aux chiffres de l'écran sur les mêmes filtres.
