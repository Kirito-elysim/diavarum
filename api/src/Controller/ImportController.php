<?php

namespace App\Controller;

use App\Entity\Center;
use App\Entity\User;
use App\Enum\UserRole;
use App\EventListener\AccessLogSubscriber;
use App\Entity\ImportFile;
use App\Import\CenterImporter;
use App\Import\ImportArchive;
use App\Import\ImportException;
use App\Import\PatientImporter;
use App\Import\TemplateBuilder;
use App\Import\UserImporter;
use Doctrine\ORM\EntityManagerInterface;
use Psr\Log\LoggerInterface;
use Symfony\Component\HttpFoundation\File\UploadedFile;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\HttpFoundation\ResponseHeaderBag;
use Symfony\Component\HttpKernel\Exception\AccessDeniedHttpException;
use Symfony\Component\HttpKernel\Exception\NotFoundHttpException;
use Symfony\Component\HttpKernel\Exception\UnprocessableEntityHttpException;
use Symfony\Component\Routing\Attribute\Route;
use Symfony\Component\Routing\Requirement\Requirement;
use Symfony\Component\Security\Http\Attribute\CurrentUser;
use Symfony\Component\Security\Http\Attribute\IsGranted;
use Symfony\Component\Uid\Uuid;

/**
 * Imports en masse depuis un fichier Excel ou CSV.
 *
 * Champ « mode » : « preview » vérifie le fichier sans rien enregistrer ; « import » crée tout,
 * ou rien si une ligne est en erreur (422 avec le détail ligne par ligne).
 */
final class ImportController
{
    private const XLSX = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

    private const TYPE_LABELS = ['users' => 'utilisateurs', 'centers' => 'centres', 'patients' => 'patients'];

    public function __construct(
        private readonly TemplateBuilder $templates,
        private readonly ImportArchive $archive,
        private readonly LoggerInterface $logger,
    ) {
    }

    /** Fichier d'un import réussi, tel qu'il a été déposé (lien depuis le journal des accès) */
    #[Route('/api/imports/{id}/file', name: 'api_import_file', requirements: ['id' => Requirement::UUID], methods: ['GET'])]
    #[IsGranted('ROLE_ADMIN_NATIONAL')]
    public function download(ImportFile $import, Request $request): Response
    {
        $request->attributes->set(AccessLogSubscriber::OVERRIDE, ['action' => 'export', 'detail' => 'Fichier d\'import · '.$import->getOriginalName()]);
        $path = $this->archive->path($import->getStoredName());
        if (!is_file($path)) {
            throw new NotFoundHttpException('Fichier d\'import introuvable (purgé ou supprimé).');
        }
        // 2 Mo au plus (limite d'import) : renvoyé directement, comme les exports
        $response = new Response((string) file_get_contents($path), 200, [
            'Content-Type' => 'application/octet-stream',
            'Cache-Control' => 'no-store, private',
        ]);
        $fallback = 'import.'.pathinfo($import->getStoredName(), \PATHINFO_EXTENSION);
        $response->headers->set('Content-Disposition', $response->headers->makeDisposition(ResponseHeaderBag::DISPOSITION_ATTACHMENT, $import->getOriginalName(), $fallback));

        return $response;
    }

    #[Route('/api/imports/centers/template.xlsx', name: 'api_import_centers_template', methods: ['GET'])]
    #[IsGranted('ROLE_ADMIN_NATIONAL')]
    public function centersTemplate(): Response
    {
        return $this->file($this->templates->centers(), 'modele-import-centres.xlsx');
    }

