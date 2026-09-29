<?php

namespace App\Enum;

enum SessionStatus: string
{
    case InProgress = 'en_cours';
    /** Cours terminé par l'IDE : durée et score enregistrés */
    case Validated = 'validee';
    /** Séance non validée : rien n'est comptabilisé, le cours sera à recommencer */
    case Interrupted = 'interrompue';
}
