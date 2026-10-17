<?php

namespace App\DataFixtures;

use App\Demo\DemoDataLoader;
use Doctrine\Bundle\FixturesBundle\Fixture;
use Doctrine\Persistence\ObjectManager;

/**
 * Données de démonstration en développement (`make fixtures`) : voir DemoDataLoader.
 */
final class AppFixtures extends Fixture
{
    public const PASSWORD = DemoDataLoader::PASSWORD;

    public function __construct(private readonly DemoDataLoader $demo)
    {
    }

    public function load(ObjectManager $manager): void
    {
        $this->demo->load($manager);
    }
}
