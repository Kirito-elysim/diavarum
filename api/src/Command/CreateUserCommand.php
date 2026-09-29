<?php

namespace App\Command;

use App\Entity\Center;
use App\Entity\User;
use App\Enum\UserRole;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Component\Console\Attribute\Argument;
use Symfony\Component\Console\Attribute\AsCommand;
use Symfony\Component\Console\Attribute\Option;
use Symfony\Component\Console\Command\Command;
use Symfony\Component\Console\Style\SymfonyStyle;
use Symfony\Component\PasswordHasher\Hasher\UserPasswordHasherInterface;
use Symfony\Component\Validator\Validator\ValidatorInterface;

/**
 * Crée un compte en ligne de commande — indispensable pour le premier administrateur national
 * d'un environnement (il n'y a pas d'inscription publique).
 *
 *   bin/console app:user:create admin@diaverum.fr Prénom Nom --role=admin_national
 */
#[AsCommand(name: 'app:user:create', description: 'Crée un compte IDE, cadre ou administrateur national')]
final class CreateUserCommand
{
    public function __construct(
        private readonly EntityManagerInterface $entityManager,
        private readonly UserPasswordHasherInterface $passwordHasher,
        private readonly ValidatorInterface $validator,
    ) {
    }

    /**
     * @param list<string> $center
     */
    public function __invoke(
        SymfonyStyle $io,
        #[Argument('Adresse email (identifiant de connexion)')] string $email,
        #[Argument('Prénom')] string $firstName,
        #[Argument('Nom')] string $lastName,
        #[Option('ide, cadre ou admin_national')] string $role = 'ide',
        #[Option('Identifiant (UUID) d\'un centre d\'affiliation, répétable')] array $center = [],
    ): int {
        $userRole = UserRole::tryFrom($role);
        if (null === $userRole) {
            $io->error('Rôle inconnu : utilisez ide, cadre ou admin_national.');

            return Command::INVALID;
        }

        $user = (new User())
            ->setEmail($email)
            ->setFirstName($firstName)
            ->setLastName($lastName)
            ->setRole($userRole);

        foreach ($center as $centerId) {
            $entity = $this->entityManager->find(Center::class, $centerId);
            if (null === $entity) {
                $io->error(\sprintf('Centre introuvable : %s', $centerId));

                return Command::FAILURE;
            }
            $user->addCenter($entity);
        }

        $user->setPlainPassword((string) $io->askHidden('Mot de passe (12 caractères minimum)'));

        $violations = $this->validator->validate($user, null, ['Default', 'user:create']);
        if (\count($violations) > 0) {
            foreach ($violations as $violation) {
                $io->error(\sprintf('%s : %s', $violation->getPropertyPath(), $violation->getMessage()));
            }

            return Command::FAILURE;
        }

        $user->setPassword($this->passwordHasher->hashPassword($user, (string) $user->getPlainPassword()));
        $user->setPlainPassword(null);

        $this->entityManager->persist($user);
        $this->entityManager->flush();

        $io->success(\sprintf('Compte %s créé pour %s.', $userRole->value, $user->getEmail()));

        return Command::SUCCESS;
    }
}
