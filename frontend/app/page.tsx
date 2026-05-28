"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { api } from "@/lib/api";
import { Job, Approach, ApproachInfo } from "@/lib/types";
import { StatusBadge, ApproachBadge } from "@/components/StatusBadge";
import LogTerminal from "@/components/LogTerminal";

const POLL = 2500;

/* ─── Tiny icon SVGs (no import needed) ─── */
const IconDB    = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"/><path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"/></svg>;
const IconCheck = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>;
const IconZap   = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>;
const IconClock = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>;
const IconPlay  = () => <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"/></svg>;
const IconRefresh = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/></svg>;
const IconChevron = ({ open }: { open: boolean }) => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ transform: open ? "rotate(180deg)":"none", transition:"transform 0.2s" }}><polyline points="6 9 12 15 18 9"/></svg>;
const IconLink  = () => <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>;

/* ─── Card ─── */
function Card({ children, style = {} }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div style={{
      background:"#111827",
      border:"1px solid #1e2d4a",
      borderRadius:16,
      ...style,
    }}>
      {children}
    </div>
  );
}

/* ─── Stat card ─── */
function StatCard({ label, value, icon, color }: { label:string; value:string|number; icon:React.ReactNode; color:string }) {
  return (
    <Card style={{ padding:"18px 20px", display:"flex", alignItems:"center", gap:14 }}>
      <div style={{
        width:44, height:44, borderRadius:12, flexShrink:0,
        background:`${color}18`, border:`1px solid ${color}30`,
        display:"flex", alignItems:"center", justifyContent:"center", color,
      }}>
        {icon}
      </div>
      <div>
        <div style={{ fontSize:24, fontWeight:800, color, lineHeight:1.1 }}>{value}</div>
        <div style={{ fontSize:12, color:"#64748b", marginTop:3, fontWeight:500 }}>{label}</div>
      </div>
    </Card>
  );
}

/* ─── Job card ─── */
function JobCard({ job, onClick }: { job: Job; onClick: ()=>void }) {
  const ago = (() => {
    const s = (Date.now() - new Date(job.created_at).getTime()) / 1000;
    return s < 60 ? `${Math.floor(s)}s ago` : s < 3600 ? `${Math.floor(s/60)}m ago` : `${Math.floor(s/3600)}h ago`;
  })();

  return (
    <div
      onClick={onClick}
      style={{
        background:"#111827",
        border:"1px solid #1e2d4a",
        borderRadius:16, padding:20,
        cursor:"pointer", transition:"all 0.18s ease",
      }}
      onMouseEnter={e => {
        (e.currentTarget as HTMLElement).style.borderColor = "#3b82f6";
        (e.currentTarget as HTMLElement).style.background = "#1a2236";
        (e.currentTarget as HTMLElement).style.boxShadow = "0 4px 24px rgba(59,130,246,0.12)";
      }}
      onMouseLeave={e => {
        (e.currentTarget as HTMLElement).style.borderColor = "#1e2d4a";
        (e.currentTarget as HTMLElement).style.background = "#111827";
        (e.currentTarget as HTMLElement).style.boxShadow = "none";
      }}
    >
      {/* top row */}
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:12 }}>
        <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
          <StatusBadge status={job.status} />
          <ApproachBadge approach={job.approach} />
        </div>
        <div style={{ textAlign:"right" }}>
          <div style={{ fontSize:11, color:"#475569" }}>{ago}</div>
          <div style={{ fontSize:11, color:"#3b82f6", fontFamily:"JetBrains Mono, monospace", marginTop:3 }}>
            #{job.id.split("-")[0]}
          </div>
        </div>
      </div>

      {/* success stats */}
      {job.status === "success" && (
        <div style={{
          display:"flex", gap:16, marginBottom:12, padding:"10px 14px",
          background:"rgba(16,185,129,0.07)", border:"1px solid rgba(16,185,129,0.2)",
          borderRadius:10,
        }}>
          <span style={{ fontSize:12, color:"#34d399", fontWeight:600 }}>
            📊 {(job.rows_joined??0).toLocaleString()} rows
          </span>
          <span style={{ fontSize:12, color:"#34d399", fontWeight:600 }}>
            ⏱ {job.duration_sec}s
          </span>
        </div>
      )}

      {/* error */}
      {job.status === "failed" && job.error_message && (
        <div style={{
          fontSize:11, padding:"8px 12px", borderRadius:8, marginBottom:12,
          background:"rgba(239,68,68,0.07)", border:"1px solid rgba(239,68,68,0.2)",
          color:"#f87171", fontFamily:"JetBrains Mono,monospace",
        }}>
          {job.error_message.slice(0, 80)}…
        </div>
      )}

      {/* log preview */}
      <LogTerminal logs={job.log_messages} maxHeight="130px" />

      <div style={{ display:"flex", alignItems:"center", gap:4, marginTop:10, color:"#334155", fontSize:11 }}>
        <IconLink /> <span>View details</span>
      </div>
    </div>
  );
}

