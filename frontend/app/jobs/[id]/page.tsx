"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { Job } from "@/lib/types";
import { StatusBadge, ApproachBadge } from "@/components/StatusBadge";
import LogTerminal from "@/components/LogTerminal";
import {
  ArrowLeft, RefreshCw, Rows3, Clock, Database,
  Eye, AlertTriangle, CheckCircle2,
} from "lucide-react";

const POLL_INTERVAL = 2000;

export default function JobDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const [job, setJob] = useState<Job | null>(null);
  const [results, setResults] = useState<Record<string, string>[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingResults, setLoadingResults] = useState(false);
  const pollRef = useRef<NodeJS.Timeout | null>(null);

  const fetchJob = useCallback(async () => {
    try {
      const data = await api.getJob(id);
      setJob(data);
      return data;
    } catch {
      return null;
    }
  }, [id]);

  const fetchResults = async () => {
    setLoadingResults(true);
    try {
      const r = await api.getResults(id);
      setResults(r.preview_rows);
    } catch {}
    setLoadingResults(false);
  };

  useEffect(() => {
    (async () => {
      setLoading(true);
      const data = await fetchJob();
      setLoading(false);

      // Auto-load results if already done
      if (data?.status === "success") {
        fetchResults();
      }
    })();

    // Poll while job is active
    pollRef.current = setInterval(async () => {
      const data = await fetchJob();
      if (data?.status === "success" && !results) {
        fetchResults();
      }
      if (data?.status === "success" || data?.status === "failed") {
        if (pollRef.current) clearInterval(pollRef.current);
      }
    }, POLL_INTERVAL);

    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "var(--bg-primary)" }}>
        <div className="flex flex-col items-center gap-4">
          <RefreshCw size={28} className="animate-spin" color="var(--accent-blue)" />
          <p style={{ color: "var(--text-muted)" }}>Loading job…</p>
        </div>
      </div>
    );
  }

  if (!job) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "var(--bg-primary)" }}>
        <div className="text-center">
          <AlertTriangle size={40} color="var(--accent-amber)" className="mx-auto mb-4" />
          <p className="font-semibold" style={{ color: "var(--text-primary)" }}>Job not found</p>
          <button className="btn-secondary mt-4" onClick={() => router.push("/")}>
            <ArrowLeft size={14} /> Go back
          </button>
        </div>
      </div>
    );
  }

  const columns = results && results.length > 0 ? Object.keys(results[0]) : [];

  return (
    <div className="min-h-screen" style={{ background: "var(--bg-primary)" }}>
      {/* Background */}
      <div
        style={{
          position: "fixed", inset: 0, zIndex: 0, pointerEvents: "none",
          background: `radial-gradient(ellipse 80% 40% at 50% -20%, rgba(59,130,246,0.07) 0%, transparent 60%)`,
        }}
      />

      <div className="relative z-10">
        {/* Navbar */}
        <nav
          style={{
            background: "rgba(10,14,26,0.85)",
            borderBottom: "1px solid var(--border)",
            backdropFilter: "blur(16px)",
            position: "sticky", top: 0, zIndex: 50,
          }}
        >
          <div className="max-w-5xl mx-auto px-6 h-16 flex items-center justify-between">
            <button
              className="flex items-center gap-2 text-sm font-medium"
              style={{ color: "var(--text-secondary)", background: "none", border: "none", cursor: "pointer" }}
              onClick={() => router.push("/")}
            >
              <ArrowLeft size={16} /> Back to Dashboard
            </button>
            <button className="btn-secondary" onClick={fetchJob}>
              <RefreshCw size={13} /> Refresh
            </button>
          </div>
        </nav>

        <main className="max-w-5xl mx-auto px-6 py-10">
          {/* Header */}
          <div className="mb-8">
            <div className="flex flex-wrap items-center gap-3 mb-3">
              <StatusBadge status={job.status} />
              <ApproachBadge approach={job.approach} />
            </div>
            <h1 className="text-3xl font-extrabold mb-1" style={{ color: "var(--text-primary)" }}>
              Job Detail
            </h1>
            <p
              className="text-sm mono"
              style={{ color: "var(--text-muted)", letterSpacing: "0.03em" }}
            >
              {job.id}
            </p>
          </div>

          {/* Stats cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            {[
              {
                label: "Status",
                value: job.status.toUpperCase(),
                color:
                  job.status === "success"
                    ? "var(--accent-green)"
                    : job.status === "running"
                    ? "var(--accent-cyan)"
                    : job.status === "failed"
                    ? "var(--accent-red)"
                    : "var(--accent-amber)",
              },
              {
                label: "Rows Joined",
                value: job.rows_joined != null ? job.rows_joined.toLocaleString() : "—",
                color: "var(--accent-blue)",
              },
              {
                label: "Duration",
                value: job.duration_sec != null ? `${job.duration_sec}s` : "—",
                color: "var(--accent-purple)",
              },
              {
                label: "Approach",
                value: job.approach === "celery" ? "Celery" : "BgTask",
                color: job.approach === "celery" ? "var(--accent-purple)" : "var(--accent-blue)",
              },
            ].map((s) => (
              <div
                key={s.label}
                className="glass rounded-2xl p-4 text-center"
                style={{ border: "1px solid var(--border)" }}
              >
                <p className="text-2xl font-bold" style={{ color: s.color }}>
                  {s.value}
                </p>
                <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>
                  {s.label}
                </p>
              </div>
            ))}
          </div>

          {/* Error box */}
          {job.status === "failed" && job.error_message && (
            <div
              className="rounded-2xl p-5 mb-6 flex items-start gap-3"
              style={{
                background: "rgba(239,68,68,0.07)",
                border: "1px solid rgba(239,68,68,0.25)",
              }}
            >
              <AlertTriangle size={18} color="var(--accent-red)" className="shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-semibold mb-1" style={{ color: "var(--accent-red)" }}>
                  Error
                </p>
                <p
                  className="text-xs mono"
                  style={{ color: "var(--text-secondary)", whiteSpace: "pre-wrap" }}
                >
                  {job.error_message}
                </p>
              </div>
            </div>
          )}

          {/* Logs */}
          <div className="glass rounded-2xl p-6 mb-6" style={{ border: "1px solid var(--border)" }}>
            <div className="flex items-center gap-2 mb-4">
              <div
                className="w-3 h-3 rounded-full"
                style={{ background: job.status === "running" ? "var(--accent-cyan)" : "var(--accent-green)" }}
              />
              <span className="font-semibold text-sm" style={{ color: "var(--text-primary)" }}>
                Job Logs
              </span>
              {job.status === "running" && (
                <span className="text-xs animate-pulse" style={{ color: "var(--accent-cyan)" }}>
                  live
                </span>
              )}
            </div>
            <LogTerminal logs={job.log_messages} maxHeight="320px" />
          </div>

          {/* Results preview */}
          {job.status === "success" && (
            <div className="glass rounded-2xl p-6" style={{ border: "1px solid var(--border)" }}>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Eye size={16} color="var(--accent-blue)" />
                  <span className="font-semibold text-sm" style={{ color: "var(--text-primary)" }}>
                    Result Preview (first 100 rows)
                  </span>
                </div>
                {!results && (
                  <button className="btn-secondary" onClick={fetchResults} disabled={loadingResults}>
                    {loadingResults ? <RefreshCw size={13} className="animate-spin" /> : <Eye size={13} />}
                    {loadingResults ? "Loading…" : "Load Preview"}
                  </button>
                )}
              </div>

              {results ? (
                results.length > 0 ? (
                  <div className="overflow-x-auto rounded-xl" style={{ border: "1px solid var(--border)" }}>
                    <table className="w-full text-xs">
                      <thead>
                        <tr style={{ background: "var(--bg-secondary)", borderBottom: "1px solid var(--border)" }}>
                          {columns.map((col) => (
                            <th
                              key={col}
                              className="px-4 py-3 text-left font-semibold uppercase tracking-wider"
                              style={{ color: "var(--accent-blue)", whiteSpace: "nowrap" }}
                            >
                              {col}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {results.map((row, i) => (
                          <tr
                            key={i}
                            style={{
                              borderBottom: "1px solid var(--border)",
                              background: i % 2 === 0 ? "transparent" : "rgba(255,255,255,0.015)",
                            }}
                          >
                            {columns.map((col) => (
                              <td
                                key={col}
                                className="px-4 py-2.5 mono"
                                style={{ color: "var(--text-secondary)", whiteSpace: "nowrap" }}
                              >
                                {row[col]}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    <div
                      className="px-4 py-3 flex items-center gap-2"
                      style={{
                        background: "var(--bg-secondary)",
                        borderTop: "1px solid var(--border)",
                      }}
                    >
                      <CheckCircle2 size={13} color="var(--accent-green)" />
                      <span className="text-xs" style={{ color: "var(--text-muted)" }}>
                        Showing {results.length} of {(job.rows_joined ?? 0).toLocaleString()} total rows from result.csv
                      </span>
                    </div>
                  </div>
                ) : (
                  <p className="text-sm" style={{ color: "var(--text-muted)" }}>No rows found.</p>
                )
              ) : (
                <div
                  className="rounded-xl flex items-center justify-center py-12"
                  style={{ border: "1px dashed var(--border)" }}
                >
                  <div className="text-center">
                    <Database size={32} color="var(--text-muted)" className="mx-auto mb-3" />
                    <p className="text-sm" style={{ color: "var(--text-muted)" }}>
                      Click "Load Preview" to see the first 100 joined rows.
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
