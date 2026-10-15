<?php

namespace App\Entity;

use ApiPlatform\Doctrine\Orm\Filter\ExactFilter;
use ApiPlatform\Doctrine\Orm\Filter\IriFilter;
use ApiPlatform\Doctrine\Orm\Filter\PartialSearchFilter;
use ApiPlatform\Metadata\ApiResource;
use ApiPlatform\Metadata\Delete;
use ApiPlatform\Metadata\Get;
use ApiPlatform\Metadata\GetCollection;
use ApiPlatform\Metadata\Patch;
use ApiPlatform\Metadata\Post;
use ApiPlatform\Metadata\QueryParameter;
use App\Entity\Contract\ArchivableInterface;
use App\Entity\Contract\AuthoredInterface;
use App\Entity\Contract\CenterScopedInterface;
use App\Enum\EligibilityStatus;
use App\State\ArchiveProcessor;
use Doctrine\Common\Collections\ArrayCollection;
use Doctrine\Common\Collections\Collection;
use Doctrine\DBAL\Types\Types;
use Doctrine\ORM\Mapping as ORM;
use Symfony\Bridge\Doctrine\Types\UuidType;
use Symfony\Component\Serializer\Attribute\Context;
use Symfony\Component\Serializer\Attribute\Groups;
use Symfony\Component\Serializer\Normalizer\DateTimeNormalizer;
use Symfony\Component\Uid\Uuid;
use Symfony\Component\Validator\Constraints as Assert;
use Symfony\Component\Validator\Context\ExecutionContextInterface;

/**
 * Patient en entraînement, rattaché à un centre de dialyse.
 *
 * Une IDE accède à tous les patients des centres où elle est affiliée (CenterScopeExtension).
 * La suppression le sort de la file active (removedAt) sans effacer son historique.
 */
#[ORM\Entity]
#[ORM\HasLifecycleCallbacks]
#[ORM\Index(fields: ['lastName'])]
#[ApiResource(
    operations: [
        new GetCollection(parameters: [
            'search' => new QueryParameter(filter: new PartialSearchFilter(), property: 'lastName'),
            'center' => new QueryParameter(filter: new IriFilter(), property: 'center'),
            'eligibilityStatus' => new QueryParameter(filter: new ExactFilter(), property: 'eligibilityStatus'),
        ]),
        new Get(),
        new Post(securityPostDenormalize: "is_granted('CENTER_SCOPE', object)"),
        new Patch(securityPostDenormalize: "is_granted('CENTER_SCOPE', object)", processor: \App\State\PatientEligibilityProcessor::class),
        new Delete(security: "is_granted('ROLE_CADRE')", processor: ArchiveProcessor::class),
    ],
    normalizationContext: ['groups' => ['patient:read', 'author:read']],
    denormalizationContext: ['groups' => ['patient:write']],
    order: ['lastName' => 'ASC', 'firstName' => 'ASC'],
)]
class Patient implements CenterScopedInterface, AuthoredInterface, ArchivableInterface
{
    #[ORM\Id]
    #[ORM\Column(type: UuidType::NAME)]
    #[Groups(['patient:read', 'session:read', 'program:read'])]
    private Uuid $id;

    #[ORM\Column(length: 100)]
    #[Assert\NotBlank]
    #[Assert\Length(max: 100)]
    #[Groups(['patient:read', 'patient:write', 'session:read', 'program:read'])]
    private string $firstName = '';

    #[ORM\Column(length: 100)]
    #[Assert\NotBlank]
    #[Assert\Length(max: 100)]
    #[Groups(['patient:read', 'patient:write', 'session:read', 'program:read'])]
    private string $lastName = '';

    /** Nom + prénom + date de naissance identifient le patient dans les exports */
    #[ORM\Column(type: Types::DATE_IMMUTABLE, nullable: true)]
    #[Assert\LessThan('today')]
    #[Context([DateTimeNormalizer::FORMAT_KEY => 'Y-m-d'])]
    #[Groups(['patient:read', 'patient:write'])]
    private ?\DateTimeImmutable $dateOfBirth = null;

    #[ORM\ManyToOne]
    #[ORM\JoinColumn(nullable: false)]
    #[Assert\NotNull]
    #[Groups(['patient:read', 'patient:write'])]
    private ?Center $center = null;

    #[ORM\Column(length: 20, enumType: EligibilityStatus::class, options: ['default' => 'enregistre'])]
    #[Groups(['patient:read', 'patient:write'])]
    private EligibilityStatus $eligibilityStatus = EligibilityStatus::Registered;

    /** @var Collection<int, EligibilityReason> motifs cochés quand le patient est non éligible */
    #[ORM\ManyToMany(targetEntity: EligibilityReason::class)]
    #[ORM\JoinTable(name: 'patient_eligibility_reason')]
    #[Groups(['patient:read', 'patient:write'])]
    private Collection $eligibilityReasons;

    #[ORM\Column(type: Types::TEXT, nullable: true)]
    #[Groups(['patient:read', 'patient:write'])]
    private ?string $eligibilityNotes = null;

