<?php

namespace App\Import;

use App\Entity\Center;
use App\Entity\User;
use App\Enum\UserRole;
use App\Security\TemporaryPasswordGenerator;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Component\HttpFoundation\File\UploadedFile;
use Symfony\Component\PasswordHasher\Hasher\UserPasswordHasherInterface;
use Symfony\Component\Validator\Validator\ValidatorInterface;

/**
 * Import d'utilisateurs en masse, avec mot de passe provisoire généré pour chacun.
 * - administrateur national : tous les profils, tous les centres actifs ;
 * - cadre de service : uniquement des IDE, uniquement dans ses centres.
 * L'import est « tout ou rien » ; les mots de passe ne sont renvoyés qu'une fois, à la création.
 */
final class UserImporter
{
    public const COLUMNS = [
        'lastName' => ['nom'],
        'firstName' => ['prenom'],
        'email' => ['email', 'mail', 'courriel', 'adresse email'],
        'role' => ['role', 'profil'],
        'centers' => ['centres', 'centre', 'centres de rattachement'],
    ];
    public const REQUIRED = ['lastName', 'firstName', 'email'];

    public const ROLE_LABELS = [
        'IDE' => UserRole::Ide,
        'Cadre de service' => UserRole::Cadre,
        'Administrateur national' => UserRole::AdminNational,
    ];
    private const ROLE_ALIASES = [
        'ide' => UserRole::Ide, 'infirmier' => UserRole::Ide, 'infirmiere' => UserRole::Ide, 'idel' => UserRole::Ide,
        'cadre' => UserRole::Cadre, 'cadre de service' => UserRole::Cadre, 'cadre de sante' => UserRole::Cadre,
        'administrateur national' => UserRole::AdminNational, 'administrateur' => UserRole::AdminNational,
        'admin' => UserRole::AdminNational, 'admin national' => UserRole::AdminNational,
    ];

    public function __construct(
        private readonly SpreadsheetReader $reader,
        private readonly ValidatorInterface $validator,
        private readonly EntityManagerInterface $entityManager,
        private readonly UserPasswordHasherInterface $passwordHasher,
        private readonly TemporaryPasswordGenerator $passwords,
        private readonly CenterResolver $centers,
    ) {
    }

    /**
     * @param Center|null $defaultCenter centre appliqué aux lignes sans centre (fiche centre, cadre mono-centre)
     *
     * @return array{valid: bool, rows: list<array{line: int, label: string, errors: list<string>}>, created: int, credentials: list<array{name: string, email: string, role: string, password: string}>}
     */
    public function import(UploadedFile $file, User $actor, ?Center $defaultCenter, bool $commit): array
    {
        $isAdmin = UserRole::AdminNational === $actor->getRole();
        $allowed = $this->centers->allowedCenters($actor);
        if (null === $defaultCenter && !$isAdmin && 1 === \count($allowed)) {
            $defaultCenter = $allowed[0];
        }
        $findCenter = $this->centers->matcher($allowed);

        $report = [];
        $users = [];
        $seenEmails = [];
        foreach ($this->reader->read($file, self::COLUMNS, self::REQUIRED) as ['line' => $line, 'values' => $v]) {
            $errors = [];
            $user = (new User())
                ->setLastName($v['lastName'] ?? '')
                ->setFirstName($v['firstName'] ?? '')
                ->setEmail(mb_strtolower($v['email'] ?? ''));

            $roleLabel = $v['role'] ?? '';
            $role = '' === $roleLabel ? UserRole::Ide : (self::ROLE_ALIASES[SpreadsheetReader::normalize($roleLabel)] ?? null);
            if (null === $role) {
                $errors[] = \sprintf('Rôle « %s » inconnu : IDE, Cadre de service ou Administrateur national.', $roleLabel);
                $role = UserRole::Ide;
            } elseif (!$isAdmin && UserRole::Ide !== $role) {
                $errors[] = 'Un cadre de service ne peut importer que des IDE.';
            }
            $user->setRole($role);

            if (UserRole::AdminNational !== $role) {
                $names = array_filter(array_map('trim', preg_split('/[;\n|]+/', $v['centers'] ?? '') ?: []));
                foreach ($names as $name) {
                    $center = $findCenter($name);
                    null === $center
                        ? $errors[] = \sprintf('Centre « %s » introuvable%s.', $name, $isAdmin ? '' : ' ou hors de votre périmètre')
                        : $user->addCenter($center);
                }
                if ([] === $names && null !== $defaultCenter) {
                    $user->addCenter($defaultCenter);
                }
            }

            $password = $this->passwords->generate();
            $user->setPlainPassword($password);
            foreach ($this->validator->validate($user, null, ['Default', 'user:create']) as $violation) {
                $errors[] = self::label($violation->getPropertyPath()).' : '.$violation->getMessage();
            }
            $email = $user->getEmail();
            if ('' !== $email && isset($seenEmails[$email])) {
                $errors[] = \sprintf('Email déjà présent ligne %d.', $seenEmails[$email]);
            }
            $seenEmails[$email] ??= $line;

            $report[] = [
                'line' => $line,
                'label' => trim(mb_strtoupper($user->getLastName()).' '.$user->getFirstName()).('' !== $email ? " ($email)" : ''),
                'errors' => array_values(array_unique($errors)),
            ];
            $users[] = [$user, $password];
        }

        $valid = [] === array_filter($report, static fn (array $r) => [] !== $r['errors']);
        $credentials = [];
        if ($commit && $valid) {
            $this->entityManager->wrapInTransaction(function () use ($users, &$credentials): void {
                foreach ($users as [$user, $password]) {
                    $user->setPassword($this->passwordHasher->hashPassword($user, $password))->setPlainPassword(null);
                    $this->entityManager->persist($user);
                    $credentials[] = [
                        'name' => $user->getFirstName().' '.$user->getLastName(),
                        'email' => $user->getEmail(),
                        'role' => (string) array_search($user->getRole(), self::ROLE_LABELS, true),
                        'password' => $password,
                    ];
                }
            });
        }

        return ['valid' => $valid, 'rows' => $report, 'created' => \count($credentials), 'credentials' => $credentials];
    }

    private static function label(string $property): string
    {
        return match ($property) {
            'lastName' => 'Nom', 'firstName' => 'Prénom', 'email' => 'Email', 'centers' => 'Centres',
            'role' => 'Rôle', 'plainPassword' => 'Mot de passe', default => $property,
        };
    }
}
