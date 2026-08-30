import { NextRequest } from 'next/server';
import { readFile } from 'fs/promises';
import path from 'path';

// Deliberately outside `public/` — anything in `public/` is served
// unconditionally by Next.js, which would bypass the Android check below.
const APK_PATH = path.join(process.cwd(), 'app-downloads', 'crm-platform.apk');

export async function GET(request: NextRequest) {
  const userAgent = request.headers.get('user-agent') ?? '';
  if (!/android/i.test(userAgent)) {
    return new Response('This link only works when opened on an Android device.', {
      status: 403,
    });
  }

  let file: Buffer;
  try {
    file = await readFile(APK_PATH);
  } catch {
    return new Response('The Android app build is not available yet.', { status: 404 });
  }

  return new Response(new Uint8Array(file), {
    headers: {
      'Content-Type': 'application/vnd.android.package-archive',
      'Content-Disposition': 'attachment; filename="CRM-Platform.apk"',
      'Content-Length': String(file.length),
    },
  });
}
