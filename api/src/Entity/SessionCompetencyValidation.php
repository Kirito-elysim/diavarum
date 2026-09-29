<?php

namespace App\Entity;

use ApiPlatform\Doctrine\Orm\Filter\IriFilter;
use ApiPlatform\Metadata\ApiResource;
use ApiPlatform\Metadata\Get;
use ApiPlatform\Metadata\GetCollection;
use ApiPlatform\Metadata\Post;
use ApiPlatform\Metadata\QueryParameter;
use App\Entity\Contract\AuthoredInterface;
use App\Entity\Contract\CenterScopedInterface;
use Doctrine\DBAL\Types\Types;
use Doctrine\ORM\Mapping as ORM;
use Symfony\Bridge\Doctrine\Types\UuidType;
use Symfony\Bridge\Doctrine\Validator\Constraints\UniqueEntity;
use Symfony\Component\Serializer\Attribute\Groups;
use Symfony\Component\Uid\Uuid;
use Symfony\Component\Validator\Constraints as Assert;

/**
 * Compétence d'entraînement cochée (ou non) par l'IDE en fin de séance.
 * Valider les compétences ne valide pas le cours : c'est le bouton « Terminer le cours ».
 */
#[ORM\Entity]
#[ORM\UniqueConstraint(fields: ['session', 'competency'])]
#[UniqueEntity(fields: ['session', 'competency'], message: 'Cette compétence a déjà été évaluée pour cette séance.')]
#[ApiResource(
    operations: [
        new GetCollection(parameters: [
            'session' => new QueryParameter(filter: new IriFilter(), property: 'session'),
        ]),
        new Get(),
        new Post(securityPostDenormalize: "is_granted('CENTER_SCOPE', object)"),
    ],
    normalizationContext: ['groups' => ['competency_validation:read', 'author:read']],
    denormalizationContext: ['groups' => ['competency_validation:write']],
    paginationEnabled: false,
)]
class SessionCompetencyValidation implements CenterScopedInterface, AuthoredInterface
{
    #[ORM\Id]
    #[ORM\Column(type: UuidType::NAME)]
    #[Groups(['competency_validation:read', 'session:read'])]
    private Uuid $id;

    #[ORM\ManyToOne(inversedBy: 'competencyValidations')]
    #[ORM\JoinColumn(nullable: false, onDelete: 'CASCADE')]
    #[Assert\NotNull]
    #[Groups(['competency_validation:read', 'competency_validation:write'])]
    private ?TrainingSession $session = null;

    #[ORM\ManyToOne]
    #[ORM\JoinColumn(nullable: false)]
    #[Assert\NotNull]
    #[Groups(['competency_validation:read', 'competency_validation:write', 'session:read'])]
    private ?ModuleCompetency $competency = null;

    #[ORM\Column]
    #[Groups(['competency_validation:read', 'competency_validation:write', 'session:read'])]
    private bool $validated = false;

    #[ORM\ManyToOne]
    #[ORM\JoinColumn(nullable: false)]
    #[Groups(['competency_validation:read'])]
    private ?User $validatedBy = null;

    #[ORM\Column(type: Types::DATETIMETZ_IMMUTABLE)]
    #[Groups(['competency_validation:read'])]
    private \DateTimeImmutable $createdAt;

    public function __construct()
    {
        $this->id = Uuid::v7();
        $this->createdAt = new \DateTimeImmutable();
    }

    #[Assert\IsTrue(message: 'Cette compétence n\'appartient pas au cours de la séance.')]
    public function isCompetencyOfSessionModule(): bool
    {
        if (null === $this->session?->getModule() || null === $this->competency?->getModule()) {
            return true;
        }

        return $this->session->getModule()->getId()->equals($this->competency->getModule()->getId());
    }

    public function getScopeCenter(): ?Center
    {
        return $this->session?->getScopeCenter();
    }

    public function getAuthor(): ?User
    {
        return $this->validatedBy;
    }

    public function setAuthor(User $author): void
    {
        $this->validatedBy = $author;
    }

    public function getId(): Uuid
    {
        return $this->id;
    }

    public function getSession(): ?TrainingSession
    {
        return $this->session;
    }

    public function setSession(?TrainingSession $session): static
    {
        $this->session = $session;

        return $this;
    }

    public function getCompetency(): ?ModuleCompetency
    {
        return $this->competency;
    }

    public function setCompetency(?ModuleCompetency $competency): static
    {
        $this->competency = $competency;

        return $this;
    }

    public function isValidated(): bool
    {
        return $this->validated;
    }

    public function setValidated(bool $validated): static
    {
        $this->validated = $validated;

        return $this;
    }

    public function getValidatedBy(): ?User
    {
        return $this->validatedBy;
    }

    public function getCreatedAt(): \DateTimeImmutable
    {
        return $this->createdAt;
    }
}
