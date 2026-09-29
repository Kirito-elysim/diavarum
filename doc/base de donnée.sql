-- ============================================================
-- EXPORT COMPLET DE LA BASE DE DONNÉES
-- Date: 2026-09-29
-- Projet: Application d'entraînement thérapeutique (dialyse)
-- 
-- Ce fichier contient:
-- 1. La structure de toutes les tables (schéma)
-- 2. Toutes les données (INSERT)
-- 3. Les contraintes de clés étrangères
-- 4. Les politiques RLS (Row Level Security)
--
-- Pour réimporter dans une nouvelle base Supabase:
-- 1. Créez un nouveau projet Supabase
-- 2. Exécutez ce script dans l'éditeur SQL de Supabase
-- 3. Recréez l'utilisateur d'authentification manuellement
--    (voir la section AUTH à la fin)
-- ============================================================

-- ============================================================
-- PARTIE 1: STRUCTURE DES TABLES
-- ============================================================

-- --- centers ---
CREATE TABLE IF NOT EXISTS centers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  city text NOT NULL,
  country text NOT NULL DEFAULT 'France',
  created_at timestamp with time zone DEFAULT now()
);

-- --- chapters ---
CREATE TABLE IF NOT EXISTS chapters (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone DEFAULT now()
);

-- --- profiles (liés à auth.users) ---
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text NOT NULL,
  name text NOT NULL,
  role text NOT NULL DEFAULT 'ide' CHECK (role = ANY (ARRAY['ide', 'cadre', 'admin_national'])),
  primary_center_id uuid REFERENCES centers(id),
  security_code text,
  security_code_configured boolean NOT NULL DEFAULT false,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- --- national_security_code (singleton) ---
CREATE TABLE IF NOT EXISTS national_security_code (
  id integer PRIMARY KEY DEFAULT 1,
  code text NOT NULL DEFAULT '0000',
  updated_at timestamp with time zone DEFAULT now(),
  updated_by uuid REFERENCES profiles(id)
);

-- --- nurse_center_affiliations ---
CREATE TABLE IF NOT EXISTS nurse_center_affiliations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  center_id uuid NOT NULL REFERENCES centers(id) ON DELETE CASCADE,
  created_at timestamp with time zone DEFAULT now()
);

-- --- patients ---
CREATE TABLE IF NOT EXISTS patients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  first_name text NOT NULL,
  last_name text NOT NULL,
  date_of_birth date,
  center_id uuid NOT NULL REFERENCES centers(id),
  assigned_nurse_id uuid REFERENCES profiles(id),
  eligibility_status text NOT NULL DEFAULT 'enregistre',
  eligibility_notes text,
  medical_data jsonb DEFAULT '{}',
  administrative_data jsonb DEFAULT '{}',
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- --- eligibility_reasons ---
CREATE TABLE IF NOT EXISTS eligibility_reasons (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  label text NOT NULL,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone DEFAULT now()
);

-- --- patient_eligibility_reasons ---
CREATE TABLE IF NOT EXISTS patient_eligibility_reasons (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id uuid NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  reason_id uuid NOT NULL REFERENCES eligibility_reasons(id),
  free_text text,
  created_at timestamp with time zone DEFAULT now()
);

-- --- interruption_reasons ---
CREATE TABLE IF NOT EXISTS interruption_reasons (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  label text NOT NULL,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone DEFAULT now()
);

-- --- modules ---
CREATE TABLE IF NOT EXISTS modules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text NOT NULL DEFAULT '',
  category text NOT NULL DEFAULT 'Fondamentaux',
  chapter_id uuid REFERENCES chapters(id),
  estimated_duration integer NOT NULL DEFAULT 30,
  is_mandatory boolean NOT NULL DEFAULT true,
  is_intro boolean NOT NULL DEFAULT false,
  is_published boolean NOT NULL DEFAULT true,
  content jsonb NOT NULL DEFAULT '[]',
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- --- module_competencies ---
CREATE TABLE IF NOT EXISTS module_competencies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  module_id uuid NOT NULL REFERENCES modules(id) ON DELETE CASCADE,
  label text NOT NULL,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone DEFAULT now()
);

-- --- training_programs ---
CREATE TABLE IF NOT EXISTS training_programs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id uuid NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  nurse_id uuid NOT NULL REFERENCES profiles(id),
  title text NOT NULL DEFAULT 'Parcours d''entraînement',
  description text,
  status text NOT NULL DEFAULT 'non_actif',
  created_at timestamp with time zone DEFAULT now(),
  started_at timestamp with time zone,
  completed_at timestamp with time zone
);

-- --- training_program_modules ---
CREATE TABLE IF NOT EXISTS training_program_modules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  program_id uuid NOT NULL REFERENCES training_programs(id) ON DELETE CASCADE,
  module_id uuid NOT NULL REFERENCES modules(id),
  sort_order integer NOT NULL DEFAULT 0,
  is_selected boolean NOT NULL DEFAULT true,
  validated_at timestamp with time zone,
  score integer
);