/* ─── Approach comparison card ─── */
function ApproachCard({ ap, idx }: { ap: ApproachInfo; idx: number }) {
  const accent = idx === 0 ? "#3b82f6" : "#8b5cf6";
  return (
    <div style={{
      background: idx === 0 ? "rgba(59,130,246,0.05)" : "rgba(139,92,246,0.05)",
      border: `1px solid ${accent}40`,
      borderRadius:16, padding:22,
    }}>
      <div style={{ display:"flex", alignItems:"center", gap:12, marginBottom:14 }}>
        <div style={{
          width:36, height:36, borderRadius:10,
          background:`${accent}20`, display:"flex", alignItems:"center",
          justifyContent:"center", fontSize:18,
        }}>
          {idx === 0 ? "⚡" : "⚙"}
        </div>
        <div>
          <div style={{ fontWeight:700, fontSize:14, color:"#f1f5f9" }}>{ap.name}</div>
          <div style={{ fontSize:11, color:"#64748b", marginTop:1 }}>{ap.best_for}</div>
        </div>
      </div>
      <p style={{ fontSize:12, color:"#94a3b8", lineHeight:1.7, marginBottom:14 }}>{ap.description}</p>

      <div style={{ marginBottom:12 }}>
        <div style={{ fontSize:10, fontWeight:700, color:"#34d399", textTransform:"uppercase", letterSpacing:1, marginBottom:6 }}>Pros</div>
        {ap.pros.map((p,i) => (
          <div key={i} style={{ display:"flex", gap:7, marginBottom:5 }}>
            <span style={{ color:"#34d399", flexShrink:0, marginTop:1 }}>✓</span>
            <span style={{ fontSize:12, color:"#94a3b8", lineHeight:1.6 }}>{p}</span>
          </div>
        ))}
      </div>

      <div>
        <div style={{ fontSize:10, fontWeight:700, color:"#f87171", textTransform:"uppercase", letterSpacing:1, marginBottom:6 }}>Cons</div>
        {ap.cons.map((c,i) => (
          <div key={i} style={{ display:"flex", gap:7, marginBottom:5 }}>
            <span style={{ color:"#f87171", flexShrink:0, marginTop:1 }}>✕</span>
            <span style={{ fontSize:12, color:"#94a3b8", lineHeight:1.6 }}>{c}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════
   MAIN PAGE
══════════════════════════════════════════════ */
export default function HomePage() {
  const [jobs, setJobs]             = useState<Job[]>([]);
  const [approaches, setApproaches] = useState<ApproachInfo[]>([]);
  const [selected, setSelected]     = useState<Approach>("background_task");
  const [triggering, setTriggering] = useState(false);
  const [loading, setLoading]       = useState(true);
  const [online, setOnline]         = useState<boolean|null>(null);
  const [showComp, setShowComp]     = useState(false);
  const [toast, setToast]           = useState<{msg:string;ok:boolean}|null>(null);
  const [selectedJob, setSelectedJob] = useState<Job|null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval>|null>(null);

  const fetchJobs = useCallback(async () => {
    try { setJobs(await api.listJobs()); } catch {}
  }, []);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try { await api.health(); setOnline(true); } catch { setOnline(false); }
      await fetchJobs();
      api.getApproaches().then(setApproaches).catch(()=>{});
      setLoading(false);
    })();
    pollRef.current = setInterval(fetchJobs, POLL);
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [fetchJobs]);

  // Keep selected job in sync
  useEffect(() => {
    if (selectedJob) {
      const fresh = jobs.find(j => j.id === selectedJob.id);
      if (fresh) setSelectedJob(fresh);
    }
  }, [jobs]);

  const trigger = async () => {
    setTriggering(true);
    try {
      const r = await api.triggerJoin(selected);
      showT(`Job created — #${r.job_id.split("-")[0]}`, true);
      await fetchJobs();
    } catch (e: any) {
      showT(e.message ?? "Failed", false);
    }
    setTriggering(false);
  };

  const showT = (msg: string, ok: boolean) => {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 4000);
  };

  const totalJobs   = jobs.length;
  const successJobs = jobs.filter(j => j.status === "success").length;
  const activeJobs  = jobs.filter(j => j.status === "running" || j.status === "pending").length;
  const avgDur      = (() => {
    const d = jobs.filter(j => j.duration_sec != null);
    return d.length ? `${Math.round(d.reduce((a,b)=>a+(b.duration_sec??0),0)/d.length)}s` : "—";
  })();

  /* ─── Detail modal ─── */
  if (selectedJob) {
    return <JobDetailModal job={selectedJob} onBack={() => setSelectedJob(null)} />;
  }

  /* ─── Main dashboard ─── */
  return (
    <div style={{ minHeight:"100vh", background:"#070b14", fontFamily:"Inter,sans-serif" }}>

      {/* BG glow */}
      <div style={{
        position:"fixed", inset:0, pointerEvents:"none", zIndex:0,
        background:`
          radial-gradient(ellipse 80% 40% at 15% -5%, rgba(59,130,246,0.10) 0%, transparent 65%),
          radial-gradient(ellipse 60% 40% at 85% 100%, rgba(139,92,246,0.08) 0%, transparent 60%)
        `,
      }}/>

      <div style={{ position:"relative", zIndex:1 }}>

        {/* ── Navbar ── */}
        <nav style={{
          position:"sticky", top:0, zIndex:50,
          background:"rgba(7,11,20,0.88)", backdropFilter:"blur(18px)",
          borderBottom:"1px solid #1e2d4a",
        }}>
          <div style={{
            maxWidth:1200, margin:"0 auto", padding:"0 24px",
            height:60, display:"flex", alignItems:"center", justifyContent:"space-between",
          }}>
            {/* Logo */}
            <div style={{ display:"flex", alignItems:"center", gap:10 }}>
              <div style={{
                width:32, height:32, borderRadius:9,
                background:"linear-gradient(135deg,#2563eb,#7c3aed)",
                display:"flex", alignItems:"center", justifyContent:"center",
              }}>
                <IconDB />
              </div>
              <div>
                <span style={{
                  fontWeight:800, fontSize:15,
                  background:"linear-gradient(90deg,#60a5fa,#22d3ee)",
                  WebkitBackgroundClip:"text", WebkitTextFillColor:"transparent",
                }}>DataFlow</span>
                <span style={{ fontSize:11, color:"#475569", marginLeft:6 }}>Scalable Join Engine</span>
              </div>
            </div>

            {/* Right badges */}
            <div style={{ display:"flex", alignItems:"center", gap:10 }}>
              <div style={{ display:"flex", alignItems:"center", gap:7 }}>
                <div style={{
                  width:8, height:8, borderRadius:"50%",
                  background: online === true ? "#34d399" : online === false ? "#f87171" : "#94a3b8",
                  boxShadow: online === true ? "0 0 6px #34d399" : "none",
                }}/>
                <span style={{ fontSize:12, color:"#64748b" }}>
                  {online === true ? "API Online" : online === false ? "API Offline" : "Checking…"}
                </span>
              </div>
              <button
                onClick={fetchJobs}
                style={{
                  background:"#111827", border:"1px solid #1e2d4a",
                  color:"#94a3b8", borderRadius:8, padding:"6px 12px",
                  cursor:"pointer", display:"flex", alignItems:"center", gap:5, fontSize:12,
                }}
              >
                <IconRefresh /> Refresh
              </button>
            </div>
          </div>
        </nav>

        {/* ── Main content ── */}
        <main style={{ maxWidth:1200, margin:"0 auto", padding:"40px 24px 80px" }}>

          {/* Hero */}
          <div style={{ marginBottom:36 }}>
            <div style={{
              display:"inline-flex", alignItems:"center", gap:7,
              padding:"5px 14px", borderRadius:99, fontSize:12, fontWeight:600, marginBottom:16,
              background:"rgba(59,130,246,0.1)", border:"1px solid rgba(59,130,246,0.25)", color:"#60a5fa",
            }}>
              ⚡ Assignment 1 + 2 — Live Demo
            </div>
            <h1 style={{ fontSize:42, fontWeight:900, lineHeight:1.15, marginBottom:14, letterSpacing:"-0.02em" }}>
              <span style={{
                background:"linear-gradient(135deg,#3b82f6,#06b6d4)",
                WebkitBackgroundClip:"text", WebkitTextFillColor:"transparent",
              }}>Out-of-Core</span>{" "}
              <span style={{ color:"#f1f5f9" }}>Data Join API</span>
            </h1>
            <p style={{ fontSize:15, color:"#94a3b8", maxWidth:640, lineHeight:1.75 }}>
              Joins 500 MB + 500 MB CSVs under a{" "}
              <strong style={{ color:"#22d3ee" }}>256 MB RAM</strong>{" "}
              constraint using hash-partition algorithm. Choose between two non-blocking approaches.
            </p>
          </div>

          {/* Stats */}
          <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(200px,1fr))", gap:14, marginBottom:28 }}>
            <StatCard label="Total Jobs"  value={totalJobs}   icon={<IconDB    />} color="#3b82f6" />
            <StatCard label="Completed"   value={successJobs} icon={<IconCheck />} color="#10b981" />
            <StatCard label="Active"      value={activeJobs}  icon={<IconZap   />} color="#06b6d4" />
            <StatCard label="Avg Duration" value={avgDur}    icon={<IconClock  />} color="#8b5cf6" />
          </div>

          {/* Trigger panel */}
          <Card style={{ padding:24, marginBottom:20 }}>
            <div style={{ fontSize:16, fontWeight:700, color:"#f1f5f9", marginBottom:18 }}>
              🚀 Trigger New Join Job
            </div>

            {/* Approach selector */}
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12, marginBottom:20 }}>
              {(["background_task","thread_pool"] as Approach[]).map((ap) => {
                const isSel   = selected === ap;
                const accent  = ap === "thread_pool" ? "#8b5cf6" : "#3b82f6";
                return (
                  <button
                    key={ap}
                    onClick={() => setSelected(ap)}
                    style={{
                      textAlign:"left", padding:"14px 16px", borderRadius:12,
                      border: isSel ? `1px solid ${accent}` : "1px solid #1e2d4a",
                      background: isSel ? `${accent}14` : "#0d1424",
                      cursor:"pointer", transition:"all 0.15s",
                      outline:"none",
                    }}
                  >
                    <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:5 }}>
                      <div style={{
                        width:16, height:16, borderRadius:"50%",
                        border: `2px solid ${isSel ? accent : "#334155"}`,
                        background: isSel ? accent : "transparent",
                        display:"flex", alignItems:"center", justifyContent:"center",
                        flexShrink:0,
                      }}>
                        {isSel && <div style={{ width:6, height:6, borderRadius:"50%", background:"white" }}/>}
                      </div>
                      <span style={{ fontSize:13, fontWeight:600, color: isSel ? accent : "#94a3b8" }}>
                        {ap === "background_task" ? "⚡ FastAPI BackgroundTasks" : "🧵 ThreadPoolExecutor"}
                      </span>
                    </div>
                    <p style={{ fontSize:12, color:"#475569", paddingLeft:24, lineHeight:1.6 }}>
                      {ap === "background_task"
                        ? "Built-in, zero-config. Runs after response, in the async event loop."
                        : "True OS thread via ThreadPoolExecutor. Runs immediately, parallel to the server."}
                    </p>
                  </button>
                );
              })}
            </div>

            {/* Trigger button */}
            <div style={{ display:"flex", alignItems:"center", gap:12 }}>
              <button
                onClick={trigger}
                disabled={triggering || online === false}
                style={{
                  display:"inline-flex", alignItems:"center", gap:8,
                  padding:"11px 26px", borderRadius:10, border:"none",
                  background: triggering||online===false ? "#1e2d4a" : "linear-gradient(135deg,#2563eb,#7c3aed)",
                  color: triggering||online===false ? "#475569" : "white",
                  fontWeight:700, fontSize:14, cursor: triggering||online===false ? "not-allowed" : "pointer",
                  transition:"all 0.2s", boxShadow: triggering||online===false ? "none" : "0 4px 18px rgba(37,99,235,0.35)",
                }}
              >
                {triggering
                  ? <><span className="animate-spin" style={{ display:"inline-block" }}><IconRefresh /></span> Triggering…</>
                  : <><IconPlay /> Trigger Join</>
                }
              </button>
              {online === false && (
                <span style={{ fontSize:12, color:"#f87171" }}>⚠ API offline — start the FastAPI backend</span>
              )}
            </div>
          </Card>

          {/* Approach comparison toggle */}
          <button
            onClick={() => setShowComp(v => !v)}
            style={{
              display:"flex", alignItems:"center", gap:6,
              background:"none", border:"none", cursor:"pointer",
              color:"#64748b", fontSize:13, fontWeight:500, marginBottom:14,
            }}
          >
            ℹ️ {showComp ? "Hide":"Show"} Approach Comparison <IconChevron open={showComp} />
          </button>

          {showComp && approaches.length > 0 && (
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:14, marginBottom:28 }}>
              {approaches.map((ap,i) => <ApproachCard key={ap.id} ap={ap} idx={i} />)}
            </div>
          )}

          {/* Info pills */}
          <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(220px,1fr))", gap:12, marginBottom:36 }}>
            {[
              { e:"🔀", t:"Hash Partition Join",    d:"64 buckets — only one pair loaded per pass. RAM stays ~30 MB." },
              { e:"📦", t:"50k Rows / Chunk",       d:"Streams CSVs in chunks — full file never in memory at once." },
              { e:"🧵", t:"ThreadPoolExecutor",     d:"Approach 2: true OS thread pool, parallel to the web server, no broker needed." },
            ].map(item => (
              <div key={item.t} style={{
                background:"#111827", border:"1px solid #1e2d4a",
                borderRadius:14, padding:"16px 18px",
              }}>
                <span style={{ fontSize:24 }}>{item.e}</span>
                <div style={{ fontWeight:600, fontSize:13, color:"#f1f5f9", marginTop:10, marginBottom:5 }}>
                  {item.t}
                </div>
                <div style={{ fontSize:12, color:"#64748b", lineHeight:1.65 }}>{item.d}</div>
              </div>
            ))}
          </div>

          {/* Jobs list */}
          <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:18 }}>
            <h2 style={{ fontSize:20, fontWeight:800, color:"#f1f5f9" }}>Job History</h2>
            <span style={{
              fontSize:12, padding:"4px 12px", borderRadius:99,
              background:"#111827", border:"1px solid #1e2d4a", color:"#475569",
            }}>
              {totalJobs} total · refreshes every 2.5s
            </span>
          </div>

          {loading ? (
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:14 }}>
              {[...Array(4)].map((_,i) => (
                <div key={i} className="shimmer-box" style={{ borderRadius:16, height:200 }} />
              ))}
            </div>
          ) : jobs.length === 0 ? (
            <div style={{
              background:"#111827", border:"1px dashed #1e2d4a",
              borderRadius:16, padding:"64px 24px",
              display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center",
              color:"#334155", textAlign:"center",
            }}>
              <div style={{ fontSize:40, marginBottom:14 }}>🗄</div>
              <p style={{ fontWeight:600, color:"#94a3b8", marginBottom:6 }}>No jobs yet</p>
              <p style={{ fontSize:13, color:"#475569" }}>Click "Trigger Join" above to run your first job.</p>
            </div>
          ) : (
            <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(440px,1fr))", gap:14 }}>
              {jobs.map(job => (
                <JobCard key={job.id} job={job} onClick={() => setSelectedJob(job)} />
              ))}
            </div>
          )}
        </main>

        {/* Footer */}
        <div style={{
          textAlign:"center", padding:"24px", color:"#334155", fontSize:12,
          borderTop:"1px solid #1e2d4a",
        }}>
          Built for Data Engineering Assignment · FastAPI + ThreadPoolExecutor + Next.js 16
        </div>
      </div>

      {/* Toast */}
      {toast && (
        <div style={{
          position:"fixed", bottom:24, right:24, zIndex:999,
          background: toast.ok ? "rgba(16,185,129,0.15)" : "rgba(239,68,68,0.15)",
          border: `1px solid ${toast.ok ? "rgba(16,185,129,0.4)":"rgba(239,68,68,0.4)"}`,
          color: toast.ok ? "#34d399" : "#f87171",
          padding:"12px 20px", borderRadius:12, fontWeight:600, fontSize:13,
          backdropFilter:"blur(12px)",
          boxShadow:"0 8px 32px rgba(0,0,0,0.5)",
        }}>
          {toast.ok ? "✅" : "❌"} {toast.msg}
        </div>
      )}
    </div>
  );
}

