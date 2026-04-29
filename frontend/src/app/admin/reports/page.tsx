'use client';

import { useEffect, useState } from 'react';

import { api } from '@/lib/api';
import type { Report } from '@/lib/types';
import { useToast } from '@/components/Toast';

export default function AdminReportsPage() {
  const { toast } = useToast();
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('pending');

  const loadReports = async (status = filter) => {
    setLoading(true);
    try {
      const result = await api.getAdminReports(status);
      setReports(result.data || []);
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Failed to load reports', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReports();
  }, [filter]);

  const actOnReport = async (report: Report, action: string, status?: string) => {
    try {
      await api.updateAdminReport(report.id, { action, status, reason: report.reason });
      toast('Report updated', 'success');
      await loadReports();
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Failed to update report', 'error');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-[var(--text-muted)] mb-2">Moderation</p>
          <h1 className="text-3xl font-bold">Reports</h1>
        </div>
        <select value={filter} onChange={(e) => setFilter(e.target.value)} className="px-4 py-3 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-color)] outline-none focus:border-brand-500">
          <option value="pending">Pending</option>
          <option value="resolved">Resolved</option>
          <option value="dismissed">Dismissed</option>
          <option value="all">All</option>
        </select>
      </div>

      {loading ? (
        <div className="card p-6">Loading reports…</div>
      ) : reports.length === 0 ? (
        <div className="card p-6 text-[var(--text-muted)]">No reports found for this filter.</div>
      ) : (
        <div className="space-y-4">
          {reports.map((report) => (
            <div key={report.id} className="card p-5 space-y-4">
              <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
                <div>
                  <p className="text-sm font-semibold">{report.target_type} · {report.reason}</p>
                  <p className="text-xs text-[var(--text-muted)] mt-1">Reporter: {report.reporter_display_name || report.reporter_username || report.reporter_id}</p>
                  <p className="text-xs text-[var(--text-muted)]">Target ID: {report.target_id}</p>
                </div>
                <span className="text-xs uppercase tracking-[0.2em] text-[var(--text-muted)]">{report.status}</span>
              </div>

              {report.details && <p className="text-sm text-[var(--text-secondary)]">{report.details}</p>}

              <div className="flex flex-wrap gap-2">
                {(report.target_type === 'comment' || report.target_type === 'review') && (
                  <button onClick={() => actOnReport(report, 'hide', 'resolved')} className="btn-primary text-sm">Hide</button>
                )}
                {report.target_type === 'user' && (
                  <button onClick={() => actOnReport(report, 'suspend', 'resolved')} className="btn-primary text-sm">Suspend user</button>
                )}
                <button onClick={() => actOnReport(report, 'resolve', 'resolved')} className="btn-secondary text-sm">Resolve</button>
                <button onClick={() => actOnReport(report, 'dismiss', 'dismissed')} className="btn-secondary text-sm">Dismiss</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}