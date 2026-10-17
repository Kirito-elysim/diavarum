<?php

namespace App\Command;

use App\Demo\DemoDataLoader;
use App\Entity\User;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Component\Console\Attribute\AsCommand;
use Symfony\Component\Console\Command\Command;
use Symfony\Component\Console\Style\SymfonyStyle;
use Symfony\Component\DependencyInjection\Attribute\Autowire;

/**
 * Charge les comptes et données de démonstration sur une installation vide (recette en ligne),
 * sans le paquet de fixtures réservé au développement, puis les contenus versionnés (content/).
 * Ne fait rien dès qu'un compte existe : sans risque à chaque déploiement, jamais sur de vraies données.
 */
#[AsCommand(name: 'app:demo:load', description: 'Charge les comptes de démonstration si aucun compte n\'existe')]
final class LoadDemoDataCommand
{
    public function __construct(
        private readonly DemoDataLoader $demo,
        private readonly EntityManagerInterface $entityManager,
        private readonly ImportContentCommand $importContent,
        #[Autowire('%kernel.project_dir%/content')]
        private readonly string $contentDir,
    ) {
    }

    public function __invoke(SymfonyStyle $io): int
    {
        if ($this->entityManager->getRepository(User::class)->count([]) > 0) {
            $io->note('Des comptes existent déjà : données de démonstration non chargées.');

            return Command::SUCCESS;
        }

        $this->entityManager->wrapInTransaction(fn () => $this->demo->load($this->entityManager));
        $io->success('Données de démonstration chargées.');
        $io->listing([
            'admin@diaverum.test (administrateur national)',
            'cadre@diaverum.test (cadre, Paris Nord)',
            'ide@diaverum.test (IDE, Paris Nord), ide.lyon@diaverum.test (IDE, Lyon Sud), ide.multi@diaverum.test (IDE, deux centres)',
            \sprintf('Mot de passe : %s — code de sécurité IDE : 1234 — code national : 9999', DemoDataLoader::PASSWORD),
        ]);

        $files = glob($this->contentDir.'/*.json') ?: [];

        return [] === $files ? Command::SUCCESS : ($this->importContent)($io, $files);
    }
}