-- --- sessions ---
CREATE TABLE IF NOT EXISTS sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id uuid NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  nurse_id uuid NOT NULL REFERENCES profiles(id),
  module_id uuid NOT NULL REFERENCES modules(id),
  program_id uuid REFERENCES training_programs(id),
  status text NOT NULL DEFAULT 'en_cours',
  started_at timestamp with time zone NOT NULL DEFAULT now(),
  completed_at timestamp with time zone,
  duration_seconds integer DEFAULT 0,
  current_page integer NOT NULL DEFAULT 0
);

-- --- session_results ---
CREATE TABLE IF NOT EXISTS session_results (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  patient_id uuid NOT NULL REFERENCES patients(id),
  module_id uuid NOT NULL REFERENCES modules(id),
  score integer NOT NULL DEFAULT 0,
  completion_percent integer NOT NULL DEFAULT 100,
  duration_seconds integer NOT NULL DEFAULT 0,
  quiz_results jsonb DEFAULT '[]',
  created_at timestamp with time zone DEFAULT now()
);

-- --- session_competency_validations ---
CREATE TABLE IF NOT EXISTS session_competency_validations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  competency_id uuid NOT NULL REFERENCES module_competencies(id),
  validated boolean NOT NULL DEFAULT false,
  validated_by uuid NOT NULL REFERENCES profiles(id),
  created_at timestamp with time zone DEFAULT now()
);

-- --- program_interruptions ---
CREATE TABLE IF NOT EXISTS program_interruptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id uuid NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  nurse_id uuid NOT NULL REFERENCES profiles(id),
  reason_id uuid REFERENCES interruption_reasons(id),
  free_text text,
  created_at timestamp with time zone DEFAULT now()
);

-- --- codex_words ---
CREATE TABLE IF NOT EXISTS codex_words (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  word text NOT NULL,
  created_at timestamp with time zone DEFAULT now()
);

-- --- codex_tests ---
CREATE TABLE IF NOT EXISTS codex_tests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id uuid NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  nurse_id uuid NOT NULL REFERENCES profiles(id),
  word1 text NOT NULL,
  word2 text NOT NULL,
  word3 text NOT NULL,
  clock_time_chosen text NOT NULL,
  clock_test_passed boolean NOT NULL DEFAULT false,
  word_recall_passed boolean NOT NULL DEFAULT false,
  overall_passed boolean NOT NULL DEFAULT false,
  notes text,
  created_at timestamp with time zone DEFAULT now()
);

-- ============================================================
-- PARTIE 2: DONNÉES (INSERT)
-- ============================================================

-- --- centers ---
INSERT INTO centers (id, name, city, country, created_at) VALUES
('62bf9c03-5d5c-45b0-8969-7b8f913c9a62', 'Diaverum Paris Nord', 'Paris', 'France', '2026-08-28T19:19:21.982148+00:00');

-- --- national_security_code ---
INSERT INTO national_security_code (id, code, updated_at, updated_by) VALUES
(1, '0000', '2026-08-28T19:14:58.335721+00:00', NULL);

-- --- profiles ---
-- NOTE: L'utilisateur d'authentification correspondant doit être créé
-- manuellement dans Supabase Auth avec l'email: teststestes@test.fr
-- Voir la section AUTH à la fin de ce fichier.
INSERT INTO profiles (id, email, name, role, primary_center_id, security_code, security_code_configured, created_at, updated_at) VALUES
('f69c9702-65a7-4cb3-a1be-de91d7d022a3', 'teststestes@test.fr', 'Nouvel utilisateur', 'ide', NULL, NULL, false, '2026-08-28T19:23:00.752414+00:00', '2026-08-28T19:23:00.752414+00:00');

-- --- patients ---
INSERT INTO patients (id, first_name, last_name, date_of_birth, center_id, assigned_nurse_id, eligibility_status, eligibility_notes, medical_data, administrative_data, created_at, updated_at) VALUES
('d7a70f2d-c3d4-4da2-8b3f-223232062923', 'dgdgdf', 'fgdfgdf', NULL, '62bf9c03-5d5c-45b0-8969-7b8f913c9a62', 'f69c9702-65a7-4cb3-a1be-de91d7d022a3', 'non_eligible', NULL, '{}'::jsonb, '{}'::jsonb, '2026-08-28T19:35:49.291264+00:00', '2026-08-28T19:35:49.291264+00:00');

-- --- eligibility_reasons ---
INSERT INTO eligibility_reasons (id, label, sort_order, created_at) VALUES
('50a303cc-72a8-4aa0-836d-84030c748706', 'Troubles cognitifs sévères', 1, '2026-08-28T19:15:38.069343+00:00'),
('a1266dfd-8cbc-4273-b517-8e3ec1f8955b', 'Patient non consentant', 2, '2026-08-28T19:15:38.069343+00:00'),
('6af4f3d2-08d2-4f0d-aeff-15d548a49b72', 'État de santé incompatible', 3, '2026-08-28T19:15:38.069343+00:00'),
('359eaf78-98f1-49b9-965a-dbf813d01135', 'Transfert imminent vers un autre centre', 4, '2026-08-28T19:15:38.069343+00:00'),
('1a9d0f9b-105e-42db-a01d-74f2d979dd1b', 'Autre (à préciser)', 5, '2026-08-28T19:15:38.069343+00:00');

