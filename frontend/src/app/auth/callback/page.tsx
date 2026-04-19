'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/AuthProvider';

export default function AuthCallbackPage() {
  const { refreshUser } = useAuth();
  const router = useRouter();

  useEffect(() => {
    // After OAuth redirect, refresh user state and go home
    refreshUser().then(() => router.replace('/'));
  }, [refreshUser, router]);

  return (
    <div className="min-h-[80vh] flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500 mx-auto mb-4" />
        <p className="text-gray-400">Completing sign in...</p>
      </div>
    </div>
  );
}
