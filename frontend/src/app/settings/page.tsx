'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

import { useAuth } from '@/components/AuthProvider';
import { api } from '@/lib/api';
import { useToast } from '@/components/Toast';
import type { User } from '@/lib/types';

export default function SettingsPage() {
  const { user, loading: authLoading, refreshUser } = useAuth();
  const router = useRouter();
  const { toast } = useToast();

  const [profile, setProfile] = useState<User | null>(null);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [changingPassword, setChangingPassword] = useState(false);
  const [resendingVerification, setResendingVerification] = useState(false);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      router.replace('/auth/login');
      return;
    }
    api.getMyProfile().then((result) => setProfile(result.user)).catch(() => setProfile(user));
  }, [authLoading, router, user]);

  const handleChangePassword = async (event: React.FormEvent) => {
    event.preventDefault();
    if (newPassword !== confirmPassword) {
      toast('New passwords do not match', 'error');
      return;
    }
    if (newPassword.length < 8) {
      toast('Password must be at least 8 characters', 'error');
      return;
    }

    setChangingPassword(true);
    try {
      const result = await api.changePassword(currentPassword, newPassword);
      toast(result.message, 'success');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Failed to change password', 'error');
    } finally {
      setChangingPassword(false);
    }
  };

  const handleResendVerification = async () => {
    setResendingVerification(true);
    try {
      const result = await api.resendVerification();
      toast(result.message, 'success');
      await refreshUser();
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Failed to resend verification email', 'error');
    } finally {
      setResendingVerification(false);
    }
  };

  if (authLoading || !profile) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-500" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">
      <div>
        <p className="text-xs uppercase tracking-[0.2em] text-[var(--text-muted)] mb-2">Account</p>
        <h1 className="text-3xl font-bold">Settings</h1>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="card p-6 space-y-4">
          <div>
            <h2 className="text-lg font-semibold">Email verification</h2>
            <p className="text-sm text-[var(--text-muted)] mt-1">Verified accounts can comment, review, follow novels, and submit reports.</p>
          </div>
          <div className={`rounded-xl px-4 py-3 text-sm ${profile.email_verified ? 'border border-green-500/20 bg-green-500/10 text-green-300' : 'border border-amber-500/20 bg-amber-500/10 text-amber-300'}`}>
            {profile.email_verified ? 'Your email is verified.' : 'Your email is not verified yet.'}
          </div>
          {!profile.email_verified && (
            <button onClick={handleResendVerification} disabled={resendingVerification} className="btn-primary text-sm disabled:opacity-60">
              {resendingVerification ? 'Sending…' : 'Resend verification email'}
            </button>
          )}
        </section>

        <section className="card p-6 space-y-4">
          <div>
            <h2 className="text-lg font-semibold">Change password</h2>
            <p className="text-sm text-[var(--text-muted)] mt-1">Use this if you signed up with email and password.</p>
          </div>
          <form onSubmit={handleChangePassword} className="space-y-4">
            <input type="password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} placeholder="Current password" className="w-full px-4 py-3 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-color)] outline-none focus:border-brand-500" />
            <input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="New password" className="w-full px-4 py-3 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-color)] outline-none focus:border-brand-500" />
            <input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="Confirm new password" className="w-full px-4 py-3 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-color)] outline-none focus:border-brand-500" />
            <button type="submit" disabled={changingPassword} className="btn-primary text-sm disabled:opacity-60">
              {changingPassword ? 'Updating…' : 'Change password'}
            </button>
          </form>
        </section>
      </div>
    </div>
  );
}