-- --- interruption_reasons ---
INSERT INTO interruption_reasons (id, label, sort_order, created_at) VALUES
('212a11f9-ba11-4718-aebb-c10cb92f59e3', 'Transfert vers un autre centre', 1, '2026-08-28T19:15:38.069343+00:00'),
('c3ba6619-666d-48ef-8d0d-5fe9194ebd6b', 'Arrêt temporaire pour raisons médicales', 2, '2026-08-28T19:15:38.069343+00:00'),
('b9a23e13-0705-404a-b4e2-80ad7afa200f', 'Hospitalisation', 3, '2026-08-28T19:15:38.069343+00:00'),
('550b651e-011b-445f-910a-5ceb881d8aea', 'Refus du patient de poursuivre', 4, '2026-08-28T19:15:38.069343+00:00'),
('fae22099-d08f-4698-acf5-2b8df74c0a41', 'Fin de traitement par dialyse', 5, '2026-08-28T19:15:38.069343+00:00'),
('d9355efb-2126-4859-ab94-3b4a8833ec6a', 'Autre (à préciser)', 6, '2026-08-28T19:15:38.069343+00:00');

-- --- codex_words ---
INSERT INTO codex_words (id, word, created_at) VALUES
('d8361e74-a66a-4cf7-aa91-37933637ea59', 'Pomme', '2026-08-28T19:15:38.069343+00:00'),
('45b5f4e6-c131-428e-b065-2bb207dcc119', 'Clé', '2026-08-28T19:15:38.069343+00:00'),
('d4427d71-801a-4134-b8ca-6f257d2988eb', 'Fleur', '2026-08-28T19:15:38.069343+00:00'),
('a019ab6f-f083-412b-8a4f-4e4b66441343', 'Maison', '2026-08-28T19:15:38.069343+00:00'),
('79bf4bab-61de-4d0d-810c-31c25e0739fc', 'Chien', '2026-08-28T19:15:38.069343+00:00'),
('6d50d237-d76c-41a1-9a66-27ce4041c001', 'Livre', '2026-08-28T19:15:38.069343+00:00'),
('16244e53-c227-482f-9bee-b60904c16acd', 'Bateau', '2026-08-28T19:15:38.069343+00:00'),
('9117eaad-989e-4e25-8834-3a1f989f799c', 'Arbre', '2026-08-28T19:15:38.069343+00:00'),
('eaadb2d4-abc4-4f55-8d1f-074a8d649da5', 'Montagne', '2026-08-28T19:15:38.069343+00:00'),
('b3582b3a-96a8-46a2-a0e5-a3afd1bfe2a8', 'Étoile', '2026-08-28T19:15:38.069343+00:00'),
('d0b8254a-71ed-4cd7-a9e2-0e233fd9a2ca', 'Rivière', '2026-08-28T19:15:38.069343+00:00'),
('f1934707-3aa4-4174-94e7-af17c074aef4', 'Jardin', '2026-08-28T19:15:38.069343+00:00'),
('e1a129a7-4374-4103-8e5a-9a3098784561', 'Nuage', '2026-08-28T19:15:38.069343+00:00'),
('a0d15cb3-141b-44e8-bbac-eb2c054cafca', 'Oiseau', '2026-08-28T19:15:38.069343+00:00'),
('bddb7b02-08d1-432e-b865-7f46002148fc', 'Pont', '2026-08-28T19:15:38.069343+00:00'),
('e0e0f685-0aa1-4514-bb57-587928b3b661', 'Soleil', '2026-08-28T19:15:38.069343+00:00'),
('4c5e166f-8e0e-4c5a-b595-65a878ba31b1', 'Train', '2026-08-28T19:15:38.069343+00:00'),
('2a45ad5a-3d9f-4acb-93e7-4a5e5a5221e4', 'Forêt', '2026-08-28T19:15:38.069343+00:00'),
('aae11d80-458f-437e-97f9-df81ca7bc735', 'Fenêtre', '2026-08-28T19:15:38.069343+00:00');

