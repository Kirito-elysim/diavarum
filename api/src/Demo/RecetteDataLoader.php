<?php

namespace App\Demo;

use App\Entity\Center;
use App\Entity\EligibilityReason;
use App\Entity\InterruptionReason;
use App\Entity\Module;
use App\Entity\NationalSecurityCode;
use App\Entity\Patient;
use App\Entity\TrainingProgram;
use App\Entity\TrainingSession;
use App\Entity\User;
use App\Enum\EligibilityStatus;
use App\Enum\UserRole;
use Doctrine\Persistence\ObjectManager;
use Symfony\Component\PasswordHasher\Hasher\PasswordHasherFactoryInterface;
use Symfony\Component\PasswordHasher\Hasher\UserPasswordHasherInterface;

/**
 * Base de recette fictive (lot 5) : trois centres, tous les rôles, patients éligibles, non éligibles, en attente et archivés,
 * parcours aux quatre statuts (non démarré, en cours, inactif, achevé) et un interrompu, séances étalées sur deux mois,
 * cours sans note, post-test et ancienne validation répétée. Toutes les dates sont relatives à $now : les résultats
 * attendus (voir RECETTE_BASE_FICTIVE.md et RecetteDatasetTest) restent vrais quel que soit le jour du chargement.
 * Le catalogue des séances et les listes de référence viennent des migrations.
 *
 * Tous les comptes : mot de passe « Recette2026! », code de sécurité IDE « 1234 », code national « 9999 ».
 */
final class RecetteDataLoader
{
    public const PASSWORD = 'Recette2026!';

    public function __construct(
        private readonly UserPasswordHasherInterface $passwordHasher,
        private readonly PasswordHasherFactoryInterface $hasherFactory,
    ) {
    }

