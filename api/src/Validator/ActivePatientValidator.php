<?php

namespace App\Validator;

use App\Entity\Patient;
use Symfony\Component\Validator\Constraint;
use Symfony\Component\Validator\ConstraintValidator;
use Symfony\Component\Validator\Exception\UnexpectedTypeException;

final class ActivePatientValidator extends ConstraintValidator
{
    public function validate(mixed $value, Constraint $constraint): void
    {
        if (!$constraint instanceof ActivePatient) {
            throw new UnexpectedTypeException($constraint, ActivePatient::class);
        }
        if ($value instanceof Patient && $value->isArchived()) {
            $this->context->buildViolation($constraint->message)->addViolation();
        }
    }
}
