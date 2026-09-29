<?php

namespace App\Security;

use App\Entity\User;
use App\Enum\UserRole;
use Symfony\Bundle\SecurityBundle\Security;
use Symfony\Component\Security\Core\Authentication\Token\TokenInterface;
use Symfony\Component\Security\Core\Authorization\Voter\Vote;
use Symfony\Component\Security\Core\Authorization\Voter\Voter;

/**
 * Gestion des comptes (cahier des charges §3) :
 * - un cadre gère les IDE de ses centres ;
 * - un administrateur national gère tous les comptes (IDE, cadres, autres administrateurs) ;
 * - personne ne modifie ni ne supprime son propre compte par ce biais (pas d'auto-élévation).
 *
 * @extends Voter<string, User>
 */
final class UserVoter extends Voter
{
    public const VIEW = 'USER_VIEW';
    public const MANAGE = 'USER_MANAGE';

    public function __construct(private readonly Security $security)
    {
    }

    protected function supports(string $attribute, mixed $subject): bool
    {
        return \in_array($attribute, [self::VIEW, self::MANAGE], true) && $subject instanceof User;
    }

    protected function voteOnAttribute(string $attribute, mixed $subject, TokenInterface $token, ?Vote $vote = null): bool
    {
        $me = $token->getUser();
        if (!$me instanceof User) {
            return false;
        }

        $isSelf = $me->getId()->equals($subject->getId());

        if (self::VIEW === $attribute && $isSelf) {
            return true;
        }
        if (self::MANAGE === $attribute && $isSelf) {
            return false;
        }

        if ($this->security->isGranted('ROLE_ADMIN_NATIONAL')) {
            return true;
        }

        if (!$this->security->isGranted('ROLE_CADRE')) {
            return false;
        }

        if (self::VIEW === $attribute) {
            return $this->sharesACenter($me, $subject);
        }

        return UserRole::Ide === $subject->getRole()
            && ($subject->getCenters()->isEmpty() || $this->sharesACenter($me, $subject));
    }

    private function sharesACenter(User $a, User $b): bool
    {
        foreach ($b->getCenters() as $center) {
            if ($a->isAffiliatedTo($center)) {
                return true;
            }
        }

        return false;
    }
}
