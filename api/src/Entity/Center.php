<?php

namespace App\Entity;

use ApiPlatform\Doctrine\Orm\Filter\PartialSearchFilter;
use ApiPlatform\Metadata\ApiResource;
use ApiPlatform\Metadata\Delete;
use ApiPlatform\Metadata\Get;
use ApiPlatform\Metadata\GetCollection;
use ApiPlatform\Metadata\Patch;
use ApiPlatform\Metadata\Post;
use ApiPlatform\Metadata\QueryParameter;
use App\Entity\Contract\ArchivableInterface;
use App\State\ArchiveProcessor;
use App\State\CenterProvider;
use Doctrine\DBAL\Types\Types;
use Doctrine\ORM\Mapping as ORM;
use Symfony\Bridge\Doctrine\Types\UuidType;
use Symfony\Bridge\Doctrine\Validator\Constraints\UniqueEntity;
use Symfony\Component\Serializer\Attribute\Groups;
use Symfony\Component\Uid\Uuid;
use Symfony\Component\Validator\Constraints as Assert;

/**
 * Centre de dialyse : identité administrative (FINESS, adresse, contact, capacité)
 * et indicateurs calculés à la lecture (patients, IDE, cadres) par CenterProvider.
 */
#[ORM\Entity]
#[UniqueEntity('finess', message: 'Ce numéro FINESS est déjà attribué à un autre centre.', ignoreNull: true)]
#[ApiResource(
    operations: [
        new GetCollection(provider: CenterProvider::class, parameters: [
            'name' => new QueryParameter(filter: new PartialSearchFilter(), property: 'name'),
            'status' => new QueryParameter(
            schema: ['type' => 'string', 'enum' => ['active', 'archived', 'all']],
            description: 'active (défaut), archived ou all — appliqué par CenterScopeExtension',
        ),
        ]),
        new Get(provider: CenterProvider::class),
        new Post(security: "is_granted('ROLE_ADMIN_NATIONAL')"),
        new Patch(security: "is_granted('ROLE_ADMIN_NATIONAL')"),
        new Delete(security: "is_granted('ROLE_ADMIN_NATIONAL')", processor: ArchiveProcessor::class),
    ],
    normalizationContext: ['groups' => ['center:read']],
    denormalizationContext: ['groups' => ['center:write']],
    order: ['name' => 'ASC'],
)]
class Center implements ArchivableInterface
{
    /** Régions françaises (métropole et outre-mer) */
    public const REGIONS = [
        'Auvergne-Rhône-Alpes', 'Bourgogne-Franche-Comté', 'Bretagne', 'Centre-Val de Loire', 'Corse',
        'Grand Est', 'Hauts-de-France', 'Île-de-France', 'Normandie', 'Nouvelle-Aquitaine', 'Occitanie',
        'Pays de la Loire', "Provence-Alpes-Côte d'Azur", 'Guadeloupe', 'Guyane', 'La Réunion', 'Martinique', 'Mayotte',
    ];

    #[ORM\Id]
    #[ORM\Column(type: UuidType::NAME)]
    #[Groups(['center:read', 'user:read', 'me:read', 'patient:read', 'program:read', 'program:list', 'session:read'])]
    private Uuid $id;

    #[ORM\Column(length: 255)]
    #[Assert\NotBlank]
    #[Assert\Length(max: 255)]
    #[Groups(['center:read', 'center:write', 'user:read', 'me:read', 'patient:read', 'program:read', 'program:list', 'session:read'])]
    private string $name = '';

    #[ORM\Column(length: 255)]
    #[Assert\NotBlank]
    #[Assert\Length(max: 255)]
    #[Groups(['center:read', 'center:write', 'me:read'])]
    private string $city = '';

    #[ORM\Column(length: 100, options: ['default' => 'France'])]
    #[Assert\NotBlank]
    #[Groups(['center:read', 'center:write'])]
    private string $country = 'France';

    /** Numéro FINESS de l'établissement (9 caractères ; 2A/2B pour la Corse) */
    #[ORM\Column(length: 9, unique: true, nullable: true)]
    #[Assert\Regex('/^\d[\dAB]\d{7}$/', message: 'Le numéro FINESS compte 9 caractères (ex. 750012345).')]
    #[Groups(['center:read', 'center:write'])]
    private ?string $finess = null;

    #[ORM\Column(length: 255, nullable: true)]
    #[Assert\Length(max: 255)]
    #[Groups(['center:read', 'center:write'])]
    private ?string $address = null;

    #[ORM\Column(length: 5, nullable: true)]
    #[Assert\Regex('/^\d{5}$/', message: 'Le code postal compte 5 chiffres.')]
    #[Groups(['center:read', 'center:write'])]
    private ?string $postalCode = null;

