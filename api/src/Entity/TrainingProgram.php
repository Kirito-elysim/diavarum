<?php

namespace App\Entity;

use ApiPlatform\Doctrine\Orm\Filter\ExactFilter;
use ApiPlatform\Doctrine\Orm\Filter\FreeTextQueryFilter;
use ApiPlatform\Doctrine\Orm\Filter\IriFilter;
use ApiPlatform\Doctrine\Orm\Filter\OrFilter;
use ApiPlatform\Doctrine\Orm\Filter\PartialSearchFilter;
use ApiPlatform\Doctrine\Orm\Filter\SortFilter;
use ApiPlatform\Metadata\ApiResource;
use ApiPlatform\Metadata\Get;
use ApiPlatform\Metadata\GetCollection;
use ApiPlatform\Metadata\Post;
use ApiPlatform\Metadata\QueryParameter;
use App\Entity\Contract\AuthoredInterface;
use App\Entity\Contract\CenterScopedInterface;
use App\Enum\EligibilityStatus;
use App\Enum\ProgramStatus;
use App\State\TrainingProgramProcessor;
use Doctrine\Common\Collections\ArrayCollection;
use Doctrine\Common\Collections\Collection;
use Doctrine\DBAL\Types\Types;
use Doctrine\ORM\Mapping as ORM;
use Symfony\Bridge\Doctrine\Types\UuidType;
use Symfony\Bridge\Doctrine\Validator\Constraints\UniqueEntity;
use Symfony\Component\Serializer\Attribute\Groups;
use Symfony\Component\Uid\Uuid;
use App\Validator\ActivePatient;
use Symfony\Component\Validator\Constraints as Assert;
use Symfony\Component\Validator\Context\ExecutionContextInterface;

/**
 * Parcours (= parcours) d'entraînement individualisé d'un patient.
 *
 * Statuts : non actif → actif → achevé (non modifiable), ou interrompu avec justification.
 * Les changements de statut passeront par des actions dédiées (démarrer, interrompre, valider),
 * avec leurs règles métier : ils ne sont pas modifiables directement.
 */
#[ORM\Entity]
#[UniqueEntity('patient', message: 'Ce patient a déjà un parcours d\'entraînement.')]
#[ApiResource(
    operations: [
        new GetCollection(parameters: [
            'patient' => new QueryParameter(filter: new IriFilter(), property: 'patient'),
            'status' => new QueryParameter(filter: new ExactFilter(), property: 'status'),
            'center' => new QueryParameter(filter: new IriFilter(), property: 'patient.center'),
            'search' => new QueryParameter(filter: new FreeTextQueryFilter(new OrFilter(new PartialSearchFilter())), properties: ['patient.lastName', 'patient.firstName']),
            'order[patient]' => new QueryParameter(filter: new SortFilter(), property: 'patient.lastName'),
            'order[status]' => new QueryParameter(filter: new SortFilter(), property: 'status'),
            'order[startedAt]' => new QueryParameter(filter: new SortFilter(nullsComparison: 'nulls_always_last'), property: 'startedAt'),
            'order[createdAt]' => new QueryParameter(filter: new SortFilter(), property: 'createdAt'),
        ], normalizationContext: ['groups' => ['program:list', 'author:read']]),
        new Get(),
        new Post(
            denormalizationContext: ['groups' => ['program:create']],
            securityPostDenormalize: "is_granted('CENTER_SCOPE', object)",
            processor: TrainingProgramProcessor::class,
        ),
    ],
    normalizationContext: ['groups' => ['program:read', 'author:read']],
    order: ['createdAt' => 'DESC'],
)]
class TrainingProgram implements CenterScopedInterface, AuthoredInterface
{
    #[ORM\Id]
    #[ORM\Column(type: UuidType::NAME)]
    #[Groups(['program:read', 'program:list'])]
    private Uuid $id;

    #[ORM\OneToOne]
    #[ORM\JoinColumn(nullable: false)]
    #[Assert\NotNull]
    #[Groups(['program:read', 'program:list', 'program:create'])]
    #[ActivePatient]
    private ?Patient $patient = null;

    #[ORM\Column(length: 20, enumType: ProgramStatus::class, options: ['default' => 'non_actif'])]
    #[Groups(['program:read', 'program:list'])]
    private ProgramStatus $status = ProgramStatus::Inactive;

    /** @var Collection<int, ProgramModule> sélection des cours du parcours */
    #[ORM\OneToMany(targetEntity: ProgramModule::class, mappedBy: 'program', cascade: ['persist'])]
    #[ORM\OrderBy(['position' => 'ASC'])]
    #[Groups(['program:read'])]
    private Collection $modules;

    #[ORM\ManyToOne]
    #[ORM\JoinColumn(nullable: false)]
    #[Groups(['program:read', 'program:list'])]
    private ?User $createdBy = null;

