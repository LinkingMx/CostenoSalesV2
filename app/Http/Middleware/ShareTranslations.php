<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\App;
use Illuminate\Support\Facades\File;
use Inertia\Inertia;
use Symfony\Component\HttpFoundation\Response;

class ShareTranslations
{
    /**
     * Handle an incoming request.
     *
     * @param  \Closure(\Illuminate\Http\Request): (\Symfony\Component\HttpFoundation\Response)  $next
     */
    public function handle(Request $request, Closure $next): Response
    {
        $locale = App::getLocale();
        $translations = $this->getTranslations($locale);

        Inertia::share([
            'translations' => $translations,
            'locale' => $locale,
        ]);

        return $next($request);
    }

    /**
     * Get all translation files for the given locale.
     */
    private function getTranslations(string $locale): array
    {
        $translations = [];
        $langPath = resource_path("lang/{$locale}");

        if (!File::isDirectory($langPath)) {
            return $translations;
        }

        $files = File::files($langPath);

        foreach ($files as $file) {
            $filename = $file->getFilenameWithoutExtension();
            $translations[$filename] = require $file->getPathname();
        }

        return $translations;
    }
}