    #[ORM\Column(length: 50, nullable: true)]
    #[Assert\Choice(choices: self::REGIONS, message: 'Région inconnue.')]
    #[Groups(['center:read', 'center:write'])]
    private ?string $region = null;

    #[ORM\Column(length: 20, nullable: true)]
    #[Assert\Regex('/^\+?[0-9 .()-]{10,20}$/', message: 'Numéro de téléphone invalide.')]
    #[Groups(['center:read', 'center:write'])]
    private ?string $phone = null;

    #[ORM\Column(length: 180, nullable: true)]
    #[Assert\Email(message: 'Adresse email invalide.')]
    #[Assert\Length(max: 180)]
    #[Groups(['center:read', 'center:write'])]
    private ?string $email = null;

    /** Nombre de postes de dialyse */
    #[ORM\Column(nullable: true)]
    #[Assert\Range(min: 1, max: 200, notInRangeMessage: 'Entre {{ min }} et {{ max }} postes.')]
    #[Groups(['center:read', 'center:write'])]
    private ?int $stations = null;

    /** Indicateurs calculés par CenterProvider (non stockés) */
    #[Groups(['center:read'])]
    private int $patientCount = 0;

    #[Groups(['center:read'])]
    private int $nurseCount = 0;

    /** @var list<array{id: string, name: string}> cadres de service affiliés */
    #[Groups(['center:read'])]
    private array $managers = [];

    #[ORM\Column(type: Types::DATETIMETZ_IMMUTABLE)]
    #[Groups(['center:read'])]
    private \DateTimeImmutable $createdAt;

    #[ORM\Column(type: Types::DATETIMETZ_IMMUTABLE, nullable: true)]
    #[Groups(['center:read'])]
    private ?\DateTimeImmutable $archivedAt = null;

    public function __construct()
    {
        $this->id = Uuid::v7();
        $this->createdAt = new \DateTimeImmutable();
    }

    public function getId(): Uuid
    {
        return $this->id;
    }

    public function getName(): string
    {
        return $this->name;
    }

    public function setName(string $name): static
    {
        $this->name = $name;

        return $this;
    }

    public function getCity(): string
    {
        return $this->city;
    }

    public function setCity(string $city): static
    {
        $this->city = $city;

        return $this;
    }

    public function getCountry(): string
    {
        return $this->country;
    }

    public function setCountry(string $country): static
    {
        $this->country = $country;

        return $this;
    }

    public function getFiness(): ?string
    {
        return $this->finess;
    }

    public function setFiness(?string $finess): static
    {
        $this->finess = self::blankToNull($finess) ? strtoupper(str_replace(' ', '', $finess)) : null;

        return $this;
    }

    public function getAddress(): ?string
    {
        return $this->address;
    }

    public function setAddress(?string $address): static
    {
        $this->address = self::blankToNull($address);

        return $this;
    }

    public function getPostalCode(): ?string
    {
        return $this->postalCode;
    }

    public function setPostalCode(?string $postalCode): static
    {
        $this->postalCode = self::blankToNull($postalCode);

        return $this;
    }

    public function getRegion(): ?string
    {
        return $this->region;
    }

    public function setRegion(?string $region): static
    {
        $this->region = self::blankToNull($region);

        return $this;
    }

    public function getPhone(): ?string
    {
        return $this->phone;
    }

    public function setPhone(?string $phone): static
    {
        $this->phone = self::blankToNull($phone);

        return $this;
    }

    public function getEmail(): ?string
    {
        return $this->email;
    }

    public function setEmail(?string $email): static
    {
        $this->email = self::blankToNull($email);

        return $this;
    }

    public function getStations(): ?int
    {
        return $this->stations;
    }

    public function setStations(?int $stations): static
    {
        $this->stations = $stations;

        return $this;
    }

    public function getPatientCount(): int
    {
        return $this->patientCount;
    }

    public function getNurseCount(): int
    {
        return $this->nurseCount;
    }

    /** @return list<array{id: string, name: string}> */
    public function getManagers(): array
    {
        return $this->managers;
    }

    /** @param list<array{id: string, name: string}> $managers */
    public function setStatistics(int $patientCount, int $nurseCount, array $managers): void
    {
        $this->patientCount = $patientCount;
        $this->nurseCount = $nurseCount;
        $this->managers = $managers;
    }

    private static function blankToNull(?string $value): ?string
    {
        $value = null === $value ? null : trim($value);

        return '' === $value ? null : $value;
    }

    public function getCreatedAt(): \DateTimeImmutable
    {
        return $this->createdAt;
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
