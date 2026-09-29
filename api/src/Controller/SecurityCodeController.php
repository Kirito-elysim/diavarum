<?php

namespace App\Controller;

use App\Dto\SetSecurityCodeRequest;
use App\Dto\VerifySecurityCodeRequest;
use App\Entity\User;
use App\Service\SecurityCodeManager;
use Symfony\Component\DependencyInjection\Attribute\Target;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\HttpKernel\Attribute\MapRequestPayload;
use Symfony\Component\HttpKernel\Exception\AccessDeniedHttpException;
use Symfony\Component\HttpKernel\Exception\TooManyRequestsHttpException;
use Symfony\Component\PasswordHasher\Hasher\UserPasswordHasherInterface;
use Symfony\Component\RateLimiter\RateLimiterFactoryInterface;
use Symfony\Component\Routing\Attribute\Route;
use Symfony\Component\Security\Http\Attribute\CurrentUser;
use Symfony\Component\Security\Http\Attribute\IsGranted;

/**
 * Codes de sécurité demandés pour passer d'une séance patient au back office.
 */
final class SecurityCodeController
{
    public function __construct(
        private readonly SecurityCodeManager $securityCodes,
        private readonly UserPasswordHasherInterface $passwordHasher,
    ) {
    }

    /** L'IDE définit (première connexion) ou change son code personnel */
    #[Route('/api/me/security-code', name: 'api_me_security_code', methods: ['PUT'])]
    public function setOwnCode(#[CurrentUser] User $user, #[MapRequestPayload] SetSecurityCodeRequest $request): Response
    {
        $this->assertPassword($user, $request->password);
        $this->securityCodes->setUserCode($user, $request->code);

        return new Response(null, Response::HTTP_NO_CONTENT);
    }

    /**
     * Vérifie le code saisi sur la tablette (code de l'IDE connectée ou code national).
     * 204 si correct, 403 sinon, 429 après 5 échecs en 15 minutes.
     */
    #[Route('/api/security-code/verify', name: 'api_security_code_verify', methods: ['POST'])]
    public function verify(
        #[CurrentUser] User $user,
        #[MapRequestPayload] VerifySecurityCodeRequest $request,
        #[Target('security_code')] RateLimiterFactoryInterface $limiterFactory,
    ): Response {
        $limiter = $limiterFactory->create($user->getId()->toRfc4122());
        $limit = $limiter->consume();
        if (!$limit->isAccepted()) {
            throw new TooManyRequestsHttpException($limit->getRetryAfter()->getTimestamp() - time(), 'Trop de tentatives, réessayez plus tard.');
        }

        if (!$this->securityCodes->verify($user, $request->code)) {
            throw new AccessDeniedHttpException('Code de sécurité incorrect.');
        }

        $limiter->reset();

        return new Response(null, Response::HTTP_NO_CONTENT);
    }

    /** Un administrateur national change le code garde-fou (transmis par email aux autres administrateurs) */
    #[Route('/api/national-security-code', name: 'api_national_security_code', methods: ['PUT'])]
    #[IsGranted('ROLE_ADMIN_NATIONAL')]
    public function setNationalCode(#[CurrentUser] User $user, #[MapRequestPayload] SetSecurityCodeRequest $request): Response
    {
        $this->assertPassword($user, $request->password);
        $this->securityCodes->changeNationalCode($request->code, $user);

        return new Response(null, Response::HTTP_NO_CONTENT);
    }

    private function assertPassword(User $user, string $password): void
    {
        if (!$this->passwordHasher->isPasswordValid($user, $password)) {
            throw new AccessDeniedHttpException('Mot de passe incorrect.');
        }
    }
}
