'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

import { api } from '@/lib/api';
import { useAuth } from '@/components/AuthProvider';
import { useToast } from '@/components/Toast';

interface ReportButtonProps {
  targetType: 'comment' | 'review' | 'novel' | 'user' | 'chapter';
  targetId: string;
  compact?: boolean;
}

const REPORT_REASONS = [
  { value: 'spam', label: 'Spam or promotion' },
  { value: 'abuse', label: 'Harassment or abuse' },
  { value: 'spoiler', label: 'Spoiler / misleading content' },
  { value: 'adult', label: 'Mature or unsafe content' },
  { value: 'other', label: 'Other' },
];

export function ReportButton({ targetType, targetId, compact = false }: ReportButtonProps) {
  const { user } = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState('spam');
  const [details, setDetails] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleOpen = () => {
    if (!user) {
      router.push('/auth/login');
      return;
    }
    setOpen(true);
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setSubmitting(true);
    try {
      await api.createReport({
        target_type: targetType,
        target_id: targetId,
        reason,
        details: details.trim(),
      });
      toast('Report submitted', 'success');
      setOpen(false);
      setDetails('');
      setReason('spam');
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Failed to submit report', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={handleOpen}
        className={compact ? 'text-[10px] text-[var(--text-muted)] hover:text-red-400 transition-colors' : 'text-xs text-[var(--text-muted)] hover:text-red-400 transition-colors'}
      >
        Report
      </button>

      {open && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center px-4">
          <div className="absolute inset-0 bg-black/60" onClick={() => setOpen(false)} />
          <form onSubmit={handleSubmit} className="relative w-full max-w-md rounded-2xl border border-[var(--border-color)] bg-[var(--bg-card)] p-5 shadow-2xl space-y-4">
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-[var(--text-muted)] mb-2">Report</p>
              <h3 className="text-lg font-semibold">Why are you reporting this?</h3>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1.5 text-[var(--text-secondary)]">Reason</label>
              <select
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className="w-full px-4 py-3 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-color)] outline-none focus:border-brand-500"
              >
                {REPORT_REASONS.map((option) => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1.5 text-[var(--text-secondary)]">Details</label>
              <textarea
                value={details}
                onChange={(e) => setDetails(e.target.value)}
                rows={4}
                maxLength={1000}
                placeholder="Add context that will help moderators review this report."
                className="w-full px-4 py-3 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-color)] outline-none focus:border-brand-500 resize-y"
              />
            </div>

            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => setOpen(false)} className="btn-secondary text-sm">Cancel</button>
              <button type="submit" disabled={submitting} className="btn-primary text-sm disabled:opacity-60">
                {submitting ? 'Sending…' : 'Submit Report'}
              </button>
            </div>
          </form>
        </div>
      )}
    </>
  );
}