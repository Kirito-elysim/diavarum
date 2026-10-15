<?php

namespace App\Import;

use App\Entity\ImportFile;
use App\Entity\User;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Component\DependencyInjection\Attribute\Autowire;
use Symfony\Component\Filesystem\Filesystem;
use Symfony\Component\HttpFoundation\File\UploadedFile;
use Symfony\Component\Uid\Uuid;

/**
 * Conservation des fichiers d'import réussis, sous un nom technique, dans un dossier privé.
 */
final class ImportArchive
{
    public function __construct(
        #[Autowire('%import_files_dir%')] private readonly string $directory,
        private readonly EntityManagerInterface $entityManager,
        private readonly Filesystem $filesystem = new Filesystem(),
    ) {
    }

    public function store(UploadedFile $file, string $type, int $createdCount, User $importedBy): ImportFile
    {
        $id = Uuid::v7();
        $extension = strtolower($file->getClientOriginalExtension()) ?: 'bin';
        $storedName = $id->toRfc4122().'.'.$extension;
        $size = (int) $file->getSize();
        $sha256 = (string) hash_file('sha256', $file->getPathname());

        $this->filesystem->mkdir($this->directory, 0700);
        $this->filesystem->copy($file->getPathname(), $this->path($storedName));
        $this->filesystem->chmod($this->path($storedName), 0600);

        $record = new ImportFile($type, mb_substr($file->getClientOriginalName(), 0, 255), $storedName, $size, $sha256, $createdCount, $importedBy, $id);
        $this->entityManager->persist($record);
        $this->entityManager->flush();

        return $record;
    }

    public function path(string $storedName): string
    {
        return $this->directory.'/'.basename($storedName);
    }

    /**
     * Supprime les fichiers importés avant cette date (même durée de conservation que le journal).
     *
     * @return int nombre de fichiers supprimés
     */
    public function purge(\DateTimeImmutable $before): int
    {
        $connection = $this->entityManager->getConnection();
        $names = $connection->fetchFirstColumn('SELECT stored_name FROM import_file WHERE imported_at < :limit', ['limit' => $before->format('Y-m-d H:i:sP')]);
        foreach ($names as $name) {
            $this->filesystem->remove($this->path($name));
        }
        $connection->executeStatement('DELETE FROM import_file WHERE imported_at < :limit', ['limit' => $before->format('Y-m-d H:i:sP')]);

        return \count($names);
    }
}
