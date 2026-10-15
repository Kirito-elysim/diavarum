<?php

namespace App\Tests\Api;

use App\Entity\Chapter;
use App\Entity\Module;
use App\Entity\ModuleCompetency;
use App\Enum\UserRole;

/**
 * Aucune suppression physique : un DELETE archive la ressource, qui disparaît des listes
 * mais reste en base (historique des séances).
 */
final class SoftDeleteTest extends ApiTestCaseBase
{
    public function testDeletingCourseContentArchivesIt(): void
    {
        $admin = $this->createUser(UserRole::AdminNational);
        $chapter = (new Chapter())->setTitle('Thématique à retirer')->setPosition(99);
        $module = (new Module())->setCode('S97')->setTitle('Cours à retirer')->setPosition(97)->setChapter($chapter);
        $competency = (new ModuleCompetency())->setModule($module)->setLabel('Compétence à retirer');
        foreach ([$chapter, $module, $competency] as $entity) {
            $this->em()->persist($entity);
        }
        $this->em()->flush();

        foreach ([
            '/api/module_competencies/'.$competency->getId(),
            '/api/modules/'.$module->getId(),
            '/api/chapters/'.$chapter->getId(),
        ] as $url) {
            $this->requestAs($admin, 'DELETE', $url);
            self::assertResponseStatusCodeSame(204);
        }

        $this->em()->clear();
        foreach ([[Chapter::class, $chapter], [Module::class, $module], [ModuleCompetency::class, $competency]] as [$class, $entity]) {
            $stored = $this->em()->find($class, $entity->getId());
            self::assertNotNull($stored, "$class toujours en base");
            self::assertTrue($stored->isArchived());
        }

        $codes = array_column($this->requestAs($admin, 'GET', '/api/modules')->toArray(), 'code');
        self::assertNotContains('S97', $codes);
        $titles = array_column($this->requestAs($admin, 'GET', '/api/chapters')->toArray(), 'title');
        self::assertNotContains('Thématique à retirer', $titles);
    }

    public function testHardDeleteOfArchivableEntityIsRefused(): void
    {
        $center = $this->createCenter();
        $patient = $this->createPatient($center, $this->createUser(UserRole::Ide, [$center]));

        $this->expectException(\LogicException::class);
        $this->em()->remove($patient);
        $this->em()->flush();
    }
}
