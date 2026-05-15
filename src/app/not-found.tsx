import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center space-y-4 px-6">
        <h1 className="text-6xl font-bold text-foreground">404</h1>
        <h2 className="text-xl font-semibold text-foreground">Page not found</h2>
        <p className="text-sm text-muted-foreground max-w-sm">
          The page you are looking for does not exist or has been moved.
        </p>
        <Link
          href="/"
          className="inline-flex items-center gap-1 text-sm text-primary hover:underline mt-4"
        >
          ← Back to DataInsight
        </Link>
      </div>
    </div>
  );
}