    public function load(ObjectManager $manager, \DateTimeImmutable $now): void
    {
        $paris = $this->center($manager, 'Recette Paris', 'Paris');
        $lyon = $this->center($manager, 'Recette Lyon', 'Lyon');
        $nice = $this->center($manager, 'Recette Nice', 'Nice');

        $admin = $this->user($manager, 'recette.admin@diaverum.test', 'Nadia', 'National', UserRole::AdminNational, []);
        $manager->persist(new NationalSecurityCode($this->hasherFactory->getPasswordHasher('security_code')->hash('9999'), $admin));
        $cadreParis = $this->user($manager, 'recette.cadre.paris@diaverum.test', 'Camille', 'CadreParis', UserRole::Cadre, [$paris]);
        $this->user($manager, 'recette.cadre.lyon@diaverum.test', 'Lucas', 'CadreLyon', UserRole::Cadre, [$lyon]);
        $ideA = $this->user($manager, 'recette.ide.paris.a@diaverum.test', 'Alix', 'IdeParisA', UserRole::Ide, [$paris]);
        $ideB = $this->user($manager, 'recette.ide.paris.b@diaverum.test', 'Basile', 'IdeParisB', UserRole::Ide, [$paris]);
        $ideLyon = $this->user($manager, 'recette.ide.lyon@diaverum.test', 'Lou', 'IdeLyon', UserRole::Ide, [$lyon]);
        $this->user($manager, 'recette.ide.nice@diaverum.test', 'Noa', 'IdeNice', UserRole::Ide, [$nice]);

        $modules = [];
        foreach (['S1', 'S2', 'S3', 'PT'] as $code) {
            $modules[$code] = $manager->getRepository(Module::class)->findOneBy(['code' => $code])
                ?? throw new \RuntimeException(\sprintf('Séance %s absente du catalogue : lancez les migrations.', $code));
        }
        $day = static fn (int $daysAgo): \DateTimeImmutable => $now->modify("-$daysAgo days");

        // Paris — P1 achevé (clôturé il y a 40 jours) : S1 validé deux fois (ancienne répétition 30 %, puis 80 %), S3 sans note, post-test à 70
        $p1 = $this->patient($manager, 'Alice', 'Achevée', '1950-01-10', $paris, $ideA, EligibilityStatus::Eligible);
        $program = $this->program($manager, $p1, $ideA, ['S1', 'S2', 'S3', 'PT'], $modules);
        $this->session($manager, $program, $modules['S1'], $ideA, $day(58), 30, 700);
        $this->validated($manager, $program, $modules['S1'], $ideA, $day(55), 80, 600);
        $this->validated($manager, $program, $modules['S2'], $ideA, $day(50), 60, 900);
        $this->validated($manager, $program, $modules['S3'], $ideA, $day(45), null, 300);
        $this->validated($manager, $program, $modules['PT'], $ideA, $day(42), 70, 0);
        $program->markCompleted($cadreParis);
        $program->setCompletedAt($day(40));

        // P2 en cours : S1 il y a 20 jours (100 %), S2 il y a 3 jours (50 %)
        $p2 = $this->patient($manager, 'Bruno', 'EnCours', '1951-02-11', $paris, $ideB, EligibilityStatus::Eligible);
        $program = $this->program($manager, $p2, $ideB, ['S1', 'S2', 'S3', 'PT'], $modules);
        $this->validated($manager, $program, $modules['S1'], $ideB, $day(20), 100, 700);
        $this->validated($manager, $program, $modules['S2'], $ideB, $day(3), 50, 500);
        $program->markActive();

        // P3 inactif : dernière activité il y a 20 jours (plus de 15 jours)
        $p3 = $this->patient($manager, 'Carla', 'Inactive', '1952-03-12', $paris, $ideA, EligibilityStatus::Eligible);
        $program = $this->program($manager, $p3, $ideA, ['S1', 'S2'], $modules);
        $this->validated($manager, $program, $modules['S1'], $ideA, $day(20), 40, 400);
        $program->markActive();

        // P4 non démarré : parcours créé, aucune séance
        $p4 = $this->patient($manager, 'David', 'NonDemarre', '1953-04-13', $paris, $ideB, EligibilityStatus::Eligible);
        $this->program($manager, $p4, $ideB, ['S1', 'S2'], $modules);

        // P5 interrompu (clôture anticipée, motif « arrêt temporaire pour raisons médicales ») : S1 il y a 32 jours (90 %)
        $p5 = $this->patient($manager, 'Emma', 'Interrompue', '1954-05-14', $paris, $ideB, EligibilityStatus::Eligible);
        $program = $this->program($manager, $p5, $ideB, ['S1', 'S2'], $modules);
        $this->validated($manager, $program, $modules['S1'], $ideB, $day(32), 90, 800);
        $program->markActive();
        $program->markInterrupted($cadreParis, [$manager->getRepository(InterruptionReason::class)->findOneBy(['position' => 2])], 'Recette');

        // P6 non éligible (avec motif), P7 en attente de décision
        $p6 = $this->patient($manager, 'Félix', 'NonEligible', '1955-06-15', $paris, $ideA, EligibilityStatus::NotEligible);
        $p6->addEligibilityReason($manager->getRepository(EligibilityReason::class)->findOneBy(['position' => 1]));
        $this->patient($manager, 'Gaëlle', 'EnAttente', '1956-07-16', $paris, $ideB, EligibilityStatus::Registered);

        // P8 archivé : parcours en cours avec une séance à 100 % il y a 10 jours, hors de tous les indicateurs
        $p8 = $this->patient($manager, 'Hugo', 'Archivé', '1957-08-17', $paris, $ideA, EligibilityStatus::Eligible);
        $program = $this->program($manager, $p8, $ideA, ['S1', 'S2'], $modules);
        $this->validated($manager, $program, $modules['S1'], $ideA, $day(10), 100, 600);
        $program->markActive();
        $p8->archive();

        // Lyon : L1 en cours (S1 il y a 5 jours, 70 %), L2 en attente, L3 archivé
        $l1 = $this->patient($manager, 'Inès', 'LyonEnCours', '1958-09-18', $lyon, $ideLyon, EligibilityStatus::Eligible);
        $program = $this->program($manager, $l1, $ideLyon, ['S1', 'S2'], $modules);
        $this->validated($manager, $program, $modules['S1'], $ideLyon, $day(5), 70, 500);
        $program->markActive();
        $this->patient($manager, 'Jules', 'LyonEnAttente', '1959-10-19', $lyon, $ideLyon, EligibilityStatus::Registered);
        $this->patient($manager, 'Karim', 'LyonArchivé', '1960-11-20', $lyon, $ideLyon, EligibilityStatus::Registered)->archive();

        // Nice : un patient non éligible
        $this->patient($manager, 'Léa', 'NiceNonEligible', '1961-12-21', $nice, $this->user($manager, 'recette.cadre.nice@diaverum.test', 'Nina', 'CadreNice', UserRole::Cadre, [$nice]), EligibilityStatus::NotEligible);

        $manager->flush();
    }

