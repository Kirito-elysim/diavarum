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

## Calculs existants conservés, à revoir avec les bilans et exports

L’activité filtrée par période inclut les dates de validation entre les deux bornes incluses. Les dates de filtre sont interprétées dans le fuseau Europe/Paris côté reporting. Les moyennes ignorent les scores absents et conservent les vrais zéros. Les durées de séances interrompues ne sont pas comptées comme des durées validées.

Les statistiques générales retiennent le suivi validé par module du parcours ; les activités IDE et certains compteurs du tableau de bord interrogent les séances validées. Pour les nouveaux parcours sans doublon, ces règles convergent. Un arbitrage reste nécessaire pour d’anciennes validations répétées ; elles ne sont ni supprimées ni fusionnées dans cette passe.

La durée moyenne des parcours est actuellement celle des parcours achevés, toutes dates. Le score moyen des parcours est calculé à date sur les parcours ayant une note ; les moyennes de cours et l’activité suivent la période choisie. La pondération par chapitre, le rôle du post-test et la portée temporelle des moyennes de parcours restent à préciser avant changement.

## Bilans et exports en attente

À la demande utilisateur, les générateurs de bilans patient, Excel et PDF et leurs calculs ne sont pas modifiés en J-008. La synthèse exportée conserve temporairement l’ancienne classification des parcours et le périmètre historique de l’activité IDE. Les écrans et exports ne sont donc pas encore certifiés équivalents. Un point fonctionnel est requis avant modification et rapprochement des résultats. Le lot 1 reste ouvert.
