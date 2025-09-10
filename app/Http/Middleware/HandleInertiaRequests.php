<?php

namespace App\Http\Middleware;

use Illuminate\Foundation\Inspiring;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\App;
use Illuminate\Support\Facades\File;
use Inertia\Middleware;

class HandleInertiaRequests extends Middleware
{
    /**
     * The root template that's loaded on the first page visit.
     *
     * @see https://inertiajs.com/server-side-setup#root-template
     *
     * @var string
     */
    protected $rootView = 'app';

    /**
     * Determines the current asset version.
     *
     * @see https://inertiajs.com/asset-versioning
     */
    public function version(Request $request): ?string
    {
        return parent::version($request);
    }

    /**
     * Define the props that are shared by default.
     *
     * @see https://inertiajs.com/shared-data
     *
     * @return array<string, mixed>
     */
    public function share(Request $request): array
    {
        [$message, $author] = str(Inspiring::quotes()->random())->explode('-');

        return [
            ...parent::share($request),
            'name' => config('app.name'),
            'quote' => ['message' => trim($message), 'author' => trim($author)],
            'auth' => [
                'user' => $request->user(),
            ],
            'sidebarOpen' => ! $request->hasCookie('sidebar_state') || $request->cookie('sidebar_state') === 'true',
            'translations' => $this->getTranslations(App::getLocale()),
            'locale' => App::getLocale(),
        ];
    }

    /**
     * Get all translation files for the given locale.
     */
    private function getTranslations(string $locale): array
    {
        $translations = [];
        $langPath = resource_path("lang/{$locale}");

        if (!File::isDirectory($langPath)) {
            // Fallback to Spanish if locale directory doesn't exist
            $langPath = resource_path("lang/es");
            if (!File::isDirectory($langPath)) {
                return $translations;
            }
        }

        try {
            $files = File::files($langPath);

            foreach ($files as $file) {
                $filename = $file->getFilenameWithoutExtension();
                if ($file->getExtension() === 'php') {
                    $translations[$filename] = require $file->getPathname();
                }
            }
        } catch (\Exception $e) {
            // Log the error in production but don't break the app
            \Log::error('Failed to load translations', ['locale' => $locale, 'path' => $langPath, 'error' => $e->getMessage()]);
        }

        return $translations;
    }
}
