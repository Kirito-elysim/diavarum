<?php

namespace App\Reporting;

use Dompdf\Dompdf;
use Dompdf\Options;
use Twig\Environment;

/**
 * Exports PDF (bouton complémentaire à l'export Excel), à partir des gabarits templates/reports/.
 */
final class PdfWriter
{
    public function __construct(private readonly Environment $twig)
    {
    }

    /**
     * @param array<string, mixed> $context
     */
    public function render(string $template, array $context, string $orientation = 'portrait'): string
    {
        $options = new Options();
        $options->set('defaultFont', 'DejaVu Sans');
        // Aucune ressource externe : rien ne sort du serveur (données de santé)
        $options->set('isRemoteEnabled', false);

        $pdf = new Dompdf($options);
        $pdf->loadHtml($this->twig->render($template, $context + ['logo' => $this->logo()]));
        $pdf->setPaper('A4', $orientation);
        $pdf->render();

        return (string) $pdf->output();
    }

    private function logo(): string
    {
        return 'data:image/svg+xml;base64,'.base64_encode((string) file_get_contents(__DIR__.'/../../templates/reports/diaverum-logo.svg'));
    }
}
