<?php

namespace App\Entity;

use ApiPlatform\Doctrine\Orm\Filter\IriFilter;
use ApiPlatform\Metadata\ApiResource;
use ApiPlatform\Metadata\Get;
use ApiPlatform\Metadata\GetCollection;
use ApiPlatform\Metadata\Patch;
use ApiPlatform\Metadata\Post;
use ApiPlatform\Metadata\QueryParameter;
use App\Entity\Contract\CenterScopedInterface;
use Doctrine\DBAL\Types\Types;
use Doctrine\ORM\Mapping as ORM;
use Symfony\Bridge\Doctrine\Types\UuidType;
use Symfony\Bridge\Doctrine\Validator\Constraints\UniqueEntity;
use Symfony\Component\Serializer\Attribute\Groups;
use Symfony\Component\Uid\Uuid;
use Symfony\Component\Validator\Constraints as Assert;
use Symfony\Component\Validator\Context\ExecutionContextInterface;

/**
 * Séance d'un parcours : sélectionnée ou non par l'IDE, avec son suivi (non démarrée / non terminée / validée).
 * Une séance désélectionnée reste en base : une séance déjà validée reste visible dans le programme.
 */
#[ORM\Entity]
#[ORM\UniqueConstraint(fields: ['program', 'module'])]
#[UniqueEntity(fields: ['program', 'module'], message: 'Ce cours figure déjà dans le parcours.')]
#[ApiResource(
    operations: [
        new GetCollection(parameters: [
            'program' => new QueryParameter(filter: new IriFilter(), property: 'program'),
        ]),
        new Get(),
        new Post(
            denormalizationContext: ['groups' => ['program_module:write', 'program_module:create']],
            securityPostDenormalize: "is_granted('CENTER_SCOPE', object)",
        ),
        new Patch(securityPostDenormalize: "is_granted('CENTER_SCOPE', object)"),
    ],
    normalizationContext: ['groups' => ['program_module:read']],
    denormalizationContext: ['groups' => ['program_module:write']],
    order: ['position' => 'ASC'],
    paginationEnabled: false,
)]
class ProgramModule implements CenterScopedInterface
{
    #[ORM\Id]
    #[ORM\Column(type: UuidType::NAME)]
    #[Groups(['program_module:read', 'program:read'])]
    private Uuid $id;

    #[ORM\ManyToOne(inversedBy: 'modules')]
    #[ORM\JoinColumn(nullable: false, onDelete: 'CASCADE')]
    #[Assert\NotNull]
    #[Groups(['program_module:read', 'program_module:create'])]
    private ?TrainingProgram $program = null;

    #[ORM\ManyToOne]
    #[ORM\JoinColumn(nullable: false)]
    #[Assert\NotNull]
    #[Groups(['program_module:read', 'program_module:create', 'program:read'])]
    private ?Module $module = null;

    #[ORM\Column(options: ['default' => true])]
    #[Groups(['program_module:read', 'program_module:write', 'program:read'])]
    private bool $selected = true;

    #[ORM\Column(options: ['default' => 0])]
    #[Groups(['program_module:read', 'program_module:write', 'program:read'])]
    private int $position = 0;

    /** Première ouverture du cours pour ce patient (le cours est alors « non terminé ») */
    #[ORM\Column(type: Types::DATETIMETZ_IMMUTABLE, nullable: true)]
    #[Groups(['program_module:read', 'program:read'])]
    private ?\DateTimeImmutable $startedAt = null;

    /** Validation par l'IDE (bouton « Terminer le cours ») : dernière séance validée */
    #[ORM\Column(type: Types::DATETIMETZ_IMMUTABLE, nullable: true)]
    #[Groups(['program_module:read', 'program:read'])]
    private ?\DateTimeImmutable $validatedAt = null;

    #[ORM\Column(nullable: true)]
    #[Groups(['program_module:read', 'program:read'])]
    private ?int $score = null;

    #[ORM\Column(nullable: true)]
    #[Groups(['program_module:read', 'program:read'])]
    private ?int $durationSeconds = null;

    #[Assert\Callback]
    public function validateProgramIsEditable(ExecutionContextInterface $context): void
    {
        if ($this->program?->isLocked()) {
            $context->buildViolation('Le programme est achevé : il n\'est plus modifiable.')
                ->atPath('selected')
                ->addViolation();
        }
    }

    /** non_demarre, non_termine ou valide (cahier des charges §3) */
    #[Groups(['program_module:read', 'program:read'])]
    public function getStatus(): string
    {
        return match (true) {
            null !== $this->validatedAt => 'valide',
            null !== $this->startedAt => 'non_termine',
            default => 'non_demarre',
        };
    }

    public function markStarted(?\DateTimeImmutable $at = null): void
    {
        $this->startedAt ??= $at ?? new \DateTimeImmutable();
    }

    /** $at : date de validation (maintenant par défaut ; renseignée pour une reprise d'historique) */
    public function markValidated(?int $score, int $durationSeconds, ?\DateTimeImmutable $at = null): void
    {
        $this->markStarted($at);
        $this->validatedAt = $at ?? new \DateTimeImmutable();
        $this->score = $score;
        $this->durationSeconds = $durationSeconds;
    }

    public function getStartedAt(): ?\DateTimeImmutable
    {
        return $this->startedAt;
    }

    public function getValidatedAt(): ?\DateTimeImmutable
    {
        return $this->validatedAt;
    }

    public function getScore(): ?int
    {
        return $this->score;
    }

    public function getDurationSeconds(): ?int
    {
        return $this->durationSeconds;
    }

    public function __construct()
    {
        $this->id = Uuid::v7();
    }

    public function getScopeCenter(): ?Center
    {
        return $this->program?->getScopeCenter();
    }

    public function getId(): Uuid
    {
        return $this->id;
    }

    public function getProgram(): ?TrainingProgram
    {
        return $this->program;
    }

    public function setProgram(?TrainingProgram $program): static
    {
        $this->program = $program;

        return $this;
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

    public function isSelected(): bool
    {
        return $this->selected;
    }

    public function setSelected(bool $selected): static
    {
        $this->selected = $selected;

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
