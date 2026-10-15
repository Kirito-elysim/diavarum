<?php

namespace App\DataFixtures;

use App\Entity\Center;
use App\Entity\EligibilityReason;
use App\Entity\Module;
use App\Entity\ModuleCompetency;
use App\Entity\NationalSecurityCode;
use App\Entity\Patient;
use App\Entity\TrainingProgram;
use App\Entity\TrainingSession;
use App\Entity\User;
use App\Enum\EligibilityStatus;
use App\Enum\UserRole;
use Doctrine\Bundle\FixturesBundle\Fixture;
use Doctrine\Persistence\ObjectManager;
use Symfony\Component\DependencyInjection\Attribute\Autowire;
use Symfony\Component\PasswordHasher\Hasher\PasswordHasherFactoryInterface;
use Symfony\Component\PasswordHasher\Hasher\UserPasswordHasherInterface;

/**
 * Données de démonstration (dev uniquement) : 2 centres, un compte par profil, quelques patients,
 * et un contenu d'exemple (repris de la maquette Bolt) sur 3 séances : S4, S14 et S17.
 * Le catalogue des séances et les listes de référence viennent des migrations et ne sont pas purgés
 * (voir `make fixtures`).
 *
 * Tous les comptes : mot de passe « Diaverum2026! » — code de sécurité IDE « 1234 », code national « 9999 ».
 */
final class AppFixtures extends Fixture
{
    public const PASSWORD = 'Diaverum2026!';

    public function __construct(
        private readonly UserPasswordHasherInterface $passwordHasher,
        private readonly PasswordHasherFactoryInterface $hasherFactory,
        #[Autowire('%kernel.project_dir%/fixtures/modules.json')]
        private readonly string $modulesFile,
    ) {
    }

    public function load(ObjectManager $manager): void
    {
        $paris = (new Center())->setName('Diaverum Paris Nord')->setCity('Paris')
            ->setFiness('750099999')->setAddress('12 rue de la Chapelle')->setPostalCode('75018')->setRegion('Île-de-France')
            ->setPhone('01 42 00 00 00')->setEmail('paris-nord@diaverum.test')->setStations(24);
        $lyon = (new Center())->setName('Diaverum Lyon Sud')->setCity('Lyon')
            ->setFiness('690099999')->setAddress('45 avenue Jean Jaurès')->setPostalCode('69007')->setRegion('Auvergne-Rhône-Alpes')
            ->setPhone('04 72 00 00 00')->setEmail('lyon-sud@diaverum.test')->setStations(18);
        $manager->persist($paris);
        $manager->persist($lyon);

        $admin = $this->user($manager, 'admin@diaverum.test', 'Sophie', 'Martin', UserRole::AdminNational, []);
        $this->user($manager, 'cadre@diaverum.test', 'Isabelle', 'Blanc', UserRole::Cadre, [$paris]);
        $ideParis = $this->user($manager, 'ide@diaverum.test', 'Claire', 'Dubois', UserRole::Ide, [$paris]);
        $ideLyon = $this->user($manager, 'ide.lyon@diaverum.test', 'Thomas', 'Bernard', UserRole::Ide, [$lyon]);
        $this->user($manager, 'ide.multi@diaverum.test', 'Marie', 'Lefèvre', UserRole::Ide, [$paris, $lyon]);

        $codeHasher = $this->hasherFactory->getPasswordHasher('security_code');
        $manager->persist(new NationalSecurityCode($codeHasher->hash('9999'), $admin));

        $modules = $this->loadModules($manager);

        $jean = $this->patient($manager, 'Jean', 'Dupont', '1948-03-12', $paris, $ideParis, EligibilityStatus::Eligible);
        $this->patient($manager, 'Marie', 'Laurent', '1955-07-24', $paris, $ideParis, EligibilityStatus::Registered);
        $robert = $this->patient($manager, 'Robert', 'Fontaine', '1962-11-02', $lyon, $ideLyon, EligibilityStatus::Eligible);
        $michel = $this->patient($manager, 'Michel', 'Lemaire', '1940-01-30', $lyon, $ideLyon, EligibilityStatus::NotEligible);
        $michel->addEligibilityReason($manager->getRepository(EligibilityReason::class)->findOneBy(['position' => 1]))
            ->setEligibilityNotes('Troubles mnésiques importants, à réévaluer dans 6 mois.');

        // Parcours de Jean Dupont (Paris) et Robert Fontaine (Lyon), avec un historique de séances sur 6 mois
        $this->programWithHistory($manager, $jean, $ideParis, $modules, ['S0' => [5, 100], 'S1' => [4, 80], 'S2' => [3, 67], 'S4' => [2, 75], 'S6' => [1, 90], 'S7' => [0, 60]], 'S8');
        $this->programWithHistory($manager, $robert, $ideLyon, $modules, ['S0' => [4, 100], 'S1' => [3, 100], 'S3' => [1, 50], 'S5' => [0, 83]], null);

        $manager->flush();
    }

