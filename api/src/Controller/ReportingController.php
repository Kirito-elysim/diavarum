<?php

namespace App\Controller;

use App\Entity\Patient;
use App\Entity\User;
use App\Reporting\PatientReportBuilder;
use App\Reporting\PdfWriter;
use App\Reporting\ReportingScope;
use App\Reporting\SpreadsheetWriter;
use App\Reporting\StatisticsBuilder;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\HttpFoundation\ResponseHeaderBag;
use Symfony\Component\Routing\Attribute\Route;
use Symfony\Component\Routing\Requirement\Requirement;
use Symfony\Component\Security\Http\Attribute\CurrentUser;
use Symfony\Component\Security\Http\Attribute\IsGranted;
use Symfony\Component\String\Slugger\AsciiSlugger;

/**
 * Bilans et statistiques (cahier des charges §3), en Excel et en PDF.
 *   IDE   : bilans des patients de ses centres
 *   Cadre : + synthèses statistiques de ses centres (patients, programmes, séances, IDE)
 *   Admin : + synthèse nationale
 */
#[IsGranted('ROLE_IDE')]
final class ReportingController
{
    private const XLSX = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

    public function __construct(
        private readonly ReportingScope $scope,
        private readonly PatientReportBuilder $patientReports,
        private readonly StatisticsBuilder $statistics,
        private readonly SpreadsheetWriter $spreadsheet,
        private readonly PdfWriter $pdf,
    ) {
    }

    /** Bilan d'un ou plusieurs patients (?patients[]=…), ou de toute la file active */
    #[Route('/api/exports/patients.xlsx', name: 'api_export_patients_xlsx', methods: ['GET'])]
    public function patientsSpreadsheet(Request $request, #[CurrentUser] User $user): Response
    {
        $patients = $this->scope->patients($user, $request->query->all('patients'));

        return $this->file($this->spreadsheet->patients($this->patientReports->build($patients)), self::XLSX, 'bilan-patients-'.date('Y-m-d').'.xlsx');
    }

    #[Route('/api/exports/patients/{id}.pdf', name: 'api_export_patient_pdf', requirements: ['id' => Requirement::UUID], methods: ['GET'])]
    public function patientPdf(string $id, #[CurrentUser] User $user): Response
    {
        [$patient] = $this->scope->patients($user, [$id]);
        [$report] = $this->patientReports->build([$patient]);

        return $this->file($this->pdf->render('reports/patient.html.twig', ['r' => $report]), 'application/pdf', $this->patientFileName($patient));
    }

    /** Synthèse statistique (JSON) pour les écrans de résultats */
    #[Route('/api/statistics', name: 'api_statistics', methods: ['GET'])]
    #[IsGranted('ROLE_CADRE')]
    public function statistics(Request $request, #[CurrentUser] User $user): JsonResponse
    {
        $stats = $this->buildStatistics($request, $user);
        $stats['generatedAt'] = $stats['generatedAt']->format(\DATE_ATOM);

        return new JsonResponse($stats);
    }

    #[Route('/api/exports/statistics.xlsx', name: 'api_export_statistics_xlsx', methods: ['GET'])]
    #[IsGranted('ROLE_CADRE')]
    public function statisticsSpreadsheet(Request $request, #[CurrentUser] User $user): Response
    {
        $stats = $this->buildStatistics($request, $user);

        return $this->file($this->spreadsheet->statistics($stats), self::XLSX, $this->statisticsFileName($stats, 'xlsx'));
    }

    #[Route('/api/exports/statistics.pdf', name: 'api_export_statistics_pdf', methods: ['GET'])]
    #[IsGranted('ROLE_CADRE')]
    public function statisticsPdf(Request $request, #[CurrentUser] User $user): Response
    {
        $stats = $this->buildStatistics($request, $user);

        return $this->file($this->pdf->render('reports/statistics.html.twig', ['s' => $stats]), 'application/pdf', $this->statisticsFileName($stats, 'pdf'));
    }

    /**
     * @return array<string, mixed>
     */
    private function buildStatistics(Request $request, User $user): array
    {
        $requested = $request->query->all('centers');
        $centers = $this->scope->centers($user, $requested);

        return $this->statistics->build($centers, $this->scope->isNationalAdmin() && [] === $requested);
    }

    private function patientFileName(Patient $patient): string
    {
        return strtolower((new AsciiSlugger())->slug('bilan '.$patient->getLastName().' '.$patient->getFirstName())).'.pdf';
    }

    /**
     * @param array<string, mixed> $stats
     */
    private function statisticsFileName(array $stats, string $extension): string
    {
        $scope = $stats['national'] ? 'national' : (1 === \count($stats['centers']) ? $stats['centers'][0]['center'] : 'centres');

        return strtolower((new AsciiSlugger())->slug('statistiques '.$scope.' '.date('Y-m-d'))).'.'.$extension;
    }

    private function file(string $content, string $contentType, string $fileName): Response
    {
        $response = new Response($content, 200, [
            'Content-Type' => $contentType,
            // Données de santé : jamais en cache (navigateur, proxy)
            'Cache-Control' => 'no-store, private',
        ]);
        $response->headers->set('Content-Disposition', $response->headers->makeDisposition(ResponseHeaderBag::DISPOSITION_ATTACHMENT, $fileName));

        return $response;
    }
}
