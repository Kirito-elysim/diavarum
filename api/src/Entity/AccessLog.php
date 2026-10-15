<?php

namespace App\Entity;

use ApiPlatform\Doctrine\Orm\Filter\DateFilter;
use ApiPlatform\Doctrine\Orm\Filter\ExactFilter;
use ApiPlatform\Doctrine\Orm\Filter\PartialSearchFilter;
use ApiPlatform\Metadata\ApiResource;
use ApiPlatform\Metadata\GetCollection;
use ApiPlatform\Metadata\QueryParameter;
use Doctrine\DBAL\Types\Types;
use Doctrine\ORM\Mapping as ORM;
use Symfony\Bridge\Doctrine\Types\UuidType;
use Symfony\Component\Serializer\Attribute\Groups;
use Symfony\Component\Uid\Uuid;

/**
 * Journal des accès (cahier des charges §5 : traçabilité, journalisation des accès, RGPD).
 * Écrit par AccessLogSubscriber, en lecture seule pour les administrateurs nationaux.
 */
#[ORM\Entity(readOnly: true)]
#[ORM\Index(fields: ['occurredAt'])]
#[ORM\Index(fields: ['resourceType', 'resourceId'])]
#[ApiResource(
    operations: [
        new GetCollection(
            security: "is_granted('ROLE_ADMIN_NATIONAL')",
            parameters: [
                'user' => new QueryParameter(filter: new PartialSearchFilter(), property: 'userEmail'),
                'action' => new QueryParameter(filter: new ExactFilter(), property: 'action'),
                'resourceType' => new QueryParameter(filter: new ExactFilter(), property: 'resourceType'),
                'resourceId' => new QueryParameter(filter: new ExactFilter(), property: 'resourceId'),
                'occurredAt' => new QueryParameter(filter: new DateFilter(), property: 'occurredAt'),
            ],
        ),
    ],
    normalizationContext: ['groups' => ['access_log:read']],
    order: ['occurredAt' => 'DESC'],
    paginationItemsPerPage: 50,
)]
class AccessLog
{
    #[ORM\Id]
    #[ORM\Column(type: UuidType::NAME)]
    #[Groups(['access_log:read'])]
    private Uuid $id;

    #[ORM\Column(type: Types::DATETIMETZ_IMMUTABLE)]
    #[Groups(['access_log:read'])]
    private \DateTimeImmutable $occurredAt;

    /** Identifiant du compte (null pour une tentative de connexion inconnue) */
    #[ORM\Column(type: UuidType::NAME, nullable: true)]
    #[Groups(['access_log:read'])]
    private ?Uuid $userId = null;

    /** Email au moment de l'accès (ou email saisi lors d'un échec de connexion) */
    #[ORM\Column(length: 180, nullable: true)]
    #[Groups(['access_log:read'])]
    private ?string $userEmail = null;

    /** login_success, login_failure, logout, read, create, update, delete, action, export, import, import_check */
    #[ORM\Column(length: 20)]
    #[Groups(['access_log:read'])]
    private string $action;

    #[ORM\Column(length: 10)]
    #[Groups(['access_log:read'])]
    private string $method;

    #[ORM\Column(length: 255)]
    #[Groups(['access_log:read'])]
    private string $path;

    #[ORM\Column(length: 50, nullable: true)]
    #[Groups(['access_log:read'])]
    private ?string $resourceType = null;

    #[ORM\Column(length: 36, nullable: true)]
    #[Groups(['access_log:read'])]
    private ?string $resourceId = null;

    #[ORM\Column]
    #[Groups(['access_log:read'])]
    private int $statusCode;

    #[ORM\Column(length: 45, nullable: true)]
    #[Groups(['access_log:read'])]
    private ?string $ip = null;

    #[ORM\Column(length: 255, nullable: true)]
    #[Groups(['access_log:read'])]
    private ?string $userAgent = null;

    /** Précision lisible fournie par l'action (ex. nom du fichier importé) */
    #[ORM\Column(length: 255, nullable: true)]
    #[Groups(['access_log:read'])]
    private ?string $detail = null;

    private function __construct()
    {
        $this->id = Uuid::v7();
        $this->occurredAt = new \DateTimeImmutable();
    }

    public function getId(): Uuid
    {
        return $this->id;
    }

    public function getOccurredAt(): \DateTimeImmutable
    {
        return $this->occurredAt;
    }

    public function getUserId(): ?Uuid
    {
        return $this->userId;
    }

    public function getUserEmail(): ?string
    {
        return $this->userEmail;
    }

    public function getAction(): string
    {
        return $this->action;
    }

    public function getMethod(): string
    {
        return $this->method;
    }

    public function getPath(): string
    {
        return $this->path;
    }

    public function getDetail(): ?string
    {
        return $this->detail;
    }

    public function getResourceType(): ?string
    {
        return $this->resourceType;
    }

    public function getResourceId(): ?string
    {
        return $this->resourceId;
    }

    public function getStatusCode(): int
    {
        return $this->statusCode;
    }

    public function getIp(): ?string
    {
        return $this->ip;
    }

    public function getUserAgent(): ?string
    {
        return $this->userAgent;
    }
}
