<?php

namespace App\Entity;

use Doctrine\DBAL\Types\Types;
use Doctrine\ORM\Mapping as ORM;
use Symfony\Bridge\Doctrine\Types\UuidType;
use Symfony\Component\Uid\Uuid;

/**
 * Fichier ayant servi à un import réussi, conservé tel quel (traçabilité) dans un dossier privé.
 * Consultable par les administrateurs nationaux depuis le journal des accès ; purgé avec lui.
 */
#[ORM\Entity(readOnly: true)]
#[ORM\Index(fields: ['importedAt'])]
class ImportFile
{
    #[ORM\Id]
    #[ORM\Column(type: UuidType::NAME)]
    private Uuid $id;

    #[ORM\Column(type: Types::DATETIMETZ_IMMUTABLE)]
    private \DateTimeImmutable $importedAt;

    public function __construct(
        /** users, centers ou patients */
        #[ORM\Column(length: 20)]
        private string $type,
        #[ORM\Column(length: 255)]
        private string $originalName,
        /** Nom technique dans le dossier des imports (identifiant + extension) */
        #[ORM\Column(length: 64)]
        private string $storedName,
        #[ORM\Column]
        private int $size,
        #[ORM\Column(length: 64)]
        private string $sha256,
        #[ORM\Column]
        private int $createdCount,
        #[ORM\ManyToOne]
        #[ORM\JoinColumn(nullable: false)]
        private User $importedBy,
        ?Uuid $id = null,
    ) {
        $this->id = $id ?? Uuid::v7();
        $this->importedAt = new \DateTimeImmutable();
    }

    public function getId(): Uuid
    {
        return $this->id;
    }

    public function getType(): string
    {
        return $this->type;
    }

    public function getOriginalName(): string
    {
        return $this->originalName;
    }

    public function getStoredName(): string
    {
        return $this->storedName;
    }

    public function getSize(): int
    {
        return $this->size;
    }

    public function getSha256(): string
    {
        return $this->sha256;
    }

    public function getCreatedCount(): int
    {
        return $this->createdCount;
    }

    public function getImportedBy(): User
    {
        return $this->importedBy;
    }

    public function getImportedAt(): \DateTimeImmutable
    {
        return $this->importedAt;
    }
}
