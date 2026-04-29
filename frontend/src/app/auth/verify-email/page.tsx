'use client';

import { Suspense, useEffect, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';

import { api } from '@/lib/api';
import { useAuth } from '@/components/AuthProvider';

function VerifyEmailContent() {
  const searchParams = useSearchParams();
  const { refreshUser } = useAuth();
  const token = searchParams.get('token') ?? '';
  const sent = searchParams.get('sent') === '1';

  const [status, setStatus] = useState<'idle' | 'verifying' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState(sent ? 'Check your inbox for a verification link.' : 'Verify your email to unlock community features.');

  useEffect(() => {
    if (!token) {
      return;
    }

    setStatus('verifying');
    api.verifyEmail(token)
      .then(async (result) => {
        setStatus('success');
        setMessage(result.message);
        await refreshUser();
      })
      .catch((err) => {
        setStatus('error');
        setMessage(err instanceof Error ? err.message : 'Failed to verify email.');
      });
  }, [refreshUser, token]);

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4">
      <div className="w-full max-w-md text-center space-y-5">
        <div>
          <h1 className="text-3xl font-bold">Verify your email</h1>
          <p className="text-[var(--text-muted)] text-sm mt-2">This protects community features from spam and abuse.</p>
        </div>

        <div className={`rounded-2xl border px-5 py-4 text-sm ${status === 'error' ? 'border-red-500/20 bg-red-500/10 text-red-300' : status === 'success' ? 'border-green-500/20 bg-green-500/10 text-green-300' : 'border-[var(--border-color)] bg-[var(--bg-secondary)] text-[var(--text-secondary)]'}`}>
          {status === 'verifying' ? 'Verifying…' : message}
        </div>

        <div className="flex flex-wrap justify-center gap-3">
          <Link href="/settings" className="btn-secondary text-sm">Account settings</Link>
          <Link href="/dashboard" className="btn-primary text-sm">Go to dashboard</Link>
        </div>
      </div>
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense>
      <VerifyEmailContent />
    </Suspense>
  );
}