<?php

namespace App\Enum;

enum ProgramStatus: string
{
    case Inactive = 'non_actif';
    case Active = 'actif';
    case Interrupted = 'interrompu';
    /** Seul statut non modifiable */
    case Completed = 'acheve';
}