/* ══════════════════════════════════════════════
   JOB DETAIL MODAL (inline on same page)
══════════════════════════════════════════════ */
import { useEffect as ue, useState as us } from "react";

function JobDetailModal({ job, onBack }: { job: Job; onBack: ()=>void }) {
  const [results, setResults] = us<Record<string,string>[]|null>(null);
  const [loadingR, setLoadingR] = us(false);

  ue(() => {
    if (job.status === "success") {
      setLoadingR(true);
      api.getResults(job.id).then(r => setResults(r.preview_rows)).catch(()=>{}).finally(()=>setLoadingR(false));
    }
  }, [job.id, job.status]);

  const cols = results && results.length > 0 ? Object.keys(results[0]) : [];

  const statColor = job.status === "success" ? "#10b981" : job.status === "running" ? "#06b6d4" : job.status === "failed" ? "#ef4444" : "#f59e0b";

  return (
    <div style={{ minHeight:"100vh", background:"#070b14", fontFamily:"Inter,sans-serif" }}>
      {/* BG */}
      <div style={{
        position:"fixed", inset:0, pointerEvents:"none", zIndex:0,
        background:"radial-gradient(ellipse 80% 40% at 50% -20%, rgba(59,130,246,0.07) 0%, transparent 60%)",
      }}/>

      <div style={{ position:"relative", zIndex:1 }}>
        {/* Nav */}
        <nav style={{
          position:"sticky", top:0, zIndex:50,
          background:"rgba(7,11,20,0.88)", backdropFilter:"blur(18px)",
          borderBottom:"1px solid #1e2d4a",
        }}>
          <div style={{
            maxWidth:1100, margin:"0 auto", padding:"0 24px",
            height:60, display:"flex", alignItems:"center", justifyContent:"space-between",
          }}>
            <button
              onClick={onBack}
              style={{
                display:"flex", alignItems:"center", gap:7,
                background:"none", border:"none", cursor:"pointer",
                color:"#94a3b8", fontSize:13, fontWeight:500,
              }}
            >
              ← Back to Dashboard
            </button>
          </div>
        </nav>

        <main style={{ maxWidth:1100, margin:"0 auto", padding:"40px 24px 80px" }}>

          {/* Header */}
          <div style={{ marginBottom:28 }}>
            <div style={{ display:"flex", gap:8, marginBottom:10 }}>
              <StatusBadge status={job.status} />
              <ApproachBadge approach={job.approach} />
            </div>
            <h1 style={{ fontSize:32, fontWeight:900, color:"#f1f5f9", marginBottom:6 }}>Job Detail</h1>
            <code style={{ fontSize:12, color:"#475569" }}>{job.id}</code>
          </div>

          {/* Stats */}
          <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:14, marginBottom:24 }}>
            {[
              { label:"Status",      value: job.status.toUpperCase(), color: statColor },
              { label:"Rows Joined", value: job.rows_joined != null ? job.rows_joined.toLocaleString() : "—", color:"#3b82f6" },
              { label:"Duration",    value: job.duration_sec != null ? `${job.duration_sec}s` : "—", color:"#8b5cf6" },
              { label:"Approach",    value: job.approach === "thread_pool" ? "ThreadPool" : "BgTask", color: job.approach === "thread_pool" ? "#8b5cf6" : "#3b82f6" },
            ].map(s => (
              <div key={s.label} style={{
                background:"#111827", border:"1px solid #1e2d4a",
                borderRadius:14, padding:"16px 20px", textAlign:"center",
              }}>
                <div style={{ fontSize:22, fontWeight:800, color:s.color }}>{s.value}</div>
                <div style={{ fontSize:12, color:"#64748b", marginTop:4 }}>{s.label}</div>
              </div>
            ))}
          </div>

          {/* Error */}
          {job.status === "failed" && job.error_message && (
            <div style={{
              background:"rgba(239,68,68,0.07)", border:"1px solid rgba(239,68,68,0.25)",
              borderRadius:14, padding:"16px 20px", marginBottom:20,
              color:"#f87171", fontSize:12, fontFamily:"JetBrains Mono,monospace",
            }}>
              ❌ {job.error_message}
            </div>
          )}

          {/* Logs */}
          <div style={{
            background:"#111827", border:"1px solid #1e2d4a",
            borderRadius:16, padding:22, marginBottom:20,
          }}>
            <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:14 }}>
              <div style={{
                width:10, height:10, borderRadius:"50%",
                background: job.status === "running" ? "#22d3ee" : "#34d399",
                boxShadow: job.status === "running" ? "0 0 6px #22d3ee" : "none",
              }}/>
              <span style={{ fontWeight:700, fontSize:14, color:"#f1f5f9" }}>Job Logs</span>
              {job.status === "running" && (
                <span className="animate-pulse" style={{ fontSize:11, color:"#22d3ee" }}>live</span>
              )}
            </div>
            <LogTerminal logs={job.log_messages} maxHeight="300px" />
          </div>

          {/* Results preview */}
          {job.status === "success" && (
            <div style={{ background:"#111827", border:"1px solid #1e2d4a", borderRadius:16, padding:22 }}>
              <div style={{ fontWeight:700, fontSize:14, color:"#f1f5f9", marginBottom:16 }}>
                👁 Result Preview — first 100 rows
              </div>

              {loadingR ? (
                <div style={{ textAlign:"center", padding:32, color:"#64748b" }}>
                  <span className="animate-spin" style={{ display:"inline-block", marginRight:8 }}><IconRefresh /></span>
                  Loading preview…
                </div>
              ) : results && results.length > 0 ? (
                <div style={{ overflowX:"auto", borderRadius:10, border:"1px solid #1e2d4a" }}>
                  <table style={{ width:"100%", borderCollapse:"collapse", fontSize:12 }}>
                    <thead>
                      <tr style={{ background:"#0d1424", borderBottom:"1px solid #1e2d4a" }}>
                        {cols.map(c => (
                          <th key={c} style={{
                            padding:"10px 14px", textAlign:"left",
                            fontWeight:700, color:"#60a5fa",
                            textTransform:"uppercase", letterSpacing:"0.06em", whiteSpace:"nowrap",
                          }}>
                            {c}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {results.map((row, i) => (
                        <tr key={i} style={{
                          borderBottom:"1px solid #1a2236",
                          background: i % 2 === 0 ? "transparent" : "rgba(255,255,255,0.02)",
                        }}>
                          {cols.map(c => (
                            <td key={c} style={{
                              padding:"9px 14px", color:"#94a3b8",
                              fontFamily:"JetBrains Mono,monospace", whiteSpace:"nowrap",
                            }}>
                              {row[c]}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  <div style={{
                    padding:"10px 14px", background:"#0d1424",
                    borderTop:"1px solid #1e2d4a", fontSize:12, color:"#475569",
                  }}>
                    ✓ Showing {results.length} of {(job.rows_joined??0).toLocaleString()} total rows in result.csv
                  </div>
                </div>
              ) : (
                <div style={{ textAlign:"center", padding:40, color:"#475569" }}>No preview available</div>
              )}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