    /** Réponses au questionnaire profil patient (données médicales) */
    #[ORM\Column(type: Types::JSON, options: ['jsonb' => true, 'default' => '{}'])]
    #[Groups(['patient:read', 'patient:write'])]
    private array $medicalData = [];

    #[ORM\Column(type: Types::JSON, options: ['jsonb' => true, 'default' => '{}'])]
    #[Groups(['patient:read', 'patient:write'])]
    private array $administrativeData = [];

    #[ORM\ManyToOne]
    #[ORM\JoinColumn(nullable: false)]
    #[Groups(['patient:read'])]
    private ?User $createdBy = null;

    #[ORM\Column(type: Types::DATETIMETZ_IMMUTABLE)]
    #[Groups(['patient:read'])]
    private \DateTimeImmutable $createdAt;

    #[ORM\Column(type: Types::DATETIMETZ_IMMUTABLE)]
    #[Groups(['patient:read'])]
    private \DateTimeImmutable $updatedAt;

    /** Sorti de la file active (≠ patient ayant achevé son programme) */
    #[ORM\Column(type: Types::DATETIMETZ_IMMUTABLE, nullable: true)]
    #[Groups(['patient:read'])]
    private ?\DateTimeImmutable $removedAt = null;

    public function __construct()
    {
        $this->id = Uuid::v7();
        $this->eligibilityReasons = new ArrayCollection();
        $this->createdAt = new \DateTimeImmutable();
        $this->updatedAt = $this->createdAt;
    }

    #[ORM\PreUpdate]
    public function touch(): void
    {
        $this->updatedAt = new \DateTimeImmutable();
    }

    #[Assert\Callback]
    public function validateEligibility(ExecutionContextInterface $context): void
    {
        if (EligibilityStatus::NotEligible === $this->eligibilityStatus && $this->eligibilityReasons->isEmpty()) {
            $context->buildViolation('Un patient non éligible doit avoir au moins un motif.')
                ->atPath('eligibilityReasons')
                ->addViolation();
        }
    }

    public function getScopeCenter(): ?Center
    {
        return $this->center;
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

    public function getFirstName(): string
    {
        return $this->firstName;
    }

    public function setFirstName(string $firstName): static
    {
        $this->firstName = $firstName;

        return $this;
    }

    public function getLastName(): string
    {
        return $this->lastName;
    }

    public function setLastName(string $lastName): static
    {
        $this->lastName = $lastName;

        return $this;
    }

    public function getDateOfBirth(): ?\DateTimeImmutable
    {
        return $this->dateOfBirth;
    }

    public function setDateOfBirth(?\DateTimeImmutable $dateOfBirth): static
    {
        $this->dateOfBirth = $dateOfBirth;

        return $this;
    }

    public function getCenter(): ?Center
    {
        return $this->center;
    }

    public function setCenter(?Center $center): static
    {
        $this->center = $center;

        return $this;
    }

    public function getEligibilityStatus(): EligibilityStatus
    {
        return $this->eligibilityStatus;
    }

    public function setEligibilityStatus(EligibilityStatus $eligibilityStatus): static
    {
        $this->eligibilityStatus = $eligibilityStatus;

        return $this;
    }

    /**
     * @return Collection<int, EligibilityReason>
     */
    public function getEligibilityReasons(): Collection
    {
        return $this->eligibilityReasons;
    }

    public function addEligibilityReason(EligibilityReason $reason): static
    {
        if (!$this->eligibilityReasons->contains($reason)) {
            $this->eligibilityReasons->add($reason);
        }

        return $this;
    }

    public function removeEligibilityReason(EligibilityReason $reason): static
    {
        $this->eligibilityReasons->removeElement($reason);

        return $this;
    }

    public function getEligibilityNotes(): ?string
    {
        return $this->eligibilityNotes;
    }

    public function setEligibilityNotes(?string $eligibilityNotes): static
    {
        $this->eligibilityNotes = $eligibilityNotes;

        return $this;
    }

    public function getMedicalData(): array
    {
        return $this->medicalData;
    }

    public function setMedicalData(array $medicalData): static
    {
        $this->medicalData = $medicalData;

        return $this;
    }

    public function getAdministrativeData(): array
    {
        return $this->administrativeData;
    }

    public function setAdministrativeData(array $administrativeData): static
    {
        $this->administrativeData = $administrativeData;

        return $this;
    }

    public function getCreatedBy(): ?User
    {
        return $this->createdBy;
    }

    public function getCreatedAt(): \DateTimeImmutable
    {
        return $this->createdAt;
    }

    public function getUpdatedAt(): \DateTimeImmutable
    {
        return $this->updatedAt;
    }

    public function getRemovedAt(): ?\DateTimeImmutable
    {
        return $this->removedAt;
    }

    public function archive(): void
    {
        $this->removedAt ??= new \DateTimeImmutable();
    }

    public function isArchived(): bool
    {
        return null !== $this->removedAt;
    }
}
