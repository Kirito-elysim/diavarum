<?php

namespace App\Tests\Api;

use App\Entity\Module;
use App\Entity\TrainingProgram;
use App\Entity\TrainingSession;
use App\Enum\EligibilityStatus;
use App\Enum\UserRole;

final class ProgramActivityTest extends ApiTestCaseBase
{
    public function testBoundaryAndTerminalStatuses(): void
    {
        $now = new \DateTimeImmutable('2026-11-12 12:00:00 UTC');
        $program = new TrainingProgram();
        self::assertSame('non_demarre', $program->activityStatusAt($now));
        $program->recordActivity($now->modify('-15 days'));
        self::assertSame('non_actif', $program->activityStatusAt($now));
        self::assertSame('actif', $program->activityStatusAt($now->modify('-1 second')));
        $program->recordActivity($now->modify('-14 days'));
        self::assertSame('actif', $program->activityStatusAt($now));
        $program->recordActivity($now);
        self::assertSame('actif', $program->activityStatusAt($now));
        $user = $this->createUser(UserRole::Cadre);
        $program->markInterrupted($user, [], null);
        self::assertSame('interrompu', $program->activityStatusAt($now->modify('+40 days')));
        $program->markCompleted($user);
        self::assertSame('acheve', $program->activityStatusAt($now->modify('+40 days')));
    }

    public function testActivityFilteringSummaryAndRestart(): void
    {
        $center = $this->createCenter('Activité');
        $ide = $this->createUser(UserRole::Ide, [$center]);
        $patient = $this->createPatient($center, $ide)->setEligibilityStatus(EligibilityStatus::Eligible);
        $module = (new Module())->setCode('S_ACTIVITY')->setTitle('Activité');
        $this->em()->persist($module);
        $program = (new TrainingProgram())->setPatient($patient);
        $program->setAuthor($ide);
        $program->addModule($module);
        $program->markActive();
        $program->recordActivity(new \DateTimeImmutable('-16 days'));
        $this->em()->persist($program);
        $this->em()->flush();
        $path = '/api/training_programs/'.$program->getId();
        $before = $this->requestAs($ide, 'GET', $path)->toArray();
        self::assertSame('non_actif', $before['activityStatus']);
        $list = $this->requestAs($ide, 'GET', '/api/training_programs?activityStatus=non_actif')->toArray();
        self::assertCount(1, $list);
        self::assertCount(0, $this->requestAs($ide, 'GET', '/api/training_programs?activityStatus=non_demarre')->toArray());
        self::assertCount(1, $this->requestAs($ide, 'GET', '/api/training_programs?order[activityStatus]=asc')->toArray());
        $summary = $this->requestAs($ide, 'GET', '/api/summaries/training_programs')->toArray();
        self::assertSame(1, $summary['activityByStatus']['non_actif']);
        self::assertSame($before['lastActivityAt'], $this->requestAs($ide, 'GET', $path)->toArray()['lastActivityAt'], 'Lire la fiche ne constitue pas une activité');
        $this->requestAs($ide, 'POST', '/api/sessions', ['patient' => '/api/patients/'.$patient->getId(), 'program' => $path, 'module' => '/api/modules/'.$module->getId()]);
        self::assertResponseStatusCodeSame(201);
        self::assertSame('actif', $this->requestAs($ide, 'GET', $path)->toArray()['activityStatus']);
    }

    public function testArchivedPatientsAreExcludedFromAllScreenKpisAndRestoreReturnsThem(): void
    {
        $center = $this->createCenter('Archive');
        $ide = $this->createUser(UserRole::Ide, [$center]);
        $cadre = $this->createUser(UserRole::Cadre, [$center]);
        $patient = $this->createPatient($center, $ide)->setEligibilityStatus(EligibilityStatus::Eligible);
        $module = (new Module())->setCode('S_ARCH')->setTitle('Archive');
        $this->em()->persist($module);
        $program = (new TrainingProgram())->setPatient($patient);
        $program->setAuthor($ide);
        $program->addModule($module)->markValidated(80, 1200);
        $program->markActive();
        $program->recordActivity();
        $this->em()->persist($program);
        $session = (new TrainingSession())->setPatient($patient)->setModule($module)->setProgram($program);
        $session->setAuthor($ide);
        $session->markValidated(1200, 80, []);
        $this->em()->persist($session);
        $this->em()->flush();
        self::assertSame(1, $this->requestAs($cadre, 'GET', '/api/statistics')->toArray()['nurses'][0]['validatedSessions']);
        $this->requestAs($cadre, 'DELETE', '/api/patients/'.$patient->getId());
        self::assertResponseIsSuccessful();
        $stats = $this->requestAs($cadre, 'GET', '/api/statistics')->toArray();
        self::assertSame(0, $stats['total']['patients']['registered']);
        self::assertNull($stats['total']['patients']['eligible']['percent']);
        self::assertSame(0, $stats['total']['activity']['validatedSessions']);
        self::assertSame(0, $stats['nurses'][0]['validatedSessions']);
        self::assertSame(0, $this->requestAs($ide, 'GET', '/api/statistics/me')->toArray()['totals']['validatedSessions']);
        $dashboard = $this->requestAs($ide, 'GET', '/api/dashboard')->toArray();
        self::assertSame(0, $dashboard['kpis']['patients']);
        self::assertSame(0, $dashboard['kpis']['validatedSessions']);
        self::assertSame([], $dashboard['modules']);
        self::assertCount(1, $this->requestAs($ide, 'GET', '/api/patients?status=archived')->toArray());
        $this->requestAs($cadre, 'POST', '/api/patients/'.$patient->getId().'/restore');
        self::assertResponseStatusCodeSame(204);
        $restored = $this->requestAs($cadre, 'GET', '/api/statistics')->toArray();
        self::assertSame(1, $restored['total']['patients']['registered']);
        self::assertSame(1, $restored['nurses'][0]['validatedSessions']);
    }
}