-- --- modules ---
-- Module 1: Comprendre la dialyse
INSERT INTO modules (id, title, description, category, chapter_id, estimated_duration, is_mandatory, is_intro, is_published, content, created_at, updated_at) VALUES
('2ecbff7a-a884-4673-8abe-f0d17b0381c9', 'Comprendre la dialyse', 'Découvrez comment fonctionne la dialyse, pourquoi elle est nécessaire et ce qui se passe pendant une séance.', 'Fondamentaux', NULL, 20, true, true, true,
'[{"id":"p1","title":"Qu''est-ce que la dialyse ?","blocks":[{"id":"t1","type":"text","content":"Bonjour ! Aujourd''hui, nous allons comprendre ensemble ce qu''est la dialyse et pourquoi elle est si importante pour vous. Ne vous inquiétez pas, tout sera expliqué simplement."},{"id":"ic1","type":"info-card","title":"Le rôle des reins","content":"Les reins sont deux organes en forme de haricot situés dans le dos. Ils filtrent le sang environ 60 fois par jour pour éliminer les déchets et l''excès d''eau. Quand les reins ne fonctionnent plus assez, ces déchets s''accumulent dans le corps.","variant":"info"},{"id":"ic2","type":"info-card","title":"Pourquoi la dialyse ?","content":"La dialyse remplace le travail des reins quand ils ne peuvent plus le faire. Elle nettoie votre sang en retirant les déchets et l''excès d''eau. C''est un traitement vital qui vous aide à continuer à vivre normalement.","variant":"success"}]},{"id":"p2","title":"Comment ça marche ?","blocks":[{"id":"t2","type":"text","content":"Pendant la dialyse, votre sang circule à travers une machine appelée « générateur ». Cette machine contient un filtre spécial, le dialyseur, qui joue le rôle de rein artificiel."},{"id":"ic3","type":"info-card","title":"Le déroulement d''une séance","content":"Une séance dure en général 4 heures. Vous êtes installé confortablement dans un fauteuil. Le sang est prélevé, filtré par la machine, puis renvoyé dans votre corps. Pendant ce temps, vous pouvez lire, regarder la télévision ou vous reposer.","variant":"info"},{"id":"ic4","type":"info-card","title":"Attention","content":"Il est normal de se sentir fatigué après une séance. Si vous ressentez des vertiges, des crampes ou une gêne, prévenez immédiatement l''infirmière.","variant":"warning"}]},{"id":"p3","title":"Vos questions fréquentes","blocks":[{"id":"tf1","type":"true-false","question":"Vrai ou faux ?","statements":[{"id":"s1","isTrue":false,"statement":"La dialyse remplace complètement et définitivement les reins."},{"id":"s2","isTrue":true,"statement":"Pendant la dialyse, je peux lire ou regarder la télévision."},{"id":"s3","isTrue":true,"statement":"Il est normal de se sentir fatigué après une séance."}],"explanation":"La dialyse ne remplace pas totalement les reins : elle filtre le sang mais ne produit pas certaines hormones. Pendant la séance, vous êtes libre de lire ou regarder la TV. La fatigue après une séance est courante."},{"id":"q1","type":"quiz","options":[{"id":"o1","label":"30 minutes","isCorrect":false},{"id":"o2","label":"1 heure","isCorrect":false},{"id":"o3","label":"4 heures","isCorrect":true},{"id":"o4","label":"8 heures","isCorrect":false}],"question":"Combien de temps dure en général une séance de dialyse ?","explanation":"Une séance de dialyse dure en moyenne 4 heures, répétée 3 fois par semaine.","questionType":"qcu"}]}]'::jsonb,
'2026-08-28T19:19:21.982148+00:00', '2026-08-28T19:19:21.982148+00:00');

-- Module 2: Alimentation et hydratation
INSERT INTO modules (id, title, description, category, chapter_id, estimated_duration, is_mandatory, is_intro, is_published, content, created_at, updated_at) VALUES
('4f691966-2fb1-4ae6-8aae-e1560ec18111', 'Alimentation et hydratation', 'Apprenez à adapter votre alimentation et gérer votre soif entre les séances de dialyse.', 'Fondamentaux', NULL, 20, true, false, true,
'[{"id":"p1","title":"Pourquoi faire attention à son alimentation ?","blocks":[{"id":"t1","type":"text","content":"L''alimentation joue un rôle très important quand on est dialysé. Comme vos reins ne filtrent plus comme avant, certains aliments peuvent accumuler des déchets dans votre corps. Mais pas de panique : avec quelques habitudes simples, vous pouvez continuer à bien manger et vous faire plaisir !"},{"id":"ic1","type":"info-card","title":"Les 3 points clés","content":"1. Limiter le sel pour éviter la soif et l''hypertension. 2. Contrôler les aliments riches en potassium. 3. Surveiller les apports en phosphore.","variant":"info"}]},{"id":"p2","title":"Les aliments à limiter","blocks":[{"id":"t2","type":"text","content":"Certains aliments contiennent beaucoup de potassium ou de phosphore. Ce sont des éléments que les reins ont du mal à éliminer. Découvrons lesquels limiter."},{"id":"sb1","type":"sort-bin","items":[{"id":"i1","keep":false,"label":"Banane"},{"id":"i2","keep":true,"label":"Pomme"},{"id":"i3","keep":false,"label":"Charcuterie"},{"id":"i4","keep":true,"label":"Poulet grillé"},{"id":"i5","keep":false,"label":"Chocolat"},{"id":"i6","keep":true,"label":"Riz"},{"id":"i7","keep":false,"label":"Noix"},{"id":"i8","keep":true,"label":"Haricots verts"}],"question":"Triez ces aliments : à limiter ou à privilégier ?","keepLabel":"À privilégier","explanation":"La banane, le chocolat et les noix sont riches en potassium. La charcuterie est très salée. Privilégiez la pomme, le poulet grillé, le riz et les haricots verts.","discardLabel":"À limiter"}]},{"id":"p3","title":"Gérer sa soif","blocks":[{"id":"t3","type":"text","content":"La gestion de la soif est un défi quotidien. Entre deux dialyses, le boire et le manger s''accumulent dans le corps. Trop d''eau peut cauffer des gonflements et essoufflement."},{"id":"ic2","type":"info-card","title":"Astuces anti-soif","content":"Buvez dans un petit verre pour contrôler les quantités. Sucez des glaçons. Croquez un citron. Évitez les plats trop salés. Pèse-toi régulièrement entre deux séances.","variant":"tip"},{"id":"q1","type":"quiz","options":[{"id":"o1","label":"0,5 litre maximum","isCorrect":false},{"id":"o2","label":"Entre 0,5 et 1 litre selon le poids","isCorrect":true},{"id":"o3","label":"Au moins 2 litres","isCorrect":false},{"id":"o4","label":"Pas de restriction","isCorrect":false}],"question":"Combien de liquide par jour est généralement recommandé entre deux séances ?","explanation":"La quantité de liquide recommandée dépend de votre poids et de votre diurèse résiduelle. Demandez conseil à votre néphrologue.","questionType":"qcu"}]}]'::jsonb,
'2026-08-28T19:19:21.982148+00:00', '2026-08-28T19:19:21.982148+00:00');

