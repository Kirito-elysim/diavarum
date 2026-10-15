<?php

namespace App\Exception;

use Symfony\Component\HttpKernel\Exception\UnprocessableEntityHttpException;

/**
 * Règle métier non respectée (ex. lancer une séance sur un parcours achevé) : réponse 422
 * avec un message destiné à l'utilisateur.
 */
final class WorkflowException extends UnprocessableEntityHttpException
{
}
