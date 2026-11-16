<?php

namespace App\Controller;

use App\Dto\ConfirmPasswordRequest;
use App\Dto\SetSecurityCodeRequest;
use App\Dto\VerifySecurityCodeRequest;
use App\Entity\User;
use App\EventListener\AccessLogSubscriber;
use App\Service\SecurityCodeManager;
use Symfony\Component\DependencyInjection\Attribute\Target;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\HttpKernel\Attribute\MapRequestPayload;
use Symfony\Component\HttpKernel\Exception\AccessDeniedHttpException;
use Symfony\Component\HttpKernel\Exception\ConflictHttpException;
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
    public function setOwnCode(#[CurrentUser] User $user, #[MapRequestPayload(acceptFormat: ['json', 'jsonld'])] SetSecurityCodeRequest $request): Response
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
        #[MapRequestPayload(acceptFormat: ['json', 'jsonld'])] VerifySecurityCodeRequest $request,
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

    /** Un administrateur national change le code garde-fou (les autres en sont avertis à leur connexion) */
    #[Route('/api/national-security-code', name: 'api_national_security_code', methods: ['PUT'])]
    #[IsGranted('ROLE_ADMIN_NATIONAL')]
    public function setNationalCode(#[CurrentUser] User $user, #[MapRequestPayload(acceptFormat: ['json', 'jsonld'])] SetSecurityCodeRequest $request): Response
    {
        $this->assertPassword($user, $request->password);
        $this->securityCodes->changeNationalCode($request->code, $user);

        return new Response(null, Response::HTTP_NO_CONTENT);
    }

    /** État du code national pour l'administrateur connecté (jamais le code lui-même) */
    #[Route('/api/national-security-code', name: 'api_national_security_code_status', methods: ['GET'])]
    #[IsGranted('ROLE_ADMIN_NATIONAL')]
    public function nationalCodeStatus(#[CurrentUser] User $user): JsonResponse
    {
        return $this->noStore(new JsonResponse($this->securityCodes->nationalCodeStatus($user)));
    }

    /** Affiche le code national à un administrateur national, après confirmation de son mot de passe (tracé, 5 essais / 15 min) */
    #[Route('/api/national-security-code/reveal', name: 'api_national_security_code_reveal', methods: ['POST'])]
    #[IsGranted('ROLE_ADMIN_NATIONAL')]
    public function revealNationalCode(
        #[CurrentUser] User $user,
        #[MapRequestPayload(acceptFormat: ['json', 'jsonld'])] ConfirmPasswordRequest $request,
        Request $httpRequest,
        #[Target('security_code')] RateLimiterFactoryInterface $limiterFactory,
    ): JsonResponse {
        $limiter = $limiterFactory->create('reveal-'.$user->getId()->toRfc4122());
        $limit = $limiter->consume();
        if (!$limit->isAccepted()) {
            throw new TooManyRequestsHttpException($limit->getRetryAfter()->getTimestamp() - time(), 'Trop de tentatives, réessayez plus tard.');
        }
        $this->assertPassword($user, $request->password);
        $limiter->reset();

        $code = $this->securityCodes->revealNationalCode($user);
        if (null === $code) {
            throw new ConflictHttpException('Le code national ne peut pas être affiché : un administrateur national doit le redéfinir.');
        }
        $httpRequest->attributes->set(AccessLogSubscriber::OVERRIDE, [
            'action' => 'action',
            'resourceType' => 'national_security_code',
            'resourceId' => null,
            'detail' => 'Code national affiché',
        ]);

        return $this->noStore(new JsonResponse(['code' => $code]));
    }

    /** L'administrateur national a pris connaissance du changement de code (sans l'afficher) */
    #[Route('/api/national-security-code/acknowledge', name: 'api_national_security_code_acknowledge', methods: ['POST'])]
    #[IsGranted('ROLE_ADMIN_NATIONAL')]
    public function acknowledgeNationalCode(#[CurrentUser] User $user): Response
    {
        $this->securityCodes->acknowledgeNationalChange($user);

        return new Response(null, Response::HTTP_NO_CONTENT);
    }

    private function noStore(JsonResponse $response): JsonResponse
    {
        $response->headers->set('Cache-Control', 'no-store, private');

        return $response;
    }

    private function assertPassword(User $user, string $password): void
    {
        if (!$this->passwordHasher->isPasswordValid($user, $password)) {
            throw new AccessDeniedHttpException('Mot de passe incorrect.');
        }
    }
}
