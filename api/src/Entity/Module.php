<?php

namespace App\Entity;

use ApiPlatform\Doctrine\Orm\Filter\ExactFilter;
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
use App\Training\ScoreCalculator;
use Doctrine\Common\Collections\ArrayCollection;
use Doctrine\Common\Collections\Collection;
use Doctrine\DBAL\Types\Types;
use Doctrine\ORM\Mapping as ORM;
use Symfony\Bridge\Doctrine\Types\UuidType;
use Symfony\Bridge\Doctrine\Validator\Constraints\UniqueEntity;
use Symfony\Component\Serializer\Attribute\Groups;
use Symfony\Component\Serializer\Attribute\SerializedName;
use Symfony\Component\Uid\Uuid;
use Symfony\Component\Validator\Constraints as Assert;

/**
 * Cours (= séance d'entraînement = module) : 32 au total (doc/Liste-seances.pdf) —
 * la séance de démarrage (S0), 24 séances systématiques (S1 à S24, pré-cochées dans le parcours)
 * et 7 séances optionnelles (O1 à O7).
 *
 * La liste n'expose pas le contenu (lourd) : il n'est renvoyé que par GET /api/modules/{id}.
 */
#[ORM\Entity]
#[ORM\HasLifecycleCallbacks]
#[UniqueEntity('code', message: 'Ce code de séance est déjà utilisé.')]
#[ApiResource(
    operations: [
        new GetCollection(
            normalizationContext: ['groups' => ['module:list']],
            parameters: [
                'chapter' => new QueryParameter(filter: new IriFilter(), property: 'chapter'),
                'mandatory' => new QueryParameter(filter: new ExactFilter(), property: 'mandatory'),
                'published' => new QueryParameter(filter: new ExactFilter(), property: 'published'),
            ],
        ),
        new Get(),
        new Post(security: "is_granted('ROLE_ADMIN_NATIONAL')"),
        new Patch(security: "is_granted('ROLE_ADMIN_NATIONAL')"),
        new Delete(security: "is_granted('ROLE_ADMIN_NATIONAL')", processor: ArchiveProcessor::class),
    ],
    normalizationContext: ['groups' => ['module:list', 'module:read']],
    denormalizationContext: ['groups' => ['module:write']],
    order: ['position' => 'ASC'],
    paginationEnabled: false,
)]
class Module implements ArchivableInterface
{
    use ArchivableTrait;

    public const MAX_COMPETENCIES = 5;

    #[ORM\Id]
    #[ORM\Column(type: UuidType::NAME)]
    #[Groups(['module:list', 'program:read', 'session:read'])]
    private Uuid $id;

    /**
     * Code stable de la séance (S0 = démarrage, S1…S24 systématiques, O1…O7 optionnelles, PT = post-test) :
     * c'est par lui que l'intégration des contenus désigne une séance.
     */
    #[ORM\Column(length: 10, unique: true)]
    #[Assert\NotBlank]
    #[Assert\Regex('/^(S\d{1,2}|O\d{1,2}|PT)$/', message: 'Code attendu : S0 à S99, O1 à O99 ou PT (post-test).')]
    #[Groups(['module:list', 'module:write', 'program:read', 'session:read'])]
    private string $code = '';

    /** Ordre d'affichage dans le parcours */
    #[ORM\Column(options: ['default' => 0])]
    #[Assert\PositiveOrZero]
    #[Groups(['module:list', 'module:write', 'program:read'])]
    private int $position = 0;

    #[ORM\Column(length: 255)]
    #[Assert\NotBlank]
    #[Assert\Length(max: 255)]
    #[Groups(['module:list', 'module:write', 'program:read', 'session:read'])]
    private string $title = '';

    #[ORM\Column(type: Types::TEXT, options: ['default' => ''])]
    #[Groups(['module:list', 'module:write'])]
    private string $description = '';

    #[ORM\ManyToOne]
    #[ORM\JoinColumn(onDelete: 'SET NULL')]
    #[Groups(['module:list', 'module:write', 'program:read'])]
    private ?Chapter $chapter = null;

    /** Durée indicative en minutes (une séance dure 30 à 40 min) */
    #[ORM\Column(options: ['default' => 30])]
    #[Assert\Positive]
    #[Groups(['module:list', 'module:write', 'program:read'])]
    private int $estimatedDuration = 30;

    /** Cours systématique : sélectionné par défaut dans le parcours du patient */
    #[ORM\Column(options: ['default' => true])]
    #[Groups(['module:list', 'module:write', 'program:read'])]
    private bool $mandatory = true;

