<?php

namespace App\Entity\Contract;

use App\Entity\User;

/**
 * Ressource dont l'auteur (IDE qui crée / réalise) est renseigné automatiquement
 * avec l'utilisateur connecté, jamais depuis le corps de la requête.
 */
interface AuthoredInterface
{
    public function getAuthor(): ?User;

    public function setAuthor(User $author): void;
}
