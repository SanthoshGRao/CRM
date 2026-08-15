'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState, useEffect } from 'react';

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 30 * 1000, // 30 seconds
            retry: 1,
            refetchOnWindowFocus: false,
          },
        },
      }),
  );

  useEffect(() => {
    const disableAutocomplete = (e: FocusEvent) => {
      const target = e.target;
      if (
        target instanceof HTMLInputElement ||
        target instanceof HTMLTextAreaElement
      ) {
        if (!target.hasAttribute('autocomplete') || target.getAttribute('autocomplete') !== 'off') {
          target.setAttribute('autocomplete', 'off');
        }
        target.setAttribute('autocorrect', 'off');
        target.setAttribute('autocapitalize', 'off');
        target.setAttribute('spellcheck', 'false');
      }
    };

    document.addEventListener('focusin', disableAutocomplete, true);
    return () => {
      document.removeEventListener('focusin', disableAutocomplete, true);
    };
  }, []);

  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}