    #[ORM\Column(type: Types::DATETIMETZ_IMMUTABLE)]
    #[Groups(['program:read', 'program:list'])]
    private \DateTimeImmutable $createdAt;

    #[ORM\Column(type: Types::DATETIMETZ_IMMUTABLE, nullable: true)]
    #[Groups(['program:read', 'program:list'])]
    private ?\DateTimeImmutable $startedAt = null;

    #[ORM\Column(type: Types::DATETIMETZ_IMMUTABLE, nullable: true)]
    #[Groups(['program:read', 'program:list'])]
    private ?\DateTimeImmutable $completedAt = null;

    /** Validation du parcours par un cadre de service */
    #[ORM\ManyToOne]
    #[Groups(['program:read', 'program:list'])]
    private ?User $validatedBy = null;

    #[ORM\Column(type: Types::DATETIMETZ_IMMUTABLE, nullable: true)]
    #[Groups(['program:read', 'program:list'])]
    private ?\DateTimeImmutable $validatedAt = null;

    /** @var Collection<int, InterruptionReason> motifs cochés lors d'une clôture anticipée */
    #[ORM\ManyToMany(targetEntity: InterruptionReason::class)]
    #[ORM\JoinTable(name: 'program_interruption_reason')]
    #[Groups(['program:read', 'program:list'])]
    private Collection $interruptionReasons;

    #[ORM\Column(type: Types::TEXT, nullable: true)]
    #[Groups(['program:read', 'program:list'])]
    private ?string $interruptionNotes = null;

    #[ORM\ManyToOne]
    #[Groups(['program:read', 'program:list'])]
    private ?User $interruptedBy = null;

    #[ORM\Column(type: Types::DATETIMETZ_IMMUTABLE, nullable: true)]
    #[Groups(['program:read', 'program:list'])]
    private ?\DateTimeImmutable $interruptedAt = null;

    public function __construct()
    {
        $this->id = Uuid::v7();
        $this->modules = new ArrayCollection();
        $this->interruptionReasons = new ArrayCollection();
        $this->createdAt = new \DateTimeImmutable();
    }

    #[Assert\Callback]
    public function validatePatientEligibility(ExecutionContextInterface $context): void
    {
        // Patient non éligible = parcours bloqué, pas de sélection de cours
        if (null !== $this->patient && EligibilityStatus::Eligible !== $this->patient->getEligibilityStatus()) {
            $context->buildViolation('Le patient doit être déclaré éligible avant de créer son parcours.')
                ->atPath('patient')
                ->addViolation();
        }
    }

    /** Parcours achevé : plus aucune modification (cahier des charges §3) */
    public function isLocked(): bool
    {
        return ProgramStatus::Completed === $this->status;
    }

    /** De nouvelles séances peuvent-elles être lancées ? */
    public function acceptsSessions(): bool
    {
        return \in_array($this->status, [ProgramStatus::Inactive, ProgramStatus::Active], true);
    }

    public function markActive(): void
    {
        if (ProgramStatus::Inactive === $this->status) {
            $this->status = ProgramStatus::Active;
            $this->startedAt ??= new \DateTimeImmutable();
        }
    }

    public function markCompleted(User $validatedBy): void
    {
        $this->status = ProgramStatus::Completed;
        $this->completedAt = new \DateTimeImmutable();
        $this->markValidated($validatedBy);
    }

    /** Reprise d'un parcours interrompu */
    public function resume(): void
    {
        $this->status = null === $this->startedAt ? ProgramStatus::Inactive : ProgramStatus::Active;
        $this->interruptedAt = null;
        $this->interruptedBy = null;
        $this->interruptionNotes = null;
        $this->interruptionReasons->clear();
    }

    public function findModule(Module $module): ?ProgramModule
    {
        foreach ($this->modules as $selection) {
            if ($selection->getModule()?->getId()->equals($module->getId())) {
                return $selection;
            }
        }

        return null;
    }

    /** Séances sélectionnées : le « total » du parcours individualisé (ex. 14/31) */
    /** Date de la dernière séance validée (liste des parcours) */
    #[Groups(['program:list'])]
    public function getLastValidatedAt(): ?\DateTimeImmutable
    {
        $dates = array_filter(array_map(static fn (ProgramModule $m) => $m->getValidatedAt(), $this->modules->toArray()));

        return [] === $dates ? null : max($dates);
    }