    #[Route('/api/imports/users/template.xlsx', name: 'api_import_users_template', methods: ['GET'])]
    #[IsGranted('ROLE_CADRE')]
    public function usersTemplate(#[CurrentUser] User $user): Response
    {
        return $this->file($this->templates->users($user), 'modele-import-utilisateurs.xlsx');
    }

    #[Route('/api/imports/patients/template.xlsx', name: 'api_import_patients_template', methods: ['GET'])]
    #[IsGranted('ROLE_CADRE')]
    public function patientsTemplate(#[CurrentUser] User $user): Response
    {
        return $this->file($this->templates->patients($user), 'modele-import-patients.xlsx');
    }

    /** Import en masse réservé aux cadres et administrateurs : l'IDE enregistre ses patients un par un */
    #[Route('/api/imports/patients', name: 'api_import_patients', methods: ['POST'])]
    #[IsGranted('ROLE_CADRE')]
    public function patients(Request $request, #[CurrentUser] User $user, PatientImporter $importer, EntityManagerInterface $entityManager): JsonResponse
    {
        $center = $this->defaultCenter($request, $user, $entityManager);

        return $this->run($request, 'patients', $user, fn (UploadedFile $file, bool $commit) => $importer->import($file, $user, $center, $commit));
    }

    #[Route('/api/imports/centers', name: 'api_import_centers', methods: ['POST'])]
    #[IsGranted('ROLE_ADMIN_NATIONAL')]
    public function centers(Request $request, #[CurrentUser] User $user, CenterImporter $importer): JsonResponse
    {
        return $this->run($request, 'centers', $user, fn (UploadedFile $file, bool $commit) => $importer->import($file, $commit));
    }

    #[Route('/api/imports/users', name: 'api_import_users', methods: ['POST'])]
    #[IsGranted('ROLE_CADRE')]
    public function users(Request $request, #[CurrentUser] User $user, UserImporter $importer, EntityManagerInterface $entityManager): JsonResponse
    {
        $center = $this->defaultCenter($request, $user, $entityManager);

        return $this->run($request, 'users', $user, fn (UploadedFile $file, bool $commit) => $importer->import($file, $user, $center, $commit));
    }

    /** Centre par défaut des lignes sans centre (import depuis la fiche d'un centre) */
    private function defaultCenter(Request $request, User $user, EntityManagerInterface $entityManager): ?Center
    {
        $id = $request->request->getString('center');
        if ('' === $id) {
            return null;
        }
        $center = Uuid::isValid($id) ? $entityManager->find(Center::class, $id) : null;
        if (null === $center || $center->isArchived() || (UserRole::AdminNational !== $user->getRole() && !$user->isAffiliatedTo($center))) {
            throw new AccessDeniedHttpException('Centre hors de votre périmètre.');
        }

        return $center;
    }

    /**
     * Le journal des accès retient le nom du fichier ; un import réussi conserve aussi le fichier.
     *
     * @param callable(UploadedFile, bool): array{valid: bool, created: int} $import
     */
    private function run(Request $request, string $type, User $user, callable $import): JsonResponse
    {
        $file = $request->files->get('file');
        if (!$file instanceof UploadedFile || !$file->isValid()) {
            throw new UnprocessableEntityHttpException('Aucun fichier reçu.');
        }
        $commit = 'import' === $request->request->getString('mode');
        $name = $file->getClientOriginalName();
        $label = \sprintf('Import %s · %s', self::TYPE_LABELS[$type], $name);
        $request->attributes->set(AccessLogSubscriber::OVERRIDE, [
            'action' => $commit ? 'import' : 'import_check',
            'resourceType' => 'imports',
            'detail' => $commit ? $label.' (refusé)' : $label,
        ]);

        try {
            $report = $import($file, $commit);
        } catch (ImportException $e) {
            throw new UnprocessableEntityHttpException($e->getMessage(), $e);
        }

        if ($commit && $report['valid']) {
            $logged = ['action' => 'import', 'resourceType' => 'imports', 'detail' => \sprintf('%s (%d créé%s)', $label, $report['created'], $report['created'] > 1 ? 's' : '')];
            try {
                $logged['resourceId'] = $this->archive->store($file, $type, $report['created'], $user)->getId()->toRfc4122();
            } catch (\Throwable $e) {
                // Les créations sont faites : l'échec de conservation du fichier ne doit pas les annuler
                $this->logger->error('Import : conservation du fichier impossible', ['exception' => $e, 'file' => $name]);
            }
            $request->attributes->set(AccessLogSubscriber::OVERRIDE, $logged);
        }

        $status = match (true) {
            !$commit => Response::HTTP_OK,
            $report['valid'] => Response::HTTP_CREATED,
            default => Response::HTTP_UNPROCESSABLE_ENTITY,
        };
        $response = new JsonResponse($report, $status);
        $response->headers->set('Cache-Control', 'no-store, private'); // mots de passe provisoires

        return $response;
    }

    private function file(string $content, string $fileName): Response
    {
        $response = new Response($content, 200, ['Content-Type' => self::XLSX, 'Cache-Control' => 'no-store, private']);
        $response->headers->set('Content-Disposition', $response->headers->makeDisposition(ResponseHeaderBag::DISPOSITION_ATTACHMENT, $fileName));

        return $response;
    }
}