    /** Cours zéro de démarrage / présentation du parcours */
    #[ORM\Column(options: ['default' => false])]
    #[Groups(['module:list', 'module:write', 'program:read'])]
    private bool $intro = false;

    #[ORM\Column(options: ['default' => true])]
    #[Groups(['module:list', 'module:write'])]
    private bool $published = true;

    /** Pages et blocs du cours (format du lecteur front) */
    #[ORM\Column(type: Types::JSON, options: ['jsonb' => true, 'default' => '[]'])]
    #[Groups(['module:read', 'module:write'])]
    private array $content = [];

    /** @var Collection<int, ModuleCompetency> compétences d'entraînement validées par l'IDE en fin de séance */
    #[ORM\OneToMany(targetEntity: ModuleCompetency::class, mappedBy: 'module')]
    #[ORM\OrderBy(['position' => 'ASC'])]
    private Collection $competencies;

    #[ORM\Column(type: Types::DATETIMETZ_IMMUTABLE)]
    private \DateTimeImmutable $createdAt;

    #[ORM\Column(type: Types::DATETIMETZ_IMMUTABLE)]
    #[Groups(['module:read'])]
    private \DateTimeImmutable $updatedAt;

    public function __construct()
    {
        $this->id = Uuid::v7();
        $this->competencies = new ArrayCollection();
        $this->createdAt = new \DateTimeImmutable();
        $this->updatedAt = $this->createdAt;
    }

    #[ORM\PreUpdate]
    public function touch(): void
    {
        $this->updatedAt = new \DateTimeImmutable();
    }

    public function getId(): Uuid
    {
        return $this->id;
    }

    public function getCode(): string
    {
        return $this->code;
    }

    public function setCode(string $code): static
    {
        $this->code = $code;

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

    public function getTitle(): string
    {
        return $this->title;
    }

    public function setTitle(string $title): static
    {
        $this->title = $title;

        return $this;
    }

    public function getDescription(): string
    {
        return $this->description;
    }

    public function setDescription(string $description): static
    {
        $this->description = $description;

        return $this;
    }

    public function getChapter(): ?Chapter
    {
        return $this->chapter;
    }

    public function setChapter(?Chapter $chapter): static
    {
        $this->chapter = $chapter;

        return $this;
    }

    public function getEstimatedDuration(): int
    {
        return $this->estimatedDuration;
    }

    public function setEstimatedDuration(int $estimatedDuration): static
    {
        $this->estimatedDuration = $estimatedDuration;

        return $this;
    }

    public function isMandatory(): bool
    {
        return $this->mandatory;
    }

    public function setMandatory(bool $mandatory): static
    {
        $this->mandatory = $mandatory;

        return $this;
    }

    public function isIntro(): bool
    {
        return $this->intro;
    }

    public function setIntro(bool $intro): static
    {
        $this->intro = $intro;

        return $this;
    }

    public function isPublished(): bool
    {
        return $this->published;
    }

    public function setPublished(bool $published): static
    {
        $this->published = $published;

        return $this;
    }

    public function getContent(): array
    {
        return $this->content;
    }

    public function setContent(array $content): static
    {
        $this->content = $content;

        return $this;
    }

    /**
     * @return Collection<int, ModuleCompetency>
     */
    public function getCompetencies(): Collection
    {
        return $this->competencies;
    }

    /**
     * Compétences en vigueur (les compétences archivées restent liées aux séances déjà évaluées).
     *
     * @return list<ModuleCompetency>
     */
    #[Groups(['module:read'])]
    #[SerializedName('competencies')]
    public function getActiveCompetencies(): array
    {
        return array_values($this->competencies->filter(static fn (ModuleCompetency $c) => !$c->isArchived())->toArray());
    }

    #[Groups(['module:list'])]
    public function getPageCount(): int
    {
        return \count($this->content);
    }

    /** Exercices notés du cours (voir ScoreCalculator) */
    #[Groups(['module:list'])]
    public function getExerciseCount(): int
    {
        $count = 0;
        foreach ($this->content as $page) {
            foreach ($page['blocks'] ?? [] as $block) {
                $count += (int) (ScoreCalculator::expectedAnswers($block) > 0);
            }
        }

        return $count;
    }

    #[Groups(['module:list'])]
    public function getCompetencyCount(): int
    {
        return $this->competencies->count();
    }

    public function getCreatedAt(): \DateTimeImmutable
    {
        return $this->createdAt;
    }

    public function getUpdatedAt(): \DateTimeImmutable
    {
        return $this->updatedAt;
    }
}
