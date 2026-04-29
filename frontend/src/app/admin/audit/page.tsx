'use client';

import { useEffect, useMemo, useState } from 'react';

import { api } from '@/lib/api';
import type { AuditLog } from '@/lib/types';
import { useToast } from '@/components/Toast';

function formatDetails(details: string) {
  if (!details) return 'No additional details';
  try {
    const parsed = JSON.parse(details) as Record<string, unknown>;
    return JSON.stringify(parsed, null, 2);
  } catch {
    return details;
  }
}

export default function AdminAuditPage() {
  const { toast } = useToast();
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [limit, setLimit] = useState(50);
  const [query, setQuery] = useState('');

  useEffect(() => {
    const loadLogs = async () => {
      setLoading(true);
      try {
        const result = await api.getAuditLogs(limit);
        setLogs(result.data || []);
      } catch (err) {
        toast(err instanceof Error ? err.message : 'Failed to load audit logs', 'error');
      } finally {
        setLoading(false);
      }
    };

    loadLogs();
  }, [limit, toast]);

  const filteredLogs = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) return logs;
    return logs.filter((log) => [log.action, log.resource_type, log.resource_id || '', log.actor_id || '', log.details || '']
      .some((value) => value.toLowerCase().includes(term)));
  }, [logs, query]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-[var(--text-muted)] mb-2">Admin</p>
          <h1 className="text-3xl font-bold">Audit Log</h1>
          <p className="text-sm text-[var(--text-secondary)] mt-2">Track moderation, auth, and account-level actions recorded by the backend.</p>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row">
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Filter actions, actors, resources..."
            className="min-w-[260px] px-4 py-3 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-color)] outline-none focus:border-brand-500"
          />
          <select
            value={String(limit)}
            onChange={(e) => setLimit(Number(e.target.value))}
            className="px-4 py-3 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-color)] outline-none focus:border-brand-500"
          >
            <option value="25">Last 25</option>
            <option value="50">Last 50</option>
            <option value="100">Last 100</option>
          </select>
        </div>
      </div>

      {loading ? (
        <div className="card p-6">Loading audit log…</div>
      ) : filteredLogs.length === 0 ? (
        <div className="card p-6 text-[var(--text-muted)]">No audit records matched the current filter.</div>
      ) : (
        <div className="space-y-4">
          {filteredLogs.map((log) => (
            <article key={log.id} className="card p-5 space-y-4">
              <div className="flex flex-col gap-2 lg:flex-row lg:items-start lg:justify-between">
                <div className="space-y-1">
                  <p className="text-sm font-semibold">{log.action}</p>
                  <p className="text-xs text-[var(--text-muted)]">
                    Resource: {log.resource_type}
                    {log.resource_id ? ` · ${log.resource_id}` : ''}
                  </p>
                  <p className="text-xs text-[var(--text-muted)]">
                    Actor: {log.actor_id || 'system'}
                  </p>
                </div>
                <time className="text-xs uppercase tracking-[0.2em] text-[var(--text-muted)]">
                  {new Date(log.created_at).toLocaleString()}
                </time>
              </div>

              <pre className="overflow-x-auto rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-color)] px-4 py-3 text-xs text-[var(--text-secondary)] whitespace-pre-wrap break-words">
                {formatDetails(log.details)}
              </pre>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}