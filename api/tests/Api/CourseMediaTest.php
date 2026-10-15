<?php

namespace App\Tests\Api;

use App\Enum\UserRole;
use Symfony\Component\HttpFoundation\File\UploadedFile;

final class CourseMediaTest extends ApiTestCaseBase
{
    public function testOnlyAdminCanUploadAndImagesAreServedWithSafeType(): void
    {
        $admin = $this->createUser(UserRole::AdminNational);
        $ide = $this->createUser(UserRole::Ide, [$this->createCenter()]);
        $this->requestAs($ide, 'POST', '/api/content/media');
        self::assertResponseStatusCodeSame(403);
        $token = $this->tokenFor($admin);
        $file = tempnam(sys_get_temp_dir(), 'course-image-');
        file_put_contents($file, base64_decode('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jVZkAAAAASUVORK5CYII='));
        $stored = null;
        try {
            $response = $this->client->request('POST', '/api/content/media', [
                'auth_bearer' => $token,
                'extra' => ['files' => ['file' => new UploadedFile($file, 'image.php', 'image/png', null, true)]],
            ]);
            self::assertResponseStatusCodeSame(201);
            $url = $response->toArray()['url'];
            self::assertMatchesRegularExpression('#^/api/content/media/[a-f0-9]{40}\.png$#', $url);
            $stored = static::getContainer()->getParameter('course_media_dir').'/'.basename($url);
            $this->client->request('GET', $url);
            self::assertResponseIsSuccessful();
            self::assertResponseHeaderSame('content-type', 'image/png');
            self::assertResponseHeaderSame('x-content-type-options', 'nosniff');
        } finally {
            if (is_file($file)) unlink($file);
            if ($stored && is_file($stored)) unlink($stored);
        }
    }

    public function testNonImageIsRejected(): void
    {
        $admin = $this->createUser(UserRole::AdminNational);
        $token = $this->tokenFor($admin);
        $file = tempnam(sys_get_temp_dir(), 'course-image-');
        file_put_contents($file, '<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>');
        try {
            $this->client->request('POST', '/api/content/media', ['auth_bearer' => $token, 'extra' => ['files' => ['file' => new UploadedFile($file, 'image.png', 'image/png', null, true)]]]);
            self::assertResponseStatusCodeSame(422);
        } finally { unlink($file); }
    }
}
