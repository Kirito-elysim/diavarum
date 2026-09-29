<?php

namespace App\Tests\Api;

use ApiPlatform\Test\ApiTestCase;
use ApiPlatform\Test\Client;
use App\Entity\Center;
use App\Entity\Patient;
use App\Entity\User;
use App\Enum\UserRole;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Component\PasswordHasher\Hasher\PasswordHasherFactoryInterface;
use Symfony\Component\PasswordHasher\Hasher\UserPasswordHasherInterface;
use Symfony\Contracts\HttpClient\ResponseInterface;

/**
 * Base des tests fonctionnels de l'API : chaque test tourne dans une transaction annulée
 * à la fin (DAMA), les données sont donc créées par test.
 */
abstract class ApiTestCaseBase extends ApiTestCase
{
    protected const PASSWORD = 'Motdepasse-Test-2026';

    protected Client $client;

    protected function setUp(): void
    {
        $this->client = static::createClient();

        // Compteurs anti force brute (connexion, code de sécurité) : repartir de zéro à chaque test,
        // sinon les échecs volontaires s'accumulent d'une exécution à l'autre jusqu'au blocage de l'IP
        static::getContainer()->get('cache.rate_limiter')->clear();
    }

    protected function em(): EntityManagerInterface
    {
        return static::getContainer()->get(EntityManagerInterface::class);
    }

    protected function createCenter(string $name = 'Centre'): Center
    {
        $center = (new Center())->setName($name)->setCity('Ville');
        $this->em()->persist($center);
        $this->em()->flush();

        return $center;
    }

    /**
     * @param list<Center> $centers
     */
    protected function createUser(UserRole $role, array $centers = [], ?string $securityCode = null): User
    {
        $user = (new User())
            ->setEmail(uniqid($role->value.'.', true).'@test.fr')
            ->setFirstName('Prénom')
            ->setLastName(ucfirst($role->value))
            ->setRole($role);
        foreach ($centers as $center) {
            $user->addCenter($center);
        }

        $container = static::getContainer();
        $user->setPassword($container->get(UserPasswordHasherInterface::class)->hashPassword($user, self::PASSWORD));
        if (null !== $securityCode) {
            $user->setSecurityCodeHash($container->get(PasswordHasherFactoryInterface::class)->getPasswordHasher('security_code')->hash($securityCode));
        }

        $this->em()->persist($user);
        $this->em()->flush();

        return $user;
    }

    protected function createPatient(Center $center, User $author, string $lastName = 'Patient'): Patient
    {
        $patient = (new Patient())->setFirstName('Jean')->setLastName($lastName)->setCenter($center);
        $patient->setAuthor($author);
        $this->em()->persist($patient);
        $this->em()->flush();

        return $patient;
    }

    protected function login(User $user, string $password = self::PASSWORD): ResponseInterface
    {
        return $this->client->request('POST', '/api/auth/login', ['json' => ['email' => $user->getEmail(), 'password' => $password]]);
    }

    protected function tokenFor(User $user): string
    {
        $response = $this->login($user);
        self::assertResponseIsSuccessful();

        return $response->toArray()['token'];
    }

    /**
     * Requête authentifiée en JSON simple (les relations sont des IRI).
     *
     * @param array<string, mixed>|null $json
     */
    protected function requestAs(User $user, string $method, string $url, ?array $json = null): ResponseInterface
    {
        $options = ['auth_bearer' => $this->tokenFor($user), 'headers' => ['Accept' => 'application/json']];
        if (null !== $json) {
            $options['json'] = $json;
            $options['headers']['Content-Type'] = 'PATCH' === $method ? 'application/merge-patch+json' : 'application/json';
        }

        return $this->client->request($method, $url, $options);
    }

    protected function iri(object $resource): string
    {
        return (string) $this->getIriFromResource($resource);
    }
}
