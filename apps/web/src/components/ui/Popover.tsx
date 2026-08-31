'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';
import { clsx } from 'clsx';

interface PopoverProps {
  trigger: (opts: { open: boolean; toggle: () => void }) => ReactNode;
  children: (opts: { close: () => void }) => ReactNode;
  align?: 'left' | 'right';
  panelClassName?: string;
}

/** Trigger + floating panel that closes on an outside click. No open state is kept by the caller. */
export function Popover({ trigger, children, align = 'left', panelClassName }: PopoverProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [open]);

  return (
    <div className="relative" ref={ref}>
      {trigger({ open, toggle: () => setOpen((o) => !o) })}
      {open && (
        <div
          className={clsx(
            'absolute top-full z-20 mt-1.5 rounded-lg border border-slate-200 bg-white shadow-lg',
            align === 'right' ? 'right-0' : 'left-0',
            panelClassName,
          )}
        >
          {children({ close: () => setOpen(false) })}
        </div>
      )}
    </div>
  );
}
