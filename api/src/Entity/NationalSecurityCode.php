<?php

namespace App\Entity;

use Doctrine\DBAL\Types\Types;
use Doctrine\ORM\Mapping as ORM;

/**
 * Code « garde-fou » détenu par les administrateurs nationaux : il déverrouille les séances de toutes les IDE.
 * Haché pour la vérification, et chiffré (clé du serveur) pour pouvoir être affiché aux administrateurs nationaux.
 * Ligne unique (id = 1).
 */
#[ORM\Entity]
class NationalSecurityCode
{
    public const SINGLETON_ID = 1;

    #[ORM\Id]
    #[ORM\Column]
    private int $id = self::SINGLETON_ID;

    #[ORM\Column]
    private string $codeHash;

    #[ORM\ManyToOne]
    #[ORM\JoinColumn(onDelete: 'SET NULL')]
    private ?User $updatedBy = null;

    #[ORM\Column(type: Types::DATETIMETZ_IMMUTABLE)]
    private \DateTimeImmutable $updatedAt;

    /** Code chiffré (voir NationalCodeVault) ; nul pour un code défini avant l'affichage, ou sans clé de chiffrement */
    #[ORM\Column(type: Types::TEXT, nullable: true)]
    private ?string $codeEncrypted = null;

    /** @var list<string> identifiants des administrateurs ayant pris connaissance du dernier changement */
    #[ORM\Column(type: Types::JSON, options: ['jsonb' => true, 'default' => '[]'])]
    private array $seenBy = [];

    public function __construct(string $codeHash, ?User $updatedBy, ?string $codeEncrypted = null)
    {
        $this->change($codeHash, $updatedBy, $codeEncrypted);
    }

    public function change(string $codeHash, ?User $updatedBy, ?string $codeEncrypted = null): void
    {
        $this->codeHash = $codeHash;
        $this->codeEncrypted = $codeEncrypted;
        $this->updatedBy = $updatedBy;
        $this->updatedAt = new \DateTimeImmutable();
        // Celui qui change le code le connaît ; les autres administrateurs en sont avertis à leur prochaine connexion
        $this->seenBy = null === $updatedBy ? [] : [$updatedBy->getId()->toRfc4122()];
    }

    public function getCodeEncrypted(): ?string
    {
        return $this->codeEncrypted;
    }

    public function hasBeenSeenBy(User $user): bool
    {
        return \in_array($user->getId()->toRfc4122(), $this->seenBy, true);
    }

    public function markSeenBy(User $user): void
    {
        if (!$this->hasBeenSeenBy($user)) {
            $this->seenBy[] = $user->getId()->toRfc4122();
        }
    }

    public function getCodeHash(): string
    {
        return $this->codeHash;
    }

    public function getUpdatedBy(): ?User
    {
        return $this->updatedBy;
    }

    public function getUpdatedAt(): \DateTimeImmutable
    {
        return $this->updatedAt;
    }
}