-- Module 3: La fistula - Mon trésor
INSERT INTO modules (id, title, description, category, chapter_id, estimated_duration, is_mandatory, is_intro, is_published, content, created_at, updated_at) VALUES
('0ce72b2d-a58c-49ce-b7a1-23f6857b6bf6', 'La fistula - Mon trésor', 'Comprenez l''importance de votre fistula, apprenez à en prendre soin au quotidien et reconnaissez les signes d''alerte.', 'Fondamentaux', NULL, 25, true, false, true,
'[{"id":"p1","title":"Qu''est-ce qu''une fistula ?","blocks":[{"id":"t1","type":"text","content":"La fistula est la porte d''entrée de votre dialyse. C''est une connexion créée par chirurgie entre une artère et une veine, généralement dans le bras. Elle permet d''accéder à votre sang à chaque séance de façon sûre et durable."},{"id":"ic1","type":"info-card","title":"Pourquoi la fistula est-elle si importante ?","content":"La fistula est considérée comme le meilleur accès vasculaire pour la dialyse. Elle peut durer de nombreuses années si vous en prenez soin. C''est votre « trésor » : protégez-le !","variant":"success"}]},{"id":"p2","title":"Prendre soin de sa fistula au quotidien","blocks":[{"id":"t2","type":"text","content":"Votre fistula demande quelques attentions chaque jour. Voici les gestes simples à connaître et les erreurs à éviter."},{"id":"cat1","type":"categorize","items":[{"id":"i1","label":"Nettoyer la fistula avec de l''eau et du savon","category":"Bon geste"},{"id":"i2","label":"Dormir sur le bras de la fistula","category":"À éviter"},{"id":"i3","label":"Prendre la tension sur le bras de la fistula","category":"À éviter"},{"id":"i4","label":"Palper la fistula chaque matin pour sentir le frémissement","category":"Bon geste"},{"id":"i5","label":"Porter des bagues ou montres serrées sur ce bras","category":"À éviter"},{"id":"i6","label":"Faire des exercices de serrage avec une balle molle","category":"Bon geste"}],"question":"Classez ces actions : bon geste ou à éviter ?","categories":["Bon geste","À éviter"],"explanation":"Nettoyer la fistula et la palper chaque matin sont des gestes essentiels. En revanche, il ne faut jamais dormir dessus, prendre la tension, ni porter des bijoux serrés sur le bras de la fistula."}]},{"id":"p3","title":"Les signes d''alerte","blocks":[{"id":"t3","type":"text","content":"Il est important de reconnaître les signes qui doivent vous amener à contacter rapidement votre centre de dialyse. Soyez vigilant chaque jour."},{"id":"ic2","type":"info-card","title":"Signes qui doivent alerter","content":"Vous ne sentez plus le frémissement (le « thrill ») de la fistula. La zone est rouge, chaude ou douloureuse. Vous avez de la fièvre. Il y a un saignement qui dure. La fistula est gonflée ou dure.","variant":"warning"},{"id":"sc1","type":"scenario","steps":[{"id":"step1","choices":[{"id":"c1","label":"J''attends le prochain jour de dialyse pour en parler","feedback":"Non ! L''absence de frémissement est une urgence. La fistula pourrait être bouchée.","isCorrect":false},{"id":"c2","label":"J''appelle immédiatement mon centre de dialyse","feedback":"Exact ! C''est la bonne réaction. Le centre pourra vérifier et déboucher la fistula si nécessaire.","isCorrect":true},{"id":"c3","label":"Je masse la zone pour la réactiver","feedback":"Non ! Ne jamais masser une fistula. Cela pourrait causer des complications.","isCorrect":false}],"question":"Que faites-vous ?","situation":"Ce matin, en palpant votre fistula comme d''habitude, vous ne sentez plus le frémissement habituel."}],"question":"Que feriez-vous dans cette situation ?"}]},{"id":"p4","title":"Quiz final","blocks":[{"id":"q1","type":"quiz","options":[{"id":"o1","label":"La palper chaque matin","isCorrect":true},{"id":"o2","label":"La nettoyer avec eau et savon","isCorrect":true},{"id":"o3","label":"Éviter de porter des charges lourdes avec ce bras","isCorrect":true},{"id":"o4","label":"Prendre la tension sur ce bras","isCorrect":false}],"question":"Quels sont les bons gestes pour préserver sa fistula ? (plusieurs réponses possibles)","explanation":"Les trois premiers sont de bons gestes. Ne jamais prendre la tension sur le bras de la fistula.","questionType":"qcm"},{"id":"q2","type":"quiz","options":[{"id":"o1","label":"Attendre le prochain jour de dialyse","isCorrect":false},{"id":"o2","label":"Appeler immédiatement le centre","isCorrect":true},{"id":"o3","label":"Masser la fistula","isCorrect":false}],"question":"Si vous ne sentez plus le frémissement de votre fistula, que devez-vous faire ?","explanation":"L''absence de frémissement est une urgence : appelez immédiatement votre centre de dialyse.","questionType":"qcu"}]}]'::jsonb,
'2026-08-28T19:19:21.982148+00:00', '2026-08-28T19:19:21.982148+00:00');

