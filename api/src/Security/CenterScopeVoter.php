<?php

namespace App\Security;

use App\Entity\Center;
use App\Entity\Contract\CenterScopedInterface;
use App\Entity\User;
use Symfony\Bundle\SecurityBundle\Security;
use Symfony\Component\Security\Core\Authentication\Token\TokenInterface;
use Symfony\Component\Security\Core\Authorization\Voter\Vote;
use Symfony\Component\Security\Core\Authorization\Voter\Voter;

/**
 * CENTER_SCOPE : l'utilisateur est-il affilié au centre de la ressource ?
 * Utilisé après désérialisation (création / modification) pour empêcher d'écrire
 * dans un centre étranger. La lecture est filtrée par CenterScopeExtension.
 *
 * @extends Voter<string, Center|CenterScopedInterface>
 */
final class CenterScopeVoter extends Voter
{
    public const SCOPE = 'CENTER_SCOPE';

    public function __construct(private readonly Security $security)
    {
    }

    protected function supports(string $attribute, mixed $subject): bool
    {
        return self::SCOPE === $attribute && ($subject instanceof CenterScopedInterface || $subject instanceof Center);
    }

    protected function voteOnAttribute(string $attribute, mixed $subject, TokenInterface $token, ?Vote $vote = null): bool
    {
        $user = $token->getUser();
        if (!$user instanceof User) {
            return false;
        }

        if ($this->security->isGranted('ROLE_ADMIN_NATIONAL')) {
            return true;
        }

        $center = $subject instanceof Center ? $subject : $subject->getScopeCenter();

        // Centre absent : la validation (NotNull) rejettera la requête avec un message explicite
        return null === $center || $user->isAffiliatedTo($center);
    }
}
