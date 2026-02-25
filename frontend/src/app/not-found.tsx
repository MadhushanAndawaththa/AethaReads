import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] px-4 text-center">
      <p className="text-6xl mb-4">📖</p>
      <h1 className="text-2xl font-bold mb-2">Page Not Found</h1>
      <p className="text-[var(--text-muted)] mb-6 text-sm">
        The page you&apos;re looking for doesn&apos;t exist or has been moved.
      </p>
      <Link href="/" className="btn-primary text-sm">
        Return Home
      </Link>
    </div>
  );
}
