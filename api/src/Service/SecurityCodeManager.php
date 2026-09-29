<?php

namespace App\Service;

use App\Entity\NationalSecurityCode;
use App\Entity\User;
use App\Enum\UserRole;
use App\Repository\UserRepository;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Component\DependencyInjection\Attribute\Autowire;
use Symfony\Component\Mailer\MailerInterface;
use Symfony\Component\Mime\Email;
use Symfony\Component\PasswordHasher\Hasher\PasswordHasherFactoryInterface;
use Symfony\Component\PasswordHasher\PasswordHasherInterface;

/**
 * Codes de sécurité exigés pour quitter une séance patient vers le back office :
 * - code personnel de chaque IDE ;
 * - code « garde-fou » national, qui ouvre les séances de toutes les IDE.
 * Les codes sont hachés (comme des mots de passe) et jamais renvoyés par l'API.
 */
final class SecurityCodeManager
{
    private readonly PasswordHasherInterface $hasher;

    public function __construct(
        PasswordHasherFactoryInterface $hasherFactory,
        private readonly EntityManagerInterface $entityManager,
        private readonly UserRepository $userRepository,
        private readonly MailerInterface $mailer,
        #[Autowire(env: 'MAILER_FROM')]
        private readonly string $mailerFrom,
    ) {
        $this->hasher = $hasherFactory->getPasswordHasher('security_code');
    }

    public function setUserCode(User $user, string $code): void
    {
        $user->setSecurityCodeHash($this->hasher->hash($code));
        $this->entityManager->flush();
    }

    /** Vrai si le code est celui de l'IDE, ou le code garde-fou national */
    public function verify(User $user, string $code): bool
    {
        $userHash = $user->getSecurityCodeHash();
        if (null !== $userHash && $this->hasher->verify($userHash, $code)) {
            return true;
        }

        $national = $this->findNationalCode();

        return null !== $national && $this->hasher->verify($national->getCodeHash(), $code);
    }

    /**
     * Change le code national et le transmet à tous les administrateurs nationaux actifs
     * (envoi asynchrone via le worker).
     */
    public function changeNationalCode(string $code, User $changedBy): void
    {
        $hash = $this->hasher->hash($code);
        $national = $this->findNationalCode();
        if (null === $national) {
            $this->entityManager->persist(new NationalSecurityCode($hash, $changedBy));
        } else {
            $national->change($hash, $changedBy);
        }
        $this->entityManager->flush();

        foreach ($this->userRepository->findActiveByRole(UserRole::AdminNational) as $admin) {
            $this->mailer->send((new Email())
                ->from($this->mailerFrom)
                ->to($admin->getEmail())
                ->subject('[Diaverum] Nouveau code de sécurité national')
                ->text(\sprintf(
                    "Bonjour %s,\n\nLe code de sécurité national (code « garde-fou ») a été modifié le %s par %s.\n\nNouveau code : %s\n\nCe code déverrouille les séances de toutes les IDE : ne le transmettez pas.\n",
                    $admin->getFirstName(),
                    (new \DateTimeImmutable())->format('d/m/Y à H:i'),
                    $changedBy->getFullName(),
                    $code,
                )));
        }
    }

    public function isNationalCodeConfigured(): bool
    {
        return null !== $this->findNationalCode();
    }

    private function findNationalCode(): ?NationalSecurityCode
    {
        return $this->entityManager->find(NationalSecurityCode::class, NationalSecurityCode::SINGLETON_ID);
    }
}