-- --- module_competencies ---
INSERT INTO module_competencies (id, module_id, label, sort_order, created_at) VALUES
('4bfa14b9-0db1-494a-a1fe-a6916e0524db', '2ecbff7a-a884-4673-8abe-f0d17b0381c9', 'Le patient explique le rôle de la dialyse avec ses propres mots', 0, '2026-08-28T19:40:26.041788+00:00'),
('83972213-fa66-4bec-9264-42d239ae6563', '2ecbff7a-a884-4673-8abe-f0d17b0381c9', 'Le patient identifie la durée d''une séance de dialyse', 1, '2026-08-28T19:40:26.041788+00:00'),
('490ba6f8-aaca-40a7-b34e-b4a66d4f1699', '2ecbff7a-a884-4673-8abe-f0d17b0381c9', 'Le patient sait qu''il peut prévenir l''IDE en cas de gêne pendant la séance', 2, '2026-08-28T19:40:26.041788+00:00'),
('733bcf11-a644-4f07-8764-d8110b7096f7', '4f691966-2fb1-4ae6-8aae-e1560ec18111', 'Le patient distingue les aliments à privilégier de ceux à limiter', 0, '2026-08-28T19:40:26.041788+00:00'),
('7c013fa0-2dd1-490d-b288-900a03637852', '4f691966-2fb1-4ae6-8aae-e1560ec18111', 'Le patient explique pourquoi le sel doit être limité', 1, '2026-08-28T19:40:26.041788+00:00'),
('dd3559ee-c7ca-4307-8cb0-fdf596b53846', '4f691966-2fb1-4ae6-8aae-e1560ec18111', 'Le patient connaît au moins deux astuces pour gérer sa soif', 2, '2026-08-28T19:40:26.041788+00:00'),
('3b7806fe-4954-4e51-b3eb-5b26f6d3971f', '0ce72b2d-a58c-49ce-b7a1-23f6857b6bf6', 'Le patient palpe sa fistula chaque matin et sait reconnaître le frémissement', 0, '2026-08-28T19:40:26.041788+00:00'),
('aa444c26-9670-41f4-96f7-1f65dad1f75f', '0ce72b2d-a58c-49ce-b7a1-23f6857b6bf6', 'Le patient identifie les gestes à éviter sur le bras de la fistula', 1, '2026-08-28T19:40:26.041788+00:00'),
('2dd7272e-fbee-4225-b6f2-50998eeeb69d', '0ce72b2d-a58c-49ce-b7a1-23f6857b6bf6', 'Le patient connaît les signes d''alerte nécessitant d''appeler le centre', 2, '2026-08-28T19:40:26.041788+00:00'),
('ecc86fb9-1aaf-432a-abc2-bbfde94b0dfc', '0ce72b2d-a58c-49ce-b7a1-23f6857b6bf6', 'Le patient sait réagir correctement face à une absence de frémissement', 3, '2026-08-28T19:40:26.041788+00:00');

-- --- sessions ---
INSERT INTO sessions (id, patient_id, nurse_id, module_id, program_id, status, started_at, completed_at, duration_seconds, current_page) VALUES
('0a918b7b-5b69-4356-9923-9239e6bf9cc5', 'd7a70f2d-c3d4-4da2-8b3f-223232062923', 'f69c9702-65a7-4cb3-a1be-de91d7d022a3', '4f691966-2fb1-4ae6-8aae-e1560ec18111', NULL, 'en_cours', '2026-08-28T19:42:46.339+00:00', NULL, 0, 0);

-- --- codex_tests ---
INSERT INTO codex_tests (id, patient_id, nurse_id, word1, word2, word3, clock_time_chosen, clock_test_passed, word_recall_passed, overall_passed, notes, created_at) VALUES
('465bf4dc-b57b-4007-9680-64d3cf1422bf', 'd7a70f2d-c3d4-4da2-8b3f-223232062923', 'f69c9702-65a7-4cb3-a1be-de91d7d022a3', 'Forêt', 'Chien', 'Livre', '5:30', true, false, false, NULL, '2026-08-28T19:44:11.075371+00:00');

-- ============================================================
-- PARTIE 3: SÉCURITÉ - ROW LEVEL SECURITY (RLS)
-- ============================================================

