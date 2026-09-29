<?php

namespace App\Training;

use App\Entity\Module;
use App\Entity\ModuleCompetency;
use App\Entity\SessionCompetencyValidation;
use App\Exception\WorkflowException;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Component\HttpKernel\Exception\NotFoundHttpException;

/**
 * Intégration du contenu d'une séance (API du prestataire, commande app:content:import) :
 * contrôle de structure, mise à jour de la séance et de ses compétences.
 */
final class ModuleContentImporter
{
    public function __construct(
        private readonly EntityManagerInterface $entityManager,
        private readonly ContentValidator $validator,
    ) {
    }

    public function find(string $code): Module
    {
        return $this->entityManager->getRepository(Module::class)->findOneBy(['code' => $code])
            ?? throw new NotFoundHttpException(\sprintf('Séance %s inconnue.', $code));
    }

    /**
     * @param list<array<string, mixed>> $content
     * @param list<string>               $competencies
     *
     * @return list<string> erreurs de structure (rien n'est enregistré s'il y en a)
     */
    public function import(Module $module, string $title, string $description, int $estimatedDuration, bool $published, array $content, array $competencies): array
    {
        $errors = $this->validator->validate($content);
        if (\count($competencies) > Module::MAX_COMPETENCIES) {
            $errors[] = \sprintf('Une séance compte au plus %d compétences.', Module::MAX_COMPETENCIES);
        }
        if ([] !== $errors) {
            return $errors;
        }

        $module->setTitle($title)
            ->setDescription($description)
            ->setEstimatedDuration($estimatedDuration)
            ->setPublished($published)
            ->setContent($content);
        $this->syncCompetencies($module, array_values($competencies));
        $this->entityManager->flush();

        return [];
    }

    /**
     * @return array<string, mixed> format d'échange de l'API d'intégration
     */
    public function export(Module $module): array
    {
        return [
            'code' => $module->getCode(),
            'title' => $module->getTitle(),
            'description' => $module->getDescription(),
            'estimatedDuration' => $module->getEstimatedDuration(),
            'published' => $module->isPublished(),
            'competencies' => array_map(static fn (ModuleCompetency $c) => $c->getLabel(), $this->sortedCompetencies($module)),
            'content' => $module->getContent(),
        ];
    }

    /**
     * Compétences mises à jour par position ; une compétence déjà évaluée en séance ne peut pas être supprimée.
     *
     * @param list<string> $labels
     */
    private function syncCompetencies(Module $module, array $labels): void
    {
        $existing = $this->sortedCompetencies($module);

        foreach ($labels as $position => $label) {
            $competency = $existing[$position] ?? null;
            if (null === $competency) {
                $competency = (new ModuleCompetency())->setModule($module);
                $module->getCompetencies()->add($competency);
                $this->entityManager->persist($competency);
            }
            $competency->setLabel($label)->setPosition($position);
        }

        foreach (\array_slice($existing, \count($labels)) as $removed) {
            $used = $this->entityManager->getRepository(SessionCompetencyValidation::class)->count(['competency' => $removed]);
            if ($used > 0) {
                throw new WorkflowException(\sprintf('La compétence « %s » a déjà été évaluée en séance : elle ne peut pas être supprimée.', $removed->getLabel()));
            }
            $module->getCompetencies()->removeElement($removed);
            $this->entityManager->remove($removed);
        }
    }

    /**
     * @return list<ModuleCompetency>
     */
    private function sortedCompetencies(Module $module): array
    {
        $competencies = $module->getCompetencies()->toArray();
        usort($competencies, static fn (ModuleCompetency $a, ModuleCompetency $b) => $a->getPosition() <=> $b->getPosition());

        return $competencies;
    }
}