    private function center(ObjectManager $manager, string $name, string $city): Center
    {
        $center = (new Center())->setName($name)->setCity($city);
        $manager->persist($center);

        return $center;
    }

    /**
     * @param list<Center> $centers
     */
    private function user(ObjectManager $manager, string $email, string $firstName, string $lastName, UserRole $role, array $centers): User
    {
        $user = (new User())->setEmail($email)->setFirstName($firstName)->setLastName($lastName)->setRole($role);
        foreach ($centers as $center) {
            $user->addCenter($center);
        }
        $user->setPassword($this->passwordHasher->hashPassword($user, self::PASSWORD));
        if (UserRole::AdminNational !== $role) {
            $user->setSecurityCodeHash($this->hasherFactory->getPasswordHasher('security_code')->hash('1234'));
        }
        $manager->persist($user);

        return $user;
    }

    private function patient(ObjectManager $manager, string $firstName, string $lastName, string $birth, Center $center, User $nurse, EligibilityStatus $status): Patient
    {
        $patient = (new Patient())->setFirstName($firstName)->setLastName($lastName)->setDateOfBirth(new \DateTimeImmutable($birth))
            ->setCenter($center)->setEligibilityStatus($status);
        $patient->setAuthor($nurse);
        $manager->persist($patient);

        return $patient;
    }

    /**
     * @param list<string>          $codes
     * @param array<string, Module> $modules
     */
    private function program(ObjectManager $manager, Patient $patient, User $nurse, array $codes, array $modules): TrainingProgram
    {
        $program = (new TrainingProgram())->setPatient($patient);
        $program->setAuthor($nurse);
        foreach ($codes as $code) {
            $program->addModule($modules[$code]);
        }
        $manager->persist($program);

        return $program;
    }

    /** Séance validée d'un cours : séance, suivi du parcours et date de dernière activité */
    private function validated(ObjectManager $manager, TrainingProgram $program, Module $module, User $nurse, \DateTimeImmutable $at, ?int $score, int $duration): void
    {
        $this->session($manager, $program, $module, $nurse, $at, $score, $duration);
        $program->findModule($module)->markValidated($score, $duration, $at);
        $program->recordActivity($at);
        $program->setStartedAt($program->getStartedAt() ?? $at->modify("-$duration seconds"));
    }

    private function session(ObjectManager $manager, TrainingProgram $program, Module $module, User $nurse, \DateTimeImmutable $at, ?int $score, int $duration): void
    {
        $session = (new TrainingSession())->setPatient($program->getPatient())->setModule($module)->setProgram($program)->backdate($at->modify("-$duration seconds"));
        $session->setAuthor($nurse);
        $session->markValidated($duration, $score, []);
        $session->setCompletedAt($at);
        $manager->persist($session);
    }
}
