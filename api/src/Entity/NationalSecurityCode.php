<?php

namespace App\Entity;

use Doctrine\DBAL\Types\Types;
use Doctrine\ORM\Mapping as ORM;

/**
 * Code « garde-fou » (haché) détenu par les administrateurs nationaux :
 * il déverrouille les séances de toutes les IDE. Ligne unique (id = 1).
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

    public function __construct(string $codeHash, ?User $updatedBy)
    {
        $this->change($codeHash, $updatedBy);
    }

    public function change(string $codeHash, ?User $updatedBy): void
    {
        $this->codeHash = $codeHash;
        $this->updatedBy = $updatedBy;
        $this->updatedAt = new \DateTimeImmutable();
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
