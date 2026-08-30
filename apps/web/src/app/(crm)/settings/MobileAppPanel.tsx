'use client';

import { useEffect, useState } from 'react';
import { Smartphone, Download } from 'lucide-react';

export function MobileAppPanel() {
  const [isAndroid, setIsAndroid] = useState<boolean | null>(null);

  useEffect(() => {
    setIsAndroid(/android/i.test(navigator.userAgent));
  }, []);

  return (
    <div className="card max-w-2xl">
      <div className="card-header">
        <h3>Mobile app</h3>
      </div>
      <div className="card-body flex items-start gap-4">
        <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
          <Smartphone className="h-6 w-6" />
        </div>
        <div className="flex-1">
          <p className="text-sm text-slate-600">
            Get the CRM as a native Android app — same login, same data, with push
            notifications for task and lead/deal assignments.
          </p>

          {isAndroid === null ? null : isAndroid ? (
            <a
              href="/api/download/android"
              className="btn-primary mt-4 inline-flex items-center gap-2"
            >
              <Download className="h-4 w-4" />
              Download for Android
            </a>
          ) : (
            <p className="mt-4 text-sm text-slate-500">
              Open this page on your Android phone to download the app.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
