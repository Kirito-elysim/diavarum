<?php

namespace App\Service;

use App\Entity\Patient;
use App\Exception\WorkflowException;
use App\Import\SpreadsheetReader;
use Doctrine\DBAL\Connection;
use Doctrine\ORM\EntityManagerInterface;

/**
 * Suppression définitive d'un patient archivé (cahier des charges §3.4) : le dossier, ses parcours, ses séances
 * (réponses et compétences comprises) et ses tests CODEX sont effacés de la base, sans retour possible.
 * L'effacement passe par SQL, volontairement : la suppression physique d'un patient est interdite partout ailleurs
 * (PreventHardDeleteListener). La trace d'audit, sans donnée de santé, est écrite par l'appelant.
 */
final class PatientEraser
{
    public function __construct(private readonly Connection $connection, private readonly EntityManagerInterface $entityManager)
    {
    }

    /**
     * @return array{sessions: int, programs: int, codexTests: int}
     */
    public function erase(Patient $patient, string $confirmation): array
    {
        if (null === $patient->getRemovedAt()) {
            throw new WorkflowException('Seul un patient archivé peut être supprimé définitivement : archivez-le d\'abord.');
        }
        if (SpreadsheetReader::normalize($confirmation) !== SpreadsheetReader::normalize($patient->getLastName().' '.$patient->getFirstName())) {
            throw new WorkflowException('Confirmation incorrecte : saisissez le nom puis le prénom du patient.');
        }

        $id = $patient->getId()->toRfc4122();
        $counts = $this->connection->transactional(function (Connection $db) use ($id): array {
            $params = ['id' => $id];
            $counts = [
                'sessions' => (int) $db->executeStatement('DELETE FROM training_session WHERE patient_id = :id', $params),
                'codexTests' => (int) $db->executeStatement('DELETE FROM codex_test WHERE patient_id = :id', $params),
                'programs' => (int) $db->executeStatement('DELETE FROM training_program WHERE patient_id = :id', $params),
            ];
            $db->executeStatement('DELETE FROM patient WHERE id = :id', $params);

            return $counts;
        });
        $this->entityManager->detach($patient);

        return $counts;
    }
}
