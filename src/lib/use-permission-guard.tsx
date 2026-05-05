'use client';

import { useCallback } from 'react';
import { useAuth } from './use-auth';

export function usePermissionGuard() {
  const { isLoggedIn, setLoginDialogOpen, hasPermission } = useAuth();

  const requireAuth = useCallback(
    (action: () => void) => {
      if (!isLoggedIn) {
        setLoginDialogOpen(true);
        return;
      }
      action();
    },
    [isLoggedIn, setLoginDialogOpen]
  );

  const requirePermission = useCallback(
    (permissionKey: Parameters<typeof hasPermission>[0], action: () => void) => {
      if (!isLoggedIn) {
        setLoginDialogOpen(true);
        return false;
      }
      if (!hasPermission(permissionKey)) {
        return false;
      }
      action();
      return true;
    },
    [isLoggedIn, hasPermission, setLoginDialogOpen]
  );

  return { requireAuth, requirePermission };
}