    /**
     * Parcours avec des séances validées dans le passé ($history : code => [il y a N mois, score]),
     * et éventuellement une séance en cours ($inProgress).
     *
     * @param list<Module>                   $modules
     * @param array<string, array{int, int}> $history
     */
    private function programWithHistory(ObjectManager $manager, Patient $patient, User $nurse, array $modules, array $history, ?string $inProgress): void
    {
        $program = (new TrainingProgram())->setPatient($patient);
        $program->setAuthor($nurse);
        foreach ($modules as $module) {
            $program->addModule($module);
        }
        $manager->persist($program);

        $byCode = [];
        foreach ($modules as $module) {
            $byCode[$module->getCode()] = $module;
        }

        foreach ($history as $code => [$monthsAgo, $score]) {
            $startedAt = (new \DateTimeImmutable("-$monthsAgo months"))->setTime(10 + $monthsAgo, 15)->modify('-'.min(20, 3 * $monthsAgo).' days');
            $duration = 1800 + 60 * ($score % 11);
            $session = (new TrainingSession())->setPatient($patient)->setModule($byCode[$code])->setProgram($program)->backdate($startedAt);
            $session->setAuthor($nurse);
            $session->markValidated($duration, $score, []);
            $session->setCompletedAt($startedAt->modify("+$duration seconds"));
            $manager->persist($session);
            $program->findModule($byCode[$code])->markValidated($score, $duration, $startedAt->modify("+$duration seconds"));
        }

        if (null !== $inProgress) {
            $session = (new TrainingSession())->setPatient($patient)->setModule($byCode[$inProgress])->setProgram($program)->backdate(new \DateTimeImmutable('-12 minutes'));
            $session->setAuthor($nurse);
            $manager->persist($session);
            $program->findModule($byCode[$inProgress])->markStarted(new \DateTimeImmutable('-12 minutes'));
        }

        $program->markActive();
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
        $patient = (new Patient())
            ->setFirstName($firstName)
            ->setLastName($lastName)
            ->setDateOfBirth(new \DateTimeImmutable($birth))
            ->setCenter($center)
            ->setEligibilityStatus($status);
        $patient->setAuthor($nurse);
        $manager->persist($patient);

        return $patient;
    }

    /**
     * Contenu d'exemple sur des séances du catalogue officiel (le contenu réel sera intégré par le prestataire).
     *
     * @return list<Module> séances publiées, dans l'ordre du parcours
     */
    private function loadModules(ObjectManager $manager): array
    {
        $repository = $manager->getRepository(Module::class);

        foreach (json_decode((string) file_get_contents($this->modulesFile), true, flags: \JSON_THROW_ON_ERROR) as $data) {
            $module = $repository->findOneBy(['code' => $data['code']])
                ?? throw new \RuntimeException(\sprintf('Séance %s absente du catalogue : lancez les migrations.', $data['code']));
            $module->setContent($data['content']);

            foreach ($data['competencies'] as $position => $label) {
                $manager->persist((new ModuleCompetency())->setModule($module)->setLabel($label)->setPosition($position));
            }
        }

        return $repository->findBy(['published' => true], ['position' => 'ASC']);
    }
}
