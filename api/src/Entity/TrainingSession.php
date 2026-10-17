<?php

namespace App\Entity;

use ApiPlatform\Doctrine\Orm\Filter\DateFilter;
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
use App\Enum\SessionStatus;
use App\State\StartSessionProcessor;
use Doctrine\Common\Collections\ArrayCollection;
use Doctrine\Common\Collections\Collection;
use Doctrine\DBAL\Types\Types;
use Doctrine\ORM\Mapping as ORM;
use Symfony\Bridge\Doctrine\Types\UuidType;
use Symfony\Component\Serializer\Attribute\Groups;
use Symfony\Component\Uid\Uuid;
use Symfony\Component\Validator\Constraints as Assert;

/**
 * Séance d'entraînement : un cours réalisé par un patient, sous la responsabilité d'une IDE,
 * pendant une séance de dialyse (un cours maximum par dialyse).
 *
 * Seule une séance validée par l'IDE compte (durée + score). Une séance interrompue
 * n'enregistre rien et le cours devra être recommencé du début.
 * Les actions (valider, interrompre, enregistrer les réponses) arrivent avec la logique métier.
 */
#[ORM\Entity]
#[ORM\Table(name: 'training_session')]
#[ORM\Index(fields: ['status'])]
#[ApiResource(
    shortName: 'Session',
    operations: [
        new GetCollection(parameters: [
            'patient' => new QueryParameter(filter: new IriFilter(), property: 'patient'),
            'module' => new QueryParameter(filter: new IriFilter(), property: 'module'),
            'status' => new QueryParameter(filter: new ExactFilter(), property: 'status'),
            'center' => new QueryParameter(filter: new IriFilter(), property: 'patient.center'),
            'nurse' => new QueryParameter(filter: new IriFilter(), property: 'nurse'),
            // Patient (nom, prénom) ou séance (code, titre)
            'search' => new QueryParameter(filter: new FreeTextQueryFilter(new OrFilter(new PartialSearchFilter())), properties: ['patient.lastName', 'patient.firstName', 'module.code', 'module.title']),
            'startedAt' => new QueryParameter(filter: new DateFilter(), property: 'startedAt'),
            'order[startedAt]' => new QueryParameter(filter: new SortFilter(), property: 'startedAt'),
            'order[patient]' => new QueryParameter(filter: new SortFilter(), property: 'patient.lastName'),
            'order[module]' => new QueryParameter(filter: new SortFilter(), property: 'module.position'),
            'order[nurse]' => new QueryParameter(filter: new SortFilter(), property: 'nurse.lastName'),
            'order[durationSeconds]' => new QueryParameter(filter: new SortFilter(), property: 'durationSeconds'),
            'order[score]' => new QueryParameter(filter: new SortFilter(nullsComparison: 'nulls_always_last'), property: 'score'),
        ]),
        new Get(),
        new Post(securityPostDenormalize: "is_granted('CENTER_SCOPE', object)", processor: StartSessionProcessor::class),
    ],
    normalizationContext: ['groups' => ['session:read', 'author:read']],
    denormalizationContext: ['groups' => ['session:create']],
    order: ['startedAt' => 'DESC'],
)]
class TrainingSession implements CenterScopedInterface, AuthoredInterface
{
    #[ORM\Id]
    #[ORM\Column(type: UuidType::NAME)]
    #[Groups(['session:read'])]
    private Uuid $id;

    #[ORM\ManyToOne]
    #[ORM\JoinColumn(nullable: false)]
    #[Assert\NotNull]
    #[Groups(['session:read', 'session:create'])]
    private ?Patient $patient = null;

    #[ORM\ManyToOne]
    #[ORM\JoinColumn(nullable: false)]
    #[Assert\NotNull]
    #[Groups(['session:read', 'session:create'])]
    private ?Module $module = null;

    #[ORM\ManyToOne]
    #[ORM\JoinColumn(nullable: false)]
    #[Assert\NotNull]
    #[Groups(['session:read', 'session:create'])]
    private ?TrainingProgram $program = null;

    /** IDE responsable de la séance (seule à piloter le chronomètre) */
    #[ORM\ManyToOne]
    #[ORM\JoinColumn(nullable: false)]
    #[Groups(['session:read'])]
    private ?User $nurse = null;

