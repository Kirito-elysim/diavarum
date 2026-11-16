<?php

namespace App\Controller;

use ApiPlatform\Validator\Exception\ValidationException;
use App\Dto\UpdateProfileRequest;
use App\Entity\RefreshToken;
use App\Entity\User;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\HttpKernel\Attribute\MapRequestPayload;
use Symfony\Component\HttpKernel\Exception\AccessDeniedHttpException;
use Symfony\Component\PasswordHasher\Hasher\UserPasswordHasherInterface;
use Symfony\Component\Routing\Attribute\Route;
use Symfony\Component\Security\Http\Attribute\CurrentUser;
use Symfony\Component\Validator\ConstraintViolation;
use Symfony\Component\Validator\ConstraintViolationList;

/**
 * Modification de son propre compte : nom, prénom, email, mot de passe.
 * Le rôle et les centres restent gérés par un cadre ou un administrateur.
 * Un changement d'email ou de mot de passe ferme les sessions du compte (reconnexion demandée).
 */
final class ProfileController
{
    public function __construct(
        private readonly EntityManagerInterface $entityManager,
        private readonly UserPasswordHasherInterface $passwordHasher,
    ) {
    }

    #[Route('/api/me', name: 'api_me_update', methods: ['PATCH'])]
    public function __invoke(#[CurrentUser] User $user, #[MapRequestPayload(acceptFormat: ['json', 'jsonld'])] UpdateProfileRequest $request): Response
    {
        if (!$this->passwordHasher->isPasswordValid($user, $request->currentPassword)) {
            throw new AccessDeniedHttpException('Mot de passe actuel incorrect.');
        }

        $previousEmail = $user->getEmail();
        $user->setFirstName(trim($request->firstName))->setLastName(trim($request->lastName))->setEmail($request->email);

        $taken = $this->entityManager->getRepository(User::class)->findOneBy(['email' => $user->getEmail()]);
        if ($taken && !$taken->getId()->equals($user->getId())) {
            throw new ValidationException(new ConstraintViolationList([new ConstraintViolation('Cet email est déjà utilisé.', null, [], $request, 'email', $request->email)]));
        }

        $credentialsChanged = $previousEmail !== $user->getEmail() || null !== $request->newPassword;
        if (null !== $request->newPassword) {
            $user->setPassword($this->passwordHasher->hashPassword($user, $request->newPassword));
        }
        if ($credentialsChanged) {
            $this->entityManager->createQueryBuilder()
                ->delete(RefreshToken::class, 't')
                ->where('t.username IN (:identifiers)')
                ->setParameter('identifiers', array_unique([$previousEmail, $user->getEmail()]))
                ->getQuery()
                ->execute();
        }
        $this->entityManager->flush();

        return new Response(null, Response::HTTP_NO_CONTENT);
    }
}
