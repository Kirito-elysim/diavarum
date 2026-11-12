<?php

namespace App\Validator;

use App\Entity\Patient;
use App\Service\PatientDuplicates;
use Symfony\Component\Validator\Constraint;
use Symfony\Component\Validator\ConstraintValidator;
use Symfony\Component\Validator\Exception\UnexpectedTypeException;

final class UniquePatientValidator extends ConstraintValidator
{
    public function __construct(private readonly PatientDuplicates $duplicates)
    {
    }

    public function validate(mixed $value, Constraint $constraint): void
    {
        if (!$constraint instanceof UniquePatient) {
            throw new UnexpectedTypeException($constraint, UniquePatient::class);
        }
        if (!$value instanceof Patient || null === $value->getCenter()) {
            return;
        }

        $found = $this->duplicates->inspect($this->duplicates->index([$value->getCenter()]), $value, $value->getCenter());
        foreach ($found['errors'] as $message) {
            $this->context->buildViolation($message)->atPath('lastName')->addViolation();
        }
    }
}
