<?php

namespace App\Controller;

use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\DependencyInjection\Attribute\Autowire;
use Symfony\Component\HttpFoundation\BinaryFileResponse;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\File\UploadedFile;
use Symfony\Component\Routing\Attribute\Route;

final class CourseMediaController extends AbstractController
{
    public function __construct(#[Autowire('%course_media_dir%')] private readonly string $mediaDir) {}

    #[Route('/api/content/media', methods: ['POST'])]
    public function upload(Request $request): JsonResponse
    {
        $this->denyAccessUnlessGranted('ROLE_ADMIN_NATIONAL');
        $file = $request->files->get('file');
        if (!$file instanceof UploadedFile || !$file->isValid() || $file->getSize() > 5 * 1024 * 1024) {
            return $this->json(['detail' => 'Choisissez une image de 5 Mo maximum.'], 422);
        }
        $info = @getimagesize($file->getPathname());
        $extensions = ['image/png' => 'png', 'image/jpeg' => 'jpg', 'image/webp' => 'webp'];
        if (false === $info || !isset($extensions[$info['mime']]) || $info[0] * $info[1] > 20000000) {
            return $this->json(['detail' => 'Format accepté : PNG, JPEG ou WebP, jusqu’à 20 millions de pixels.'], 422);
        }
        $name = bin2hex(random_bytes(20)).'.'.$extensions[$info['mime']];
        $file->move($this->mediaDir, $name);

        return $this->json(['url' => '/api/content/media/'.$name], 201);
    }

    // Illustrations de cours uniquement : aucune donnée patient. Noms aléatoires non énumérables.
    #[Route('/api/content/media/{name}', requirements: ['name' => '[a-f0-9]{40}\.(png|jpg|webp)'], methods: ['GET'])]
    public function image(string $name): BinaryFileResponse
    {
        $path = $this->mediaDir.'/'.$name;
        if (!is_file($path)) {
            throw $this->createNotFoundException();
        }
        $response = new BinaryFileResponse($path);
        $response->headers->set('X-Content-Type-Options', 'nosniff');
        $response->headers->set('Content-Type', match (pathinfo($name, PATHINFO_EXTENSION)) {
            'png' => 'image/png', 'jpg' => 'image/jpeg', default => 'image/webp',
        });
        $response->setPublic()->setMaxAge(31536000);

        return $response;
    }
}
