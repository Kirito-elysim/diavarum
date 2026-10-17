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
use App\State\CodexTestProcessor;
use Doctrine\DBAL\Types\Types;
use Doctrine\ORM\Mapping as ORM;
use Symfony\Bridge\Doctrine\Types\UuidType;
use Symfony\Component\Serializer\Attribute\Groups;
use Symfony\Component\Uid\Uuid;
use Symfony\Component\Validator\Constraints as Assert;

/**
 * Test CODEX réalisé par le patient sous la supervision de l'IDE :
 * 3 mots à mémoriser, placement des aiguilles d'une horloge, rappel des 3 mots.
 */
#[ORM\Entity]
#[ApiResource(
    operations: [
        new GetCollection(parameters: [
            'patient' => new QueryParameter(filter: new IriFilter(), property: 'patient'),
        ]),
        new Get(),
        new Post(securityPostDenormalize: "is_granted('CENTER_SCOPE', object)", processor: CodexTestProcessor::class),
    ],
    normalizationContext: ['groups' => ['codex_test:read', 'author:read']],
    denormalizationContext: ['groups' => ['codex_test:write']],
    order: ['createdAt' => 'DESC'],
)]
class CodexTest implements CenterScopedInterface, AuthoredInterface
{
    #[ORM\Id]
    #[ORM\Column(type: UuidType::NAME)]
    #[Groups(['codex_test:read'])]
    private Uuid $id;

    #[ORM\ManyToOne]
    #[ORM\JoinColumn(nullable: false)]
    #[Assert\NotNull]
    #[Groups(['codex_test:read', 'codex_test:write'])]
    private ?Patient $patient = null;

    #[ORM\ManyToOne]
    #[ORM\JoinColumn(nullable: false)]
    #[Groups(['codex_test:read'])]
    private ?User $nurse = null;

    /** @var list<string> les 3 mots de la liste du protocole */
    #[ORM\Column(type: Types::JSON, options: ['jsonb' => true])]
    #[Assert\Count(exactly: 3)]
    #[Assert\All([new Assert\NotBlank(), new Assert\Type('string')])]
    #[Groups(['codex_test:read', 'codex_test:write'])]
    private array $words = [];

    /** Heure donnée à l'oral par l'IDE (HH:MM) */
    #[ORM\Column(length: 5)]
    #[Assert\NotBlank]
    #[Assert\Regex('/^([01]?\d|2[0-3]):[0-5]\d$/', message: 'Heure attendue au format HH:MM.')]
    #[Groups(['codex_test:read', 'codex_test:write'])]
    private string $clockTime = '';

    #[ORM\Column]
    #[Groups(['codex_test:read', 'codex_test:write'])]
    private bool $clockTestPassed = false;

    #[ORM\Column]
    #[Groups(['codex_test:read', 'codex_test:write'])]
    private bool $wordRecallPassed = false;

    /** @var list<bool>|null Null pour les anciens tests. */
    #[ORM\Column(type: Types::JSON, nullable: true, options: ['jsonb' => true])]
    #[Groups(['codex_test:read', 'codex_test:write'])]
    private ?array $clockChecks = null;

    /** @var list<int>|null */
    #[ORM\Column(type: Types::JSON, nullable: true, options: ['jsonb' => true])]
    #[Groups(['codex_test:read', 'codex_test:write'])]
    private ?array $orientationAnswers = null;

    public const WORD_LISTS = [['Clé', 'ballon', 'citron'], ['Cigare', 'fleur', 'porte']];

    public function getClockChecks(): ?array
    {
        return $this->clockChecks;
    }

    public function setClockChecks(?array $checks): static
    {
        $this->clockChecks = $checks;

        return $this;
    }

    public function getOrientationAnswers(): ?array
    {
        return $this->orientationAnswers;
    }

    public function setOrientationAnswers(?array $answers): static
    {
        $this->orientationAnswers = $answers;

        return $this;
    }

    #[Groups(['codex_test:read'])]
    public function getOrientationScore(): ?int
    {
        return null === $this->orientationAnswers ? null : array_sum($this->orientationAnswers);
    }

    #[Groups(['codex_test:read'])]
    public function isNephrologistReviewRequired(): bool
    {
        return null !== $this->clockChecks && !$this->isPassed();
    }

    #[ORM\Column(type: Types::TEXT, nullable: true)]
    #[Groups(['codex_test:read', 'codex_test:write'])]
    private ?string $notes = null;

    #[ORM\Column(type: Types::DATETIMETZ_IMMUTABLE)]
    #[Groups(['codex_test:read'])]
    private \DateTimeImmutable $createdAt;

    public function __construct()
    {
        $this->id = Uuid::v7();
        $this->createdAt = new \DateTimeImmutable();
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

    public function getNurse(): ?User
    {
        return $this->nurse;
    }

    /**
     * @return list<string>
     */
    public function getWords(): array
    {
        return $this->words;
    }

    /**
     * @param list<string> $words
     */
    public function setWords(array $words): static
    {
        $this->words = array_values($words);

        return $this;
    }

    public function getClockTime(): string
    {
        return $this->clockTime;
    }

    public function setClockTime(string $clockTime): static
    {
        $this->clockTime = $clockTime;

        return $this;
    }

    public function isClockTestPassed(): bool
    {
        return $this->clockTestPassed;
    }

    public function setClockTestPassed(bool $clockTestPassed): static
    {
        $this->clockTestPassed = $clockTestPassed;

        return $this;
    }

    public function isWordRecallPassed(): bool
    {
        return $this->wordRecallPassed;
    }

    public function setWordRecallPassed(bool $wordRecallPassed): static
    {
        $this->wordRecallPassed = $wordRecallPassed;

        return $this;
    }

    /** Protocole actuel : deux épreuves réussies, ou une seule échouée et orientation >= 4 ; anciens tests inchangés. */
    #[Groups(['codex_test:read'])]
    public function isPassed(): bool
    {
        return ($this->clockTestPassed && $this->wordRecallPassed) || (null !== $this->clockChecks && ($this->getOrientationScore() ?? 0) >= 4);
    }

    public function getNotes(): ?string
    {
        return $this->notes;
    }

    public function setNotes(?string $notes): static
    {
        $this->notes = $notes;

        return $this;
    }

    public function getCreatedAt(): \DateTimeImmutable
    {
        return $this->createdAt;
    }
}
