<?php

namespace App\Entity;

use ApiPlatform\Doctrine\Orm\Filter\ExactFilter;
use ApiPlatform\Doctrine\Orm\Filter\PartialSearchFilter;
use ApiPlatform\Metadata\ApiProperty;
use ApiPlatform\Metadata\ApiResource;
use ApiPlatform\Metadata\Delete;
use ApiPlatform\Metadata\Get;
use ApiPlatform\Metadata\GetCollection;
use ApiPlatform\Metadata\Patch;
use ApiPlatform\Metadata\Post;
use ApiPlatform\Metadata\QueryParameter;
use App\Entity\Contract\ArchivableInterface;
use App\Enum\UserRole;
use App\Repository\UserRepository;
use App\State\ArchiveProcessor;
use App\State\UserProcessor;
use Doctrine\Common\Collections\ArrayCollection;
use Doctrine\Common\Collections\Collection;
use Doctrine\DBAL\Types\Types;
use Doctrine\ORM\Mapping as ORM;
use Symfony\Bridge\Doctrine\Types\UuidType;
use Symfony\Bridge\Doctrine\Validator\Constraints\UniqueEntity;
use Symfony\Component\Security\Core\User\PasswordAuthenticatedUserInterface;
use Symfony\Component\Security\Core\User\UserInterface;
use Symfony\Component\Serializer\Attribute\Groups;
use Symfony\Component\Uid\Uuid;
use Symfony\Component\Validator\Constraints as Assert;
use Symfony\Component\Validator\Context\ExecutionContextInterface;

/**
 * Compte d'un soignant : IDE d'entraînement, cadre de service ou administrateur national.
 *
 * Création / modification : un cadre gère les IDE de ses centres, un administrateur
 * national gère tout le monde (règles appliquées dans UserProcessor et UserVoter).
 */
#[ORM\Entity(repositoryClass: UserRepository::class)]
#[ORM\Table(name: 'app_user')]
#[ORM\HasLifecycleCallbacks]
#[UniqueEntity('email', message: 'Cet email est déjà utilisé.')]
#[ApiResource(
    operations: [
        new GetCollection(
            security: "is_granted('ROLE_CADRE')",
            parameters: [
                'search' => new QueryParameter(filter: new PartialSearchFilter(), property: 'lastName'),
                'role' => new QueryParameter(filter: new ExactFilter(), property: 'role'),
                'status' => new QueryParameter(
                schema: ['type' => 'string', 'enum' => ['active', 'archived', 'all']],
                description: 'active (défaut), archived ou all — appliqué par CenterScopeExtension',
            ),
            ],
        ),
        new Get(security: "is_granted('USER_VIEW', object)"),
        new Post(
            security: "is_granted('ROLE_CADRE')",
            validationContext: ['groups' => ['Default', 'user:create']],
            processor: UserProcessor::class,
        ),
        new Patch(security: "is_granted('USER_MANAGE', object)", processor: UserProcessor::class),
        new Delete(security: "is_granted('USER_MANAGE', object)", processor: ArchiveProcessor::class),
    ],
    normalizationContext: ['groups' => ['user:read']],
    denormalizationContext: ['groups' => ['user:write']],
    order: ['lastName' => 'ASC', 'firstName' => 'ASC'],
)]
class User implements UserInterface, PasswordAuthenticatedUserInterface, ArchivableInterface
{
    #[ORM\Id]
    #[ORM\Column(type: UuidType::NAME)]
    #[Groups(['user:read', 'me:read', 'author:read'])]
    private Uuid $id;

    #[ORM\Column(length: 180, unique: true)]
    #[Assert\NotBlank]
    #[Assert\Email]
    #[Assert\Length(max: 180)]
    #[Groups(['user:read', 'user:write', 'me:read'])]
    private string $email = '';

    #[ORM\Column(length: 100)]
    #[Assert\NotBlank]
    #[Assert\Length(max: 100)]
    #[Groups(['user:read', 'user:write', 'me:read', 'author:read'])]
    private string $firstName = '';

    #[ORM\Column(length: 100)]
    #[Assert\NotBlank]
    #[Assert\Length(max: 100)]
    #[Groups(['user:read', 'user:write', 'me:read', 'author:read'])]
    private string $lastName = '';

    #[ORM\Column(length: 20, enumType: UserRole::class)]
    #[Assert\NotNull]
    #[Groups(['user:read', 'user:write', 'me:read'])]
    private UserRole $role = UserRole::Ide;

    /** @var Collection<int, Center> centres de dialyse auxquels l'utilisateur est affilié */
    #[ORM\ManyToMany(targetEntity: Center::class)]
    #[ORM\JoinTable(name: 'user_center')]
    #[Groups(['user:read', 'user:write', 'me:read'])]
    private Collection $centers;

    #[ORM\Column]
    private string $password = '';

    /** Mot de passe en clair, uniquement en écriture : haché par UserProcessor */
    #[Assert\NotBlank(groups: ['user:create'])]
    #[Assert\Length(min: 12, max: 4096, minMessage: 'Le mot de passe doit contenir au moins {{ limit }} caractères.')]
    #[Assert\PasswordStrength(minScore: Assert\PasswordStrength::STRENGTH_MEDIUM, message: 'Le mot de passe est trop faible.')]
    #[ApiProperty(readable: false)]
    #[Groups(['user:write'])]
    private ?string $plainPassword = null;

