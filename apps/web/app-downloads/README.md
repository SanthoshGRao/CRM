Place the built Android APK here as `crm-platform.apk`.

Served only to Android devices via `GET /api/download/android`
(`apps/web/src/app/api/download/android/route.ts` checks the request's
User-Agent before returning the file). The `.apk` itself is gitignored —
rebuilding or updating the app means copying a fresh one here, no code
change needed.

To get one: in Android Studio, **Build → Build Bundle(s) / APK(s) → Build
APK(s)** (or just use the debug APK already produced by Run, found at
`apps/mobile/android/app/build/outputs/apk/debug/app-debug.apk`).
