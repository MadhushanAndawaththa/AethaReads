'use client';

import { useEffect, useState } from 'react';

import { api } from '@/lib/api';
import type { HealthStatus } from '@/lib/types';

export default function AdminHealthPage() {
  const [health, setHealth] = useState<HealthStatus | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getHealth().then(setHealth).finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <div className="card p-6">Checking system health…</div>;
  }

  if (!health) {
    return <div className="card p-6 text-red-300">Health check unavailable.</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs uppercase tracking-[0.2em] text-[var(--text-muted)] mb-2">Operations</p>
        <h1 className="text-3xl font-bold">System Health</h1>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <StatusCard label="Overall" ok={health.status === 'ok'} value={health.status} />
        <StatusCard label="PostgreSQL" ok={health.postgres} value={health.postgres ? 'connected' : 'down'} />
        <StatusCard label="Redis" ok={health.redis} value={health.redis ? 'connected' : 'down'} />
      </div>
    </div>
  );
}

function StatusCard({ label, ok, value }: { label: string; ok: boolean; value: string }) {
  return (
    <div className="card p-5">
      <p className="text-xs uppercase tracking-[0.2em] text-[var(--text-muted)] mb-2">{label}</p>
      <p className={`text-2xl font-bold ${ok ? 'text-green-300' : 'text-red-300'}`}>{value}</p>
    </div>
  );
}