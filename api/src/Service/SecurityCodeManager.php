<?php

namespace App\Service;

use App\Entity\NationalSecurityCode;
use App\Entity\User;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Component\PasswordHasher\Hasher\PasswordHasherFactoryInterface;
use Symfony\Component\PasswordHasher\PasswordHasherInterface;

/**
 * Codes de sécurité exigés pour quitter une séance patient vers le back office :
 * - code personnel de chaque IDE ;
 * - code « garde-fou » national, qui ouvre les séances de toutes les IDE.
 * Les codes sont hachés (comme des mots de passe). Le code national a en plus une copie chiffrée, que seuls les
 * administrateurs nationaux peuvent afficher (mot de passe redemandé) ; celui des IDE n'est jamais renvoyé.
 */
final class SecurityCodeManager
{
    private readonly PasswordHasherInterface $hasher;

    public function __construct(
        PasswordHasherFactoryInterface $hasherFactory,
        private readonly EntityManagerInterface $entityManager,
        private readonly NationalCodeVault $vault,
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
     * Change le code national. Les autres administrateurs nationaux en sont avertis à leur prochaine connexion
     * (voir nationalCodeStatus) et peuvent l'afficher.
     */
    public function changeNationalCode(string $code, User $changedBy): void
    {
        $hash = $this->hasher->hash($code);
        $encrypted = $this->vault->encrypt($code);
        $national = $this->findNationalCode();
        if (null === $national) {
            $this->entityManager->persist(new NationalSecurityCode($hash, $changedBy, $encrypted));
        } else {
            $national->change($hash, $changedBy, $encrypted);
        }
        $this->entityManager->flush();
    }

    /**
     * État du code national pour un administrateur : défini ou non, date et auteur du dernier changement,
     * affichable ou non, et si ce changement est à signaler à cet administrateur (popup à la connexion).
     *
     * @return array{configured: bool, revealable: bool, updatedAt: ?string, updatedBy: ?string, notice: bool}
     */
    public function nationalCodeStatus(User $viewer): array
    {
        $national = $this->findNationalCode();
        if (null === $national) {
            return ['configured' => false, 'revealable' => false, 'updatedAt' => null, 'updatedBy' => null, 'notice' => false];
        }
        $revealable = null !== $national->getCodeEncrypted() && $this->vault->isAvailable();

        return [
            'configured' => true,
            'revealable' => $revealable,
            'updatedAt' => $national->getUpdatedAt()->format(\DATE_ATOM),
            'updatedBy' => $national->getUpdatedBy()?->getFullName(),
            'notice' => $revealable && !$national->hasBeenSeenBy($viewer),
        ];
    }

    /** Code national en clair (null s'il n'est pas affichable) ; l'administrateur est alors considéré comme prévenu */
    public function revealNationalCode(User $viewer): ?string
    {
        $national = $this->findNationalCode();
        $code = null === $national || null === $national->getCodeEncrypted() ? null : $this->vault->decrypt($national->getCodeEncrypted());
        if (null !== $code) {
            $national->markSeenBy($viewer);
            $this->entityManager->flush();
        }

        return $code;
    }

    /** L'administrateur a pris connaissance du changement (sans afficher le code) */
    public function acknowledgeNationalChange(User $viewer): void
    {
        $this->findNationalCode()?->markSeenBy($viewer);
        $this->entityManager->flush();
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
