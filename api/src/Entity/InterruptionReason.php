<?php

namespace App\Entity;

use ApiPlatform\Metadata\ApiResource;
use ApiPlatform\Metadata\Get;
use ApiPlatform\Metadata\GetCollection;
use ApiPlatform\Metadata\Patch;
use ApiPlatform\Metadata\Post;
use Doctrine\ORM\Mapping as ORM;
use Symfony\Bridge\Doctrine\Types\UuidType;
use Symfony\Component\Serializer\Attribute\Groups;
use Symfony\Component\Uid\Uuid;
use Symfony\Component\Validator\Constraints as Assert;

/**
 * Motif (à cocher) justifiant la clôture anticipée d'un parcours d'entraînement.
 * Pas de suppression (des parcours y font référence) : désactiver avec « active: false ».
 */
#[ORM\Entity]
#[ApiResource(
    operations: [
        new GetCollection(),
        new Get(),
        new Post(security: "is_granted('ROLE_ADMIN_NATIONAL')"),
        new Patch(security: "is_granted('ROLE_ADMIN_NATIONAL')"),
    ],
    normalizationContext: ['groups' => ['interruption_reason:read']],
    denormalizationContext: ['groups' => ['interruption_reason:write']],
    order: ['position' => 'ASC'],
    paginationEnabled: false,
)]
class InterruptionReason
{
    #[ORM\Id]
    #[ORM\Column(type: UuidType::NAME)]
    #[Groups(['interruption_reason:read'])]
    private Uuid $id;

    #[ORM\Column(length: 255)]
    #[Assert\NotBlank]
    #[Assert\Length(max: 255)]
    #[Groups(['interruption_reason:read', 'interruption_reason:write'])]
    private string $label = '';

    #[ORM\Column(options: ['default' => 0])]
    #[Groups(['interruption_reason:read', 'interruption_reason:write'])]
    private int $position = 0;

    #[ORM\Column(options: ['default' => true])]
    #[Groups(['interruption_reason:read', 'interruption_reason:write'])]
    private bool $active = true;

    public function __construct(?Uuid $id = null)
    {
        $this->id = $id ?? Uuid::v7();
    }

    public function getId(): Uuid
    {
        return $this->id;
    }

    public function getLabel(): string
    {
        return $this->label;
    }

    public function setLabel(string $label): static
    {
        $this->label = $label;

        return $this;
    }

    public function getPosition(): int
    {
        return $this->position;
    }

    public function setPosition(int $position): static
    {
        $this->position = $position;

        return $this;
    }

    public function isActive(): bool
    {
        return $this->active;
    }

    public function setActive(bool $active): static
    {
        $this->active = $active;

        return $this;
    }
}
