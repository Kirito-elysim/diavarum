<?php

namespace App\State;

use ApiPlatform\Metadata\Operation;
use ApiPlatform\State\ProcessorInterface;
use App\Entity\Center;
use App\Entity\User;
use App\Enum\UserRole;
use Doctrine\ORM\PersistentCollection;
use Symfony\Bundle\SecurityBundle\Security;
use Symfony\Component\DependencyInjection\Attribute\Autowire;
use Symfony\Component\HttpKernel\Exception\AccessDeniedHttpException;
use Symfony\Component\PasswordHasher\Hasher\UserPasswordHasherInterface;

/**
 * Création / modification d'un compte :
 * - hache le mot de passe fourni ;
 * - applique la hiérarchie : un cadre ne crée que des IDE, et ne les affilie
 *   (ou désaffilie) qu'à ses propres centres.
 *
 * @implements ProcessorInterface<User, User>
 */
final class UserProcessor implements ProcessorInterface
{
    /**
     * @param ProcessorInterface<User, User> $persistProcessor
     */
    public function __construct(
        #[Autowire(service: 'api_platform.doctrine.orm.state.persist_processor')]
        private readonly ProcessorInterface $persistProcessor,
        private readonly UserPasswordHasherInterface $passwordHasher,
        private readonly Security $security,
    ) {
    }

    public function process(mixed $data, Operation $operation, array $uriVariables = [], array $context = []): User
    {
        $me = $this->security->getUser();
        if (!$me instanceof User) {
            throw new AccessDeniedHttpException();
        }

        if (!$this->security->isGranted('ROLE_ADMIN_NATIONAL')) {
            $this->enforceCadreLimits($me, $data);
        }

        if (null !== $data->getPlainPassword()) {
            $data->setPassword($this->passwordHasher->hashPassword($data, $data->getPlainPassword()));
            $data->setPlainPassword(null);
        }

        return $this->persistProcessor->process($data, $operation, $uriVariables, $context);
    }

    private function enforceCadreLimits(User $cadre, User $target): void
    {
        if (UserRole::Ide !== $target->getRole()) {
            throw new AccessDeniedHttpException('Un cadre de service ne peut gérer que des profils IDE.');
        }

        $centers = $target->getCenters();
        $before = $centers instanceof PersistentCollection ? $centers->getSnapshot() : [];
        $after = $centers->toArray();

        foreach ($this->changedCenters($before, $after) as $center) {
            if (!$cadre->isAffiliatedTo($center)) {
                throw new AccessDeniedHttpException(\sprintf('Vous n\'êtes pas affilié au centre « %s ».', $center->getName()));
            }
        }
    }

    /**
     * @param array<Center> $before
     * @param array<Center> $after
     *
     * @return list<Center> centres ajoutés ou retirés
     */
    private function changedCenters(array $before, array $after): array
    {
        $index = static fn (array $centers): array => array_combine(
            array_map(static fn (Center $c) => $c->getId()->toRfc4122(), $centers),
            $centers,
        );
        $before = $index($before);
        $after = $index($after);

        return array_values(array_diff_key($after, $before) + array_diff_key($before, $after));
    }
}
