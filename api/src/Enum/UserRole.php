<?php

namespace App\Enum;

/**
 * Les 3 profils du cahier des charges, du moins au plus privilégié.
 * La hiérarchie (admin ⊃ cadre ⊃ IDE) est déclarée dans security.yaml.
 */
enum UserRole: string
{
    case Ide = 'ide';
    case Cadre = 'cadre';
    case AdminNational = 'admin_national';

    public function securityRole(): string
    {
        return match ($this) {
            self::Ide => 'ROLE_IDE',
            self::Cadre => 'ROLE_CADRE',
            self::AdminNational => 'ROLE_ADMIN_NATIONAL',
        };
    }
}