-- Activer RLS sur toutes les tables
ALTER TABLE centers ENABLE ROW LEVEL SECURITY;
ALTER TABLE chapters ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE national_security_code ENABLE ROW LEVEL SECURITY;
ALTER TABLE nurse_center_affiliations ENABLE ROW LEVEL SECURITY;
ALTER TABLE patients ENABLE ROW LEVEL SECURITY;
ALTER TABLE eligibility_reasons ENABLE ROW LEVEL SECURITY;
ALTER TABLE patient_eligibility_reasons ENABLE ROW LEVEL SECURITY;
ALTER TABLE interruption_reasons ENABLE ROW LEVEL SECURITY;
ALTER TABLE modules ENABLE ROW LEVEL SECURITY;
ALTER TABLE module_competencies ENABLE ROW LEVEL SECURITY;
ALTER TABLE training_programs ENABLE ROW LEVEL SECURITY;
ALTER TABLE training_program_modules ENABLE ROW LEVEL SECURITY;
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE session_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE session_competency_validations ENABLE ROW LEVEL SECURITY;
ALTER TABLE program_interruptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE codex_words ENABLE ROW LEVEL SECURITY;
ALTER TABLE codex_tests ENABLE ROW LEVEL SECURITY;

-- --- Politiques RLS pour centers ---
CREATE POLICY "auth_read_centers" ON centers FOR SELECT TO authenticated USING (true);
CREATE POLICY "admin_insert_centers" ON centers FOR INSERT TO authenticated WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin_national'));
CREATE POLICY "admin_update_centers" ON centers FOR UPDATE TO authenticated USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin_national'));
CREATE POLICY "admin_delete_centers" ON centers FOR DELETE TO authenticated USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin_national'));

-- --- Politiques RLS pour chapters ---
CREATE POLICY "auth_read_chapters" ON chapters FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth_write_chapters" ON chapters FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "auth_update_chapters" ON chapters FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_delete_chapters" ON chapters FOR DELETE TO authenticated USING (true);

-- --- Politiques RLS pour profiles ---
CREATE POLICY "auth_read_profiles" ON profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "self_update_profile" ON profiles FOR UPDATE TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);
CREATE POLICY "cadre_admin_update_profile" ON profiles FOR UPDATE TO authenticated USING (EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('cadre', 'admin_national')));
CREATE POLICY "admin_insert_profile" ON profiles FOR INSERT TO authenticated WITH CHECK (EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin_national'));
CREATE POLICY "admin_delete_profile" ON profiles FOR DELETE TO authenticated USING (EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin_national'));

-- --- Politiques RLS pour national_security_code ---
CREATE POLICY "auth_read_nsc" ON national_security_code FOR SELECT TO authenticated USING (true);
CREATE POLICY "admin_update_nsc" ON national_security_code FOR UPDATE TO authenticated USING (EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin_national'));

-- --- Politiques RLS pour nurse_center_affiliations ---
CREATE POLICY "auth_read_nca" ON nurse_center_affiliations FOR SELECT TO authenticated USING (true);
CREATE POLICY "cadre_admin_insert_nca" ON nurse_center_affiliations FOR INSERT TO authenticated WITH CHECK (EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('cadre', 'admin_national')));
CREATE POLICY "cadre_admin_update_nca" ON nurse_center_affiliations FOR UPDATE TO authenticated USING (EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('cadre', 'admin_national')));
CREATE POLICY "cadre_admin_delete_nca" ON nurse_center_affiliations FOR DELETE TO authenticated USING (EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('cadre', 'admin_national')));

-- --- Politiques RLS pour patients ---
CREATE POLICY "auth_read_patients" ON patients FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth_insert_patients" ON patients FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "auth_update_patients" ON patients FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_delete_patients" ON patients FOR DELETE TO authenticated USING (true);

-- --- Politiques RLS pour eligibility_reasons ---
CREATE POLICY "auth_read_er" ON eligibility_reasons FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth_insert_er" ON eligibility_reasons FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "auth_update_er" ON eligibility_reasons FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_delete_er" ON eligibility_reasons FOR DELETE TO authenticated USING (true);

-- --- Politiques RLS pour patient_eligibility_reasons ---
CREATE POLICY "auth_read_per" ON patient_eligibility_reasons FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth_insert_per" ON patient_eligibility_reasons FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "auth_update_per" ON patient_eligibility_reasons FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_delete_per" ON patient_eligibility_reasons FOR DELETE TO authenticated USING (true);

-- --- Politiques RLS pour interruption_reasons ---
CREATE POLICY "auth_read_ir" ON interruption_reasons FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth_insert_ir" ON interruption_reasons FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "auth_update_ir" ON interruption_reasons FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_delete_ir" ON interruption_reasons FOR DELETE TO authenticated USING (true);

-- --- Politiques RLS pour modules ---
CREATE POLICY "auth_read_modules" ON modules FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth_insert_modules" ON modules FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "auth_update_modules" ON modules FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_delete_modules" ON modules FOR DELETE TO authenticated USING (true);

