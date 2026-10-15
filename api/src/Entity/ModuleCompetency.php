<?php

namespace App\Entity;

use ApiPlatform\Doctrine\Orm\Filter\IriFilter;
use ApiPlatform\Metadata\ApiResource;
use ApiPlatform\Metadata\Delete;
use ApiPlatform\Metadata\Get;
use ApiPlatform\Metadata\GetCollection;
use ApiPlatform\Metadata\Patch;
use ApiPlatform\Metadata\Post;
use ApiPlatform\Metadata\QueryParameter;
use App\Entity\Contract\ArchivableInterface;
use App\Entity\Contract\ArchivableTrait;
use App\State\ArchiveProcessor;
use Doctrine\ORM\Mapping as ORM;
use Symfony\Bridge\Doctrine\Types\UuidType;
use Symfony\Component\Serializer\Attribute\Groups;
use Symfony\Component\Uid\Uuid;
use Symfony\Component\Validator\Constraints as Assert;
use Symfony\Component\Validator\Context\ExecutionContextInterface;

/**
 * Compétence d'entraînement d'un cours (5 maximum par cours).
 */
#[ORM\Entity]
#[ApiResource(
    operations: [
        new GetCollection(parameters: [
            'module' => new QueryParameter(filter: new IriFilter(), property: 'module'),
        ]),
        new Get(),
        new Post(security: "is_granted('ROLE_ADMIN_NATIONAL')"),
        new Patch(security: "is_granted('ROLE_ADMIN_NATIONAL')"),
        new Delete(security: "is_granted('ROLE_ADMIN_NATIONAL')", processor: ArchiveProcessor::class),
    ],
    normalizationContext: ['groups' => ['competency:read']],
    denormalizationContext: ['groups' => ['competency:write']],
    order: ['position' => 'ASC'],
    paginationEnabled: false,
)]
class ModuleCompetency implements ArchivableInterface
{
    use ArchivableTrait;

    #[ORM\Id]
    #[ORM\Column(type: UuidType::NAME)]
    #[Groups(['competency:read', 'module:read'])]
    private Uuid $id;

    #[ORM\ManyToOne(inversedBy: 'competencies')]
    #[ORM\JoinColumn(nullable: false, onDelete: 'CASCADE')]
    #[Assert\NotNull]
    #[Groups(['competency:read', 'competency:write'])]
    private ?Module $module = null;

    #[ORM\Column(type: 'text')]
    #[Assert\NotBlank]
    #[Groups(['competency:read', 'competency:write', 'module:read'])]
    private string $label = '';

    #[ORM\Column(options: ['default' => 0])]
    #[Assert\PositiveOrZero]
    #[Groups(['competency:read', 'competency:write', 'module:read'])]
    private int $position = 0;

    public function __construct()
    {
        $this->id = Uuid::v7();
    }

    #[Assert\Callback]
    public function validateMaxPerModule(ExecutionContextInterface $context): void
    {
        if (null === $this->module) {
            return;
        }

        $others = array_filter($this->module->getActiveCompetencies(), fn (self $c) => !$c->getId()->equals($this->id));
        if (\count($others) >= Module::MAX_COMPETENCIES) {
            $context->buildViolation('Un cours ne peut pas avoir plus de {{ max }} compétences.')
                ->setParameter('{{ max }}', (string) Module::MAX_COMPETENCIES)
                ->atPath('module')
                ->addViolation();
        }
    }

    public function getId(): Uuid
    {
        return $this->id;
    }

    public function getModule(): ?Module
    {
        return $this->module;
    }

    public function setModule(?Module $module): static
    {
        $this->module = $module;

        return $this;
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
}
