'use client';

import { useAuth } from '@/lib/auth-context';

interface CanProps {
  permission?: string;
  permissions?: string[];
  role?: string;
  fallback?: React.ReactNode;
  children: React.ReactNode;
}

export function Can({ permission, permissions, role, fallback = null, children }: CanProps) {
  const { hasPermission, hasAnyPermission, hasRole } = useAuth();

  let allowed = false;

  if (role) {
    allowed = hasRole(role);
  } else if (permission) {
    allowed = hasPermission(permission);
  } else if (permissions) {
    allowed = hasAnyPermission(permissions);
  }

  return allowed ? <>{children}</> : <>{fallback}</>;
}