    /** Code personnel de l'IDE (haché) pour quitter une séance en cours vers le back office */
    #[ORM\Column(nullable: true)]
    private ?string $securityCodeHash = null;

    #[ORM\Column(type: Types::DATETIMETZ_IMMUTABLE, nullable: true)]
    private ?\DateTimeImmutable $securityCodeUpdatedAt = null;

    #[ORM\Column(type: Types::DATETIMETZ_IMMUTABLE, nullable: true)]
    #[Groups(['user:read'])]
    private ?\DateTimeImmutable $lastLoginAt = null;

    #[ORM\Column(type: Types::DATETIMETZ_IMMUTABLE)]
    #[Groups(['user:read', 'me:read'])]
    private \DateTimeImmutable $createdAt;

    #[ORM\Column(type: Types::DATETIMETZ_IMMUTABLE)]
    #[Groups(['user:read'])]
    private \DateTimeImmutable $updatedAt;

    #[ORM\Column(type: Types::DATETIMETZ_IMMUTABLE, nullable: true)]
    #[Groups(['user:read'])]
    private ?\DateTimeImmutable $archivedAt = null;

    public function __construct()
    {
        $this->id = Uuid::v7();
        $this->centers = new ArrayCollection();
        $this->createdAt = new \DateTimeImmutable();
        $this->updatedAt = $this->createdAt;
    }

    #[ORM\PreUpdate]
    public function touch(): void
    {
        $this->updatedAt = new \DateTimeImmutable();
    }

    #[Assert\Callback]
    public function validateCenters(ExecutionContextInterface $context): void
    {
        // Sans centre, une IDE ou un cadre ne verrait aucun patient
        if (UserRole::AdminNational !== $this->role && $this->centers->isEmpty()) {
            $context->buildViolation('Un profil IDE ou cadre doit être affilié à au moins un centre.')
                ->atPath('centers')
                ->addViolation();
        }
    }

    public function getId(): Uuid
    {
        return $this->id;
    }

    public function getEmail(): string
    {
        return $this->email;
    }

    public function setEmail(string $email): static
    {
        $this->email = mb_strtolower(trim($email));

        return $this;
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

    public function getFullName(): string
    {
        return trim($this->firstName.' '.$this->lastName);
    }

    public function getRole(): UserRole
    {
        return $this->role;
    }

    public function setRole(UserRole $role): static
    {
        $this->role = $role;

        return $this;
    }

    /**
     * @return Collection<int, Center>
     */
    public function getCenters(): Collection
    {
        return $this->centers;
    }

    public function addCenter(Center $center): static
    {
        if (!$this->centers->contains($center)) {
            $this->centers->add($center);
        }

        return $this;
    }

    public function removeCenter(Center $center): static
    {
        $this->centers->removeElement($center);

        return $this;
    }

    public function isAffiliatedTo(Center $center): bool
    {
        foreach ($this->centers as $affiliated) {
            if ($affiliated->getId()->equals($center->getId())) {
                return true;
            }
        }

        return false;
    }

    public function getUserIdentifier(): string
    {
        return $this->email;
    }

    public function getRoles(): array
    {
        return [$this->role->securityRole()];
    }

    public function getPassword(): string
    {
        return $this->password;
    }

    public function setPassword(string $hashedPassword): static
    {
        $this->password = $hashedPassword;

        return $this;
    }

    public function getPlainPassword(): ?string
    {
        return $this->plainPassword;
    }

    public function setPlainPassword(?string $plainPassword): static
    {
        $this->plainPassword = $plainPassword;

        return $this;
    }

    #[\Deprecated]
    public function eraseCredentials(): void
    {
        // Déprécié depuis Symfony 7.3 : le mot de passe en clair est effacé par UserProcessor
    }

    public function getSecurityCodeHash(): ?string
    {
        return $this->securityCodeHash;
    }

    public function setSecurityCodeHash(string $hash): static
    {
        $this->securityCodeHash = $hash;
        $this->securityCodeUpdatedAt = new \DateTimeImmutable();

        return $this;
    }

    /** L'IDE doit configurer son code à la première connexion tant que ceci est faux */
    #[Groups(['user:read', 'me:read'])]
    public function isSecurityCodeConfigured(): bool
    {
        return null !== $this->securityCodeHash;
    }

    #[Groups(['me:read'])]
    public function getSecurityCodeUpdatedAt(): ?\DateTimeImmutable
    {
        return $this->securityCodeUpdatedAt;
    }

    public function getLastLoginAt(): ?\DateTimeImmutable
    {
        return $this->lastLoginAt;
    }

    public function markLoggedIn(): void
    {
        $this->lastLoginAt = new \DateTimeImmutable();
    }

    public function getCreatedAt(): \DateTimeImmutable
    {
        return $this->createdAt;
    }

    public function getUpdatedAt(): \DateTimeImmutable
    {
        return $this->updatedAt;
    }

    public function getArchivedAt(): ?\DateTimeImmutable
    {
        return $this->archivedAt;
    }

    public function archive(): void
    {
        $this->archivedAt ??= new \DateTimeImmutable();
    }

    public function restore(): void
    {
        $this->archivedAt = null;
    }

    public function isArchived(): bool
    {
        return null !== $this->archivedAt;
    }
}
