# CRM Platform — Android app

A thin native shell around the live web app (`apps/web`), built with
[Capacitor](https://capacitorjs.com/). It's not a rewrite — `capacitor.config.ts`
points the app's WebView straight at the deployed CRM, so it's the exact same
React components, Tailwind theme, and login/data flow as the browser version.
The only native surface is the app icon, splash screen, status bar color, and
(once configured) push notifications.

## What's already done

- Native Android project generated at `android/` (package id
  `in.envisiontechsol.crm`, app name "CRM Platform").
- App icon and splash screen generated from the brand color (`#4f46e5`,
  the same `brand-600` used across the web app) — see "Replacing the icon"
  below to swap in a real logo.
- `@capacitor/push-notifications` is installed and synced into the Android
  project. The Firebase Gradle plugin is wired to apply *only if*
  `android/app/google-services.json` exists, so the app builds fine without
  it — push just won't work until that file is added (see below).

## What's NOT done yet (needs a decision, not just a build)

- **The app doesn't send or receive any pushes yet.** Getting a device token
  and having the backend actually notify on "task due soon" / send a daily
  digest is a separate, bigger piece of work (a scheduler + a backend
  endpoint to store device tokens + Firebase Admin SDK to dispatch) that
  hasn't been started. This app is ready to receive that once it's built.
- **HTTPS.** `capacitor.config.ts` currently points at
  `http://147.93.108.218:3002` — plain HTTP on a bare IP, with
  `usesCleartextTraffic="true"` set so Android allows it at all. That's fine
  to get the app running, but a CRM sending login credentials over
  unencrypted HTTP is a real gap independent of this app. Once there's a real
  domain + TLS cert, update `server.url` in `capacitor.config.ts` to the
  `https://` address and remove the cleartext flag.

## Building it

I can't compile or test an APK from this environment — there's no Android
SDK, Java, or Gradle installed here, and installing that whole toolchain on
this shared production VPS wasn't something I did without checking first.
So the rest of this is done on a machine with Android Studio:

1. Install [Android Studio](https://developer.android.com/studio) (it bundles
   the SDK and a JDK).
2. `git pull` this repo, then `pnpm install` at the repo root.
3. Open `apps/mobile/android` in Android Studio as an existing project.
4. Let Gradle sync (first run downloads dependencies — a few minutes).
5. Plug in an Android phone (USB debugging on) or start an emulator, then
   hit Run. For a real build: **Build → Generate Signed Bundle / APK**.

If you change anything in `capacitor.config.ts` (e.g. the server URL) or add
a Capacitor plugin, re-run from `apps/mobile`:

```bash
pnpm --filter @crm/mobile sync
```

## Enabling push notifications (Firebase)

1. Go to the [Firebase console](https://console.firebase.google.com/), create
   a project (free).
2. Add an Android app to it with package name `in.envisiontechsol.crm`.
3. Download the generated `google-services.json` and place it at
   `apps/mobile/android/app/google-services.json` (gitignored — never commit
   it, it holds real project credentials).
4. Rebuild. The Firebase/FCM plugin picks it up automatically.
5. The client-side registration code (asking for notification permission and
   sending the device token somewhere) still needs to be written, along with
   the backend to receive tokens and actually send messages — see "What's
   NOT done yet" above.

## Replacing the placeholder icon/splash

`resources/icon.png` and `resources/splash.png` are a generated placeholder
(solid brand color, a plain "C"), not a real logo. To swap them:

1. Replace `resources/icon.png` (1024×1024) and `resources/splash.png`
   (2732×2732) with real artwork.
2. Regenerate every density from them:
   ```bash
   pnpm --filter @crm/mobile assets
   pnpm --filter @crm/mobile sync
   ```
