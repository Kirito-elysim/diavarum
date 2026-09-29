<?php

namespace App\Tests\Api;

use App\Entity\Module;
use App\Entity\TrainingProgram;
use App\Entity\TrainingSession;
use App\Enum\EligibilityStatus;
use App\Enum\UserRole;

final class DashboardTest extends ApiTestCaseBase
{
    public function testDashboardOnlyCountsTheNurseCenters(): void
    {
        $paris = $this->createCenter('Paris');
        $lyon = $this->createCenter('Lyon');
        $ide = $this->createUser(UserRole::Ide, [$paris]);
        $parisien = $this->createPatient($paris, $ide, 'Parisien')->setEligibilityStatus(EligibilityStatus::Eligible);
        $lyonnais = $this->createPatient($lyon, $ide, 'Lyonnais')->setEligibilityStatus(EligibilityStatus::Eligible);

        $module = (new Module())->setCode('S96')->setTitle('Séance tableau de bord')->setPosition(96);
        $this->em()->persist($module);
        foreach ([[$parisien, 90], [$lyonnais, 10]] as [$patient, $score]) {
            $program = (new TrainingProgram())->setPatient($patient);
            $program->setAuthor($ide);
            $program->addModule($module)->markValidated($score, 1800);
            $session = (new TrainingSession())->setPatient($patient)->setModule($module)->setProgram($program);
            $session->setAuthor($ide);
            $session->markValidated(1800, $score, []);
            $this->em()->persist($program);
            $this->em()->persist($session);
        }
        $this->em()->flush();

        $dashboard = $this->requestAs($ide, 'GET', '/api/dashboard')->toArray();

        self::assertSame(1, $dashboard['kpis']['patients']);
        self::assertSame(1, $dashboard['kpis']['validatedSessions']);
        self::assertSame(90, $dashboard['kpis']['averageScore'], 'Le score du patient lyonnais ne compte pas');
        self::assertSame(1, end($dashboard['monthly'])['completed']);
        self::assertSame([['name' => 'S96', 'title' => 'Séance tableau de bord', 'completed' => 1, 'inProgress' => 0]], $dashboard['modules']);
        self::assertStringNotContainsString('Lyonnais', json_encode($dashboard['activity']));
    }
}
