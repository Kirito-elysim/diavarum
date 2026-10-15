<?php

namespace App\Entity;

use ApiPlatform\Metadata\ApiResource;
use ApiPlatform\Metadata\Delete;
use ApiPlatform\Metadata\Get;
use ApiPlatform\Metadata\GetCollection;
use ApiPlatform\Metadata\Patch;
use ApiPlatform\Metadata\Post;
use App\Entity\Contract\ArchivableInterface;
use App\Entity\Contract\ArchivableTrait;
use App\State\ArchiveProcessor;
use Doctrine\ORM\Mapping as ORM;
use Symfony\Bridge\Doctrine\Types\UuidType;
use Symfony\Component\Serializer\Attribute\Groups;
use Symfony\Component\Uid\Uuid;
use Symfony\Component\Validator\Constraints as Assert;

/**
 * Regroupement thématique de cours (ex. « Hygiène de vie et dialyse » = alimentation + boisson + activité physique).
 */
#[ORM\Entity]
#[ApiResource(
    operations: [
        new GetCollection(),
        new Get(),
        new Post(security: "is_granted('ROLE_ADMIN_NATIONAL')"),
        new Patch(security: "is_granted('ROLE_ADMIN_NATIONAL')"),
        new Delete(security: "is_granted('ROLE_ADMIN_NATIONAL')", processor: ArchiveProcessor::class),
    ],
    normalizationContext: ['groups' => ['chapter:read']],
    denormalizationContext: ['groups' => ['chapter:write']],
    order: ['position' => 'ASC'],
    paginationEnabled: false,
)]
class Chapter implements ArchivableInterface
{
    use ArchivableTrait;

    #[ORM\Id]
    #[ORM\Column(type: UuidType::NAME)]
    #[Groups(['chapter:read', 'module:read', 'program:read'])]
    private Uuid $id;

    #[ORM\Column(length: 255)]
    #[Assert\NotBlank]
    #[Assert\Length(max: 255)]
    #[Groups(['chapter:read', 'chapter:write', 'module:read', 'program:read'])]
    private string $title = '';

    #[ORM\Column(type: 'text', nullable: true)]
    #[Groups(['chapter:read', 'chapter:write'])]
    private ?string $description = null;

    #[ORM\Column(options: ['default' => 0])]
    #[Assert\PositiveOrZero]
    #[Groups(['chapter:read', 'chapter:write', 'program:read'])]
    private int $position = 0;

    public function __construct()
    {
        $this->id = Uuid::v7();
    }

    public function getId(): Uuid
    {
        return $this->id;
    }

    public function getTitle(): string
    {
        return $this->title;
    }

    public function setTitle(string $title): static
    {
        $this->title = $title;

        return $this;
    }

    public function getDescription(): ?string
    {
        return $this->description;
    }

    public function setDescription(?string $description): static
    {
        $this->description = $description;

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
}
