<?php

namespace App\Command;

use App\Demo\RecetteDataLoader;
use App\Entity\User;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Component\Console\Attribute\AsCommand;
use Symfony\Component\Console\Command\Command;
use Symfony\Component\Console\Style\SymfonyStyle;

/**
 * Charge la base de recette fictive (centres, rôles, parcours aux quatre statuts…) dans une base dédiée.
 * Garde-fou : refuse toute base dont le nom ne contient pas « recette », et toute base qui contient déjà des comptes.
 */
#[AsCommand(name: 'app:recette:load', description: 'Charge la base de recette fictive (base dont le nom contient « recette » uniquement)')]
final class LoadRecetteDataCommand
{
    public function __construct(private readonly RecetteDataLoader $loader, private readonly EntityManagerInterface $entityManager)
    {
    }

    public function __invoke(SymfonyStyle $io): int
    {
        $database = (string) $this->entityManager->getConnection()->getDatabase();
        if (!str_contains($database, 'recette')) {
            $io->error(\sprintf('Base « %s » refusée : le nom doit contenir « recette » (voir make recette-base).', $database));

            return Command::FAILURE;
        }
        if ($this->entityManager->getRepository(User::class)->count([]) > 0) {
            $io->error('Cette base contient déjà des comptes : supprimez-la et recréez-la (make recette-base).');

            return Command::FAILURE;
        }

        $this->entityManager->wrapInTransaction(fn () => $this->loader->load($this->entityManager, new \DateTimeImmutable()));
        $io->success('Base de recette chargée.');
        $io->listing([
            'recette.admin@diaverum.test (administrateur national)',
            'recette.cadre.paris@diaverum.test, recette.cadre.lyon@diaverum.test, recette.cadre.nice@diaverum.test (cadres)',
            'recette.ide.paris.a@diaverum.test, recette.ide.paris.b@diaverum.test, recette.ide.lyon@diaverum.test, recette.ide.nice@diaverum.test (IDE)',
            \sprintf('Mot de passe : %s — code de sécurité IDE : 1234 — code national : 9999', RecetteDataLoader::PASSWORD),
        ]);

        return Command::SUCCESS;
    }
}
