"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { Job } from "@/lib/types";
import { StatusBadge, ApproachBadge } from "@/components/StatusBadge";
import LogTerminal from "@/components/LogTerminal";

const POLL_INTERVAL = 2000;

const IconRefresh = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/></svg>;
const IconBack = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>;
const IconEye = () => <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>;
const IconWarn = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>;

export default function JobDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const [job, setJob] = useState<Job | null>(null);
  const [results, setResults] = useState<Record<string, string>[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingR, setLoadingR] = useState(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchJob = useCallback(async () => {
    try { const d = await api.getJob(id); setJob(d); return d; } catch { return null; }
  }, [id]);

  const fetchResults = async () => {
    setLoadingR(true);
    try { const r = await api.getResults(id); setResults(r.preview_rows); } catch {}
    setLoadingR(false);
  };

  useEffect(() => {
    (async () => {
      setLoading(true);
      const d = await fetchJob();
      setLoading(false);
      if (d?.status === "success") fetchResults();
    })();

    pollRef.current = setInterval(async () => {
      const d = await fetchJob();
      if (d?.status === "success" && !results) fetchResults();
      if (d?.status === "success" || d?.status === "failed") {
        if (pollRef.current) clearInterval(pollRef.current);
      }
    }, POLL_INTERVAL);

    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [id]);

  if (loading) return (
    <div style={{ minHeight:"100vh", background:"#070b14", display:"flex", alignItems:"center", justifyContent:"center" }}>
      <div style={{ textAlign:"center" }}>
        <span className="animate-spin" style={{ display:"inline-block", color:"#3b82f6", marginBottom:12 }}><IconRefresh /></span>
        <p style={{ color:"#475569", fontSize:14 }}>Loading job…</p>
      </div>
    </div>
  );

  if (!job) return (
    <div style={{ minHeight:"100vh", background:"#070b14", display:"flex", alignItems:"center", justifyContent:"center" }}>
      <div style={{ textAlign:"center" }}>
        <div style={{ fontSize:40, marginBottom:12 }}>⚠️</div>
        <p style={{ color:"#f1f5f9", fontWeight:600, marginBottom:16 }}>Job not found</p>
        <button onClick={() => router.push("/")} style={{
          background:"#111827", border:"1px solid #1e2d4a", color:"#94a3b8",
          padding:"8px 18px", borderRadius:8, cursor:"pointer", fontSize:13,
          display:"inline-flex", alignItems:"center", gap:6,
        }}>
          <IconBack /> Back
        </button>
      </div>
    </div>
  );

  const statColor = job.status === "success" ? "#10b981" : job.status === "running" ? "#06b6d4" : job.status === "failed" ? "#ef4444" : "#f59e0b";
  const cols = results && results.length > 0 ? Object.keys(results[0]) : [];

  return (
    <div style={{ minHeight:"100vh", background:"#070b14", fontFamily:"Inter,sans-serif" }}>
      <div style={{ position:"fixed", inset:0, pointerEvents:"none", zIndex:0, background:"radial-gradient(ellipse 80% 40% at 50% -20%, rgba(59,130,246,0.07) 0%, transparent 60%)" }}/>
      <div style={{ position:"relative", zIndex:1 }}>
        {/* Nav */}
        <nav style={{ position:"sticky", top:0, zIndex:50, background:"rgba(7,11,20,0.88)", backdropFilter:"blur(18px)", borderBottom:"1px solid #1e2d4a" }}>
          <div style={{ maxWidth:1100, margin:"0 auto", padding:"0 24px", height:60, display:"flex", alignItems:"center", justifyContent:"space-between" }}>
            <button onClick={() => router.push("/")} style={{ display:"flex", alignItems:"center", gap:7, background:"none", border:"none", cursor:"pointer", color:"#94a3b8", fontSize:13, fontWeight:500 }}>
              <IconBack /> Back to Dashboard
            </button>
            <button onClick={fetchJob} style={{ background:"#111827", border:"1px solid #1e2d4a", color:"#94a3b8", borderRadius:8, padding:"6px 12px", cursor:"pointer", display:"flex", alignItems:"center", gap:5, fontSize:12 }}>
              <IconRefresh /> Refresh
            </button>
          </div>
        </nav>

        <main style={{ maxWidth:1100, margin:"0 auto", padding:"40px 24px 80px" }}>
          {/* Header */}
          <div style={{ marginBottom:28 }}>
            <div style={{ display:"flex", gap:8, marginBottom:12 }}>
              <StatusBadge status={job.status} />
              <ApproachBadge approach={job.approach} />
            </div>
            <h1 style={{ fontSize:32, fontWeight:900, color:"#f1f5f9", marginBottom:6 }}>Job Detail</h1>
            <code style={{ fontSize:12, color:"#475569" }}>{job.id}</code>
          </div>

          {/* Stats */}
          <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:14, marginBottom:24 }}>
            {[
              { label:"Status",      value:job.status.toUpperCase(),                                          color:statColor },
              { label:"Rows Joined", value:job.rows_joined != null ? job.rows_joined.toLocaleString() : "—", color:"#3b82f6" },
              { label:"Duration",    value:job.duration_sec != null ? `${job.duration_sec}s` : "—",           color:"#8b5cf6" },
              { label:"Approach",    value:job.approach === "thread_pool" ? "ThreadPool" : "BgTask",          color:job.approach === "thread_pool" ? "#8b5cf6" : "#3b82f6" },
            ].map(s => (
              <div key={s.label} style={{ background:"#111827", border:"1px solid #1e2d4a", borderRadius:14, padding:"16px 20px", textAlign:"center" }}>
                <div style={{ fontSize:22, fontWeight:800, color:s.color }}>{s.value}</div>
                <div style={{ fontSize:12, color:"#64748b", marginTop:4 }}>{s.label}</div>
              </div>
            ))}
          </div>

          {/* Error */}
          {job.status === "failed" && job.error_message && (
            <div style={{ background:"rgba(239,68,68,0.07)", border:"1px solid rgba(239,68,68,0.25)", borderRadius:14, padding:"16px 20px", marginBottom:20, display:"flex", gap:12, alignItems:"flex-start" }}>
              <span style={{ color:"#f87171", flexShrink:0, marginTop:1 }}><IconWarn /></span>
              <div>
                <div style={{ fontWeight:700, fontSize:13, color:"#f87171", marginBottom:4 }}>Error</div>
                <code style={{ fontSize:12, color:"#94a3b8", whiteSpace:"pre-wrap" }}>{job.error_message}</code>
              </div>
            </div>
          )}

          {/* Logs */}
          <div style={{ background:"#111827", border:"1px solid #1e2d4a", borderRadius:16, padding:22, marginBottom:20 }}>
            <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:14 }}>
              <div style={{ width:10, height:10, borderRadius:"50%", background:job.status === "running" ? "#22d3ee" : "#34d399", boxShadow:job.status === "running" ? "0 0 6px #22d3ee" : "none" }}/>
              <span style={{ fontWeight:700, fontSize:14, color:"#f1f5f9" }}>Job Logs</span>
              {job.status === "running" && <span className="animate-pulse" style={{ fontSize:11, color:"#22d3ee" }}>live</span>}
            </div>
            <LogTerminal logs={job.log_messages} maxHeight="300px" />
          </div>

          {/* Results preview */}
          {job.status === "success" && (
            <div style={{ background:"#111827", border:"1px solid #1e2d4a", borderRadius:16, padding:22 }}>
              <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:16 }}>
                <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                  <span style={{ color:"#3b82f6" }}><IconEye /></span>
                  <span style={{ fontWeight:700, fontSize:14, color:"#f1f5f9" }}>Result Preview — first 100 rows</span>
                </div>
                {!results && (
                  <button onClick={fetchResults} disabled={loadingR} style={{ background:"#0d1424", border:"1px solid #1e2d4a", color:"#94a3b8", borderRadius:8, padding:"6px 14px", cursor:"pointer", display:"flex", alignItems:"center", gap:5, fontSize:12 }}>
                    {loadingR ? <span className="animate-spin" style={{ display:"inline-block" }}><IconRefresh /></span> : <IconEye />}
                    {loadingR ? "Loading…" : "Load Preview"}
                  </button>
                )}
              </div>

              {results ? (
                results.length > 0 ? (
                  <div style={{ overflowX:"auto", borderRadius:10, border:"1px solid #1e2d4a" }}>
                    <table style={{ width:"100%", borderCollapse:"collapse", fontSize:12 }}>
                      <thead>
                        <tr style={{ background:"#0d1424", borderBottom:"1px solid #1e2d4a" }}>
                          {cols.map(c => (
                            <th key={c} style={{ padding:"10px 14px", textAlign:"left", fontWeight:700, color:"#60a5fa", textTransform:"uppercase", letterSpacing:"0.06em", whiteSpace:"nowrap" }}>{c}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {results.map((row, i) => (
                          <tr key={i} style={{ borderBottom:"1px solid #1a2236", background:i%2===0?"transparent":"rgba(255,255,255,0.02)" }}>
                            {cols.map(c => (
                              <td key={c} style={{ padding:"9px 14px", color:"#94a3b8", fontFamily:"JetBrains Mono,monospace", whiteSpace:"nowrap" }}>{row[c]}</td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    <div style={{ padding:"10px 14px", background:"#0d1424", borderTop:"1px solid #1e2d4a", fontSize:12, color:"#475569" }}>
                      ✓ Showing {results.length} of {(job.rows_joined??0).toLocaleString()} total rows
                    </div>
                  </div>
                ) : <p style={{ color:"#475569", fontSize:13 }}>No rows found.</p>
              ) : (
                <div style={{ textAlign:"center", padding:40, color:"#475569", border:"1px dashed #1e2d4a", borderRadius:12 }}>
                  Click "Load Preview" to see the first 100 joined rows.
                </div>
              )}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