    #[ORM\Column(length: 20, enumType: SessionStatus::class, options: ['default' => 'en_cours'])]
    #[Groups(['session:read'])]
    private SessionStatus $status = SessionStatus::InProgress;

    #[ORM\Column(type: Types::DATETIMETZ_IMMUTABLE)]
    #[Groups(['session:read'])]
    private \DateTimeImmutable $startedAt;

    #[ORM\Column(type: Types::DATETIMETZ_IMMUTABLE, nullable: true)]
    #[Groups(['session:read'])]
    private ?\DateTimeImmutable $completedAt = null;

    /** Durée effective chronométrée (hors pauses) */
    #[ORM\Column(options: ['default' => 0])]
    #[Groups(['session:read'])]
    private int $durationSeconds = 0;

    /** Score en % : proportion de bonnes réponses, sans pénalité pour les mauvaises */
    #[ORM\Column(nullable: true)]
    #[Groups(['session:read'])]
    private ?int $score = null;

    /** Détail des réponses aux exercices (pour l'audit du score) */
    #[ORM\Column(type: Types::JSON, options: ['jsonb' => true, 'default' => '[]'])]
    #[Groups(['session:read'])]
    private array $answers = [];

    /** @var Collection<int, SessionCompetencyValidation> */
    #[ORM\OneToMany(targetEntity: SessionCompetencyValidation::class, mappedBy: 'session', cascade: ['persist'])]
    #[Groups(['session:read'])]
    private Collection $competencyValidations;

    public function __construct()
    {
        $this->id = Uuid::v7();
        $this->startedAt = new \DateTimeImmutable();
        $this->competencyValidations = new ArrayCollection();
    }

    public function isInProgress(): bool
    {
        return SessionStatus::InProgress === $this->status;
    }

    /** Séance non validée : ni durée ni score ne sont comptabilisés, le cours sera à recommencer */
    public function markInterrupted(): void
    {
        $this->status = SessionStatus::Interrupted;
        $this->completedAt = new \DateTimeImmutable();
    }

    /**
     * @param list<array{blockId: string, correct: int, total: int}> $answers
     */
    public function markValidated(int $durationSeconds, ?int $score, array $answers): void
    {
        $this->status = SessionStatus::Validated;
        $this->completedAt = new \DateTimeImmutable();
        $this->durationSeconds = $durationSeconds;
        $this->score = $score;
        $this->answers = $answers;
    }

    public function addCompetencyValidation(SessionCompetencyValidation $validation): void
    {
        $validation->setSession($this);
        $this->competencyValidations->add($validation);
    }

    public function getScopeCenter(): ?Center
    {
        return $this->patient?->getCenter();
    }

    public function getAuthor(): ?User
    {
        return $this->nurse;
    }

    public function setAuthor(User $author): void
    {
        $this->nurse = $author;
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

    public function getModule(): ?Module
    {
        return $this->module;
    }

    public function setModule(?Module $module): static
    {
        $this->module = $module;

        return $this;
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

    public function getNurse(): ?User
    {
        return $this->nurse;
    }

    public function getStatus(): SessionStatus
    {
        return $this->status;
    }

    public function setStatus(SessionStatus $status): static
    {
        $this->status = $status;

        return $this;
    }

    public function getStartedAt(): \DateTimeImmutable
    {
        return $this->startedAt;
    }

    /** Reprise d'historique (données de démonstration, import) : jamais exposé par l'API */
    public function backdate(\DateTimeImmutable $startedAt): static
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

    public function getDurationSeconds(): int
    {
        return $this->durationSeconds;
    }

    public function setDurationSeconds(int $durationSeconds): static
    {
        $this->durationSeconds = $durationSeconds;

        return $this;
    }

    public function getScore(): ?int
    {
        return $this->score;
    }

    public function setScore(?int $score): static
    {
        $this->score = $score;

        return $this;
    }

    public function getAnswers(): array
    {
        return $this->answers;
    }

    public function setAnswers(array $answers): static
    {
        $this->answers = $answers;

        return $this;
    }

    /**
     * @return Collection<int, SessionCompetencyValidation>
     */
    public function getCompetencyValidations(): Collection
    {
        return $this->competencyValidations;
    }
}
