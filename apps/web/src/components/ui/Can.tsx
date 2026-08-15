'use client';

import { usePermissions } from '@/lib/permissions';

/** Renders children only when the signed-in user holds the permission. */
export function Can({
  permission,
  any,
  children,
  fallback = null,
}: {
  permission?: string;
  any?: string[];
  children: React.ReactNode;
  fallback?: React.ReactNode;
}) {
  const { can, canAny } = usePermissions();

  const allowed = permission ? can(permission) : any ? canAny(...any) : true;
  return <>{allowed ? children : fallback}</>;
}