-- --- Politiques RLS pour module_competencies ---
CREATE POLICY "auth_read_mc" ON module_competencies FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth_insert_mc" ON module_competencies FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "auth_update_mc" ON module_competencies FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_delete_mc" ON module_competencies FOR DELETE TO authenticated USING (true);

-- --- Politiques RLS pour training_programs ---
CREATE POLICY "auth_read_tp" ON training_programs FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth_insert_tp" ON training_programs FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "auth_update_tp" ON training_programs FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_delete_tp" ON training_programs FOR DELETE TO authenticated USING (true);

-- --- Politiques RLS pour training_program_modules ---
CREATE POLICY "auth_read_tpm" ON training_program_modules FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth_insert_tpm" ON training_program_modules FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "auth_update_tpm" ON training_program_modules FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_delete_tpm" ON training_program_modules FOR DELETE TO authenticated USING (true);

-- --- Politiques RLS pour sessions ---
CREATE POLICY "auth_read_sessions" ON sessions FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth_insert_sessions" ON sessions FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "auth_update_sessions" ON sessions FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_delete_sessions" ON sessions FOR DELETE TO authenticated USING (true);

-- --- Politiques RLS pour session_results ---
CREATE POLICY "auth_read_sr" ON session_results FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth_insert_sr" ON session_results FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "auth_update_sr" ON session_results FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_delete_sr" ON session_results FOR DELETE TO authenticated USING (true);

-- --- Politiques RLS pour session_competency_validations ---
CREATE POLICY "auth_read_scv" ON session_competency_validations FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth_insert_scv" ON session_competency_validations FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "auth_update_scv" ON session_competency_validations FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_delete_scv" ON session_competency_validations FOR DELETE TO authenticated USING (true);

-- --- Politiques RLS pour program_interruptions ---
CREATE POLICY "auth_read_pi" ON program_interruptions FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth_insert_pi" ON program_interruptions FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "auth_update_pi" ON program_interruptions FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_delete_pi" ON program_interruptions FOR DELETE TO authenticated USING (true);

-- --- Politiques RLS pour codex_words ---
CREATE POLICY "auth_read_cw" ON codex_words FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth_insert_cw" ON codex_words FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "auth_update_cw" ON codex_words FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_delete_cw" ON codex_words FOR DELETE TO authenticated USING (true);

-- --- Politiques RLS pour codex_tests ---
CREATE POLICY "auth_read_ct" ON codex_tests FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth_insert_ct" ON codex_tests FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "auth_update_ct" ON codex_tests FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_delete_ct" ON codex_tests FOR DELETE TO authenticated USING (true);

-- ============================================================
-- PARTIE 4: TRIGGER (updated_at automatique)
-- ============================================================
-- Ce trigger met à jour le champ updated_at automatiquement
-- lors d'une modification d'une ligne dans les tables concernées.

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Appliquer le trigger sur les tables qui ont un champ updated_at
DROP TRIGGER IF EXISTS trigger_profiles_updated_at ON profiles;
CREATE TRIGGER trigger_profiles_updated_at BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS trigger_patients_updated_at ON patients;
CREATE TRIGGER trigger_patients_updated_at BEFORE UPDATE ON patients
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS trigger_modules_updated_at ON modules;
CREATE TRIGGER trigger_modules_updated_at BEFORE UPDATE ON modules
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS trigger_nsc_updated_at ON national_security_code;
CREATE TRIGGER trigger_nsc_updated_at BEFORE UPDATE ON national_security_code
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- PARTIE 5: TRIGGER (création automatique de profil)
-- ============================================================
-- Ce trigger crée automatiquement un profil dans la table profiles
-- quand un nouvel utilisateur s'inscrit via Supabase Auth.

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, name, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'name', 'Nouvel utilisateur'),
    COALESCE(NEW.raw_user_meta_data->>'role', 'ide')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- ============================================================
-- PARTIE 6: AUTH - UTILISATEUR À RECRÉER MANUELLEMENT
-- ============================================================
-- 
-- L'utilisateur suivant existe dans la base:
--   Email: teststestes@test.fr
--   ID:    f69c9702-65a7-4cb3-a1be-de91d7d022a3
--   Rôle:  ide
--
-- IMPORTANT: Les mots de passe ne peuvent pas être exportés
-- depuis Supabase Auth (ils sont hashés de manière irréversible).
-- 
-- Pour recréer cet utilisateur dans un nouveau projet:
-- 1. Allez dans Supabase Dashboard > Authentication > Users
-- 2. Cliquez "Add user" > "Create new user"
-- 3. Email: teststestes@test.fr
-- 4. Définissez un mot de passe
-- 5. Désactivez "Email confirmation" si nécessaire
-- 6. Le trigger "on_auth_user_created" créera automatiquement
--    le profil correspondant dans la table profiles.
--
-- Si vous voulez conserver le même ID (f69c9702-...), vous pouvez
-- utiliser l'API Supabase ou exécuter cette requête SQL après
-- avoir créé l'utilisateur:
--
--   UPDATE profiles SET id = 'f69c9702-65a7-4cb3-a1be-de91d7d022a3'
--   WHERE email = 'teststestes@test.fr';
--
-- ============================================================
-- FIN DE L'EXPORT
-- ============================================================