    /**
     * Prochaine séance prévue : première séance sélectionnée non validée, dans l'ordre du parcours.
     *
     * @return array{code: string, title: string}|null
     */
    #[Groups(['program:list'])]
    public function getNextModule(): ?array
    {
        if (\in_array($this->status, [ProgramStatus::Completed, ProgramStatus::Interrupted], true)) {
            return null;
        }
        $pending = array_filter($this->modules->toArray(), static fn (ProgramModule $m) => $m->isSelected() && null === $m->getValidatedAt());
        usort($pending, static fn (ProgramModule $a, ProgramModule $b) => $a->getPosition() <=> $b->getPosition());

        return [] === $pending ? null : ['code' => $pending[0]->getModule()->getCode(), 'title' => $pending[0]->getModule()->getTitle()];
    }

    #[Groups(['program:read', 'program:list'])]
    public function getSelectedCount(): int
    {
        return $this->modules->filter(static fn (ProgramModule $m) => $m->isSelected())->count();
    }

    /** Séances validées, y compris celles désélectionnées après coup */
    #[Groups(['program:read', 'program:list'])]
    public function getValidatedCount(): int
    {
        return $this->modules->filter(static fn (ProgramModule $m) => null !== $m->getValidatedAt())->count();
    }

    /** Moyenne des scores des séances validées (%), null si aucune séance notée */
    #[Groups(['program:read', 'program:list'])]
    public function getAverageScore(): ?int
    {
        $scores = $this->modules->map(static fn (ProgramModule $m) => $m->getScore())->filter(static fn (?int $s) => null !== $s)->toArray();

        return [] === $scores ? null : (int) round(array_sum($scores) / \count($scores));
    }

    /** Durée cumulée des séances validées */
    #[Groups(['program:read', 'program:list'])]
    public function getTotalDurationSeconds(): int
    {
        return array_sum($this->modules->map(static fn (ProgramModule $m) => $m->getDurationSeconds() ?? 0)->toArray());
    }

    /**
     * Ajoute un cours au parcours (sélectionné par défaut s'il est systématique).
     */
    public function addModule(Module $module): ProgramModule
    {
        $selection = (new ProgramModule())
            ->setProgram($this)
            ->setModule($module)
            ->setSelected($module->isMandatory())
            ->setPosition($module->getPosition());
        $this->modules->add($selection);

        return $selection;
    }

    public function getScopeCenter(): ?Center
    {
        return $this->patient?->getCenter();
    }

    public function getAuthor(): ?User
    {
        return $this->createdBy;
    }

    public function setAuthor(User $author): void
    {
        $this->createdBy = $author;
    }

    public function getId(): Uuid
    {
        return $this->id;
    }

    public function getPatient(): ?Patient
    {
        return $this->patient;
    }

    public function setPatient(?Patient $patient): static
    {
        $this->patient = $patient;

        return $this;
    }

    public function getStatus(): ProgramStatus
    {
        return $this->status;
    }

    public function setStatus(ProgramStatus $status): static
    {
        $this->status = $status;

        return $this;
    }

    /**
     * @return Collection<int, ProgramModule>
     */
    public function getModules(): Collection
    {
        return $this->modules;
    }

    public function getCreatedBy(): ?User
    {
        return $this->createdBy;
    }

    public function getCreatedAt(): \DateTimeImmutable
    {
        return $this->createdAt;
    }

    public function getStartedAt(): ?\DateTimeImmutable
    {
        return $this->startedAt;
    }

    public function setStartedAt(?\DateTimeImmutable $startedAt): static
    {
        $this->startedAt = $startedAt;

        return $this;
    }

    public function getCompletedAt(): ?\DateTimeImmutable
    {
        return $this->completedAt;
    }

    public function setCompletedAt(?\DateTimeImmutable $completedAt): static
    {
        $this->completedAt = $completedAt;

        return $this;
    }

    public function getValidatedBy(): ?User
    {
        return $this->validatedBy;
    }

    public function getValidatedAt(): ?\DateTimeImmutable
    {
        return $this->validatedAt;
    }

    public function markValidated(User $cadre): static
    {
        $this->validatedBy = $cadre;
        $this->validatedAt = new \DateTimeImmutable();

        return $this;
    }

    /**
     * @return Collection<int, InterruptionReason>
     */
    public function getInterruptionReasons(): Collection
    {
        return $this->interruptionReasons;
    }

    public function getInterruptionNotes(): ?string
    {
        return $this->interruptionNotes;
    }

    public function getInterruptedBy(): ?User
    {
        return $this->interruptedBy;
    }

    public function getInterruptedAt(): ?\DateTimeImmutable
    {
        return $this->interruptedAt;
    }

    /**
     * @param iterable<InterruptionReason> $reasons
     */
    public function markInterrupted(User $by, iterable $reasons, ?string $notes): static
    {
        $this->status = ProgramStatus::Interrupted;
        $this->interruptedBy = $by;
        $this->interruptedAt = new \DateTimeImmutable();
        $this->interruptionNotes = $notes;
        $this->interruptionReasons->clear();
        foreach ($reasons as $reason) {
            $this->interruptionReasons->add($reason);
        }

        return $this;
    }
}
