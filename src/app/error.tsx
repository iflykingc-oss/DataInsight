'use client';

import { useEffect } from 'react';
import { Button } from '@/components/ui/button';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center space-y-4 px-6 max-w-md">
        <h2 className="text-xl font-semibold text-foreground">Something went wrong</h2>
        <p className="text-sm text-muted-foreground">
          An unexpected error occurred. Please try again.
        </p>
        <div className="flex gap-3 justify-center pt-2">
          <Button variant="outline" onClick={reset}>
            Try again
          </Button>
          <Button onClick={() => (window.location.href = '/')}>
            Go home
          </Button>
        </div>
      </div>
    </div>
  );
}
