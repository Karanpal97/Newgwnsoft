"use client";
import { JobStatus, Approach } from "@/lib/types";

const S = {
  pending: { bg:"rgba(245,158,11,0.12)", border:"rgba(245,158,11,0.35)", color:"#fbbf24" },
  running: { bg:"rgba(6,182,212,0.12)",  border:"rgba(6,182,212,0.35)",  color:"#22d3ee" },
  success: { bg:"rgba(16,185,129,0.12)", border:"rgba(16,185,129,0.35)", color:"#34d399" },
  failed:  { bg:"rgba(239,68,68,0.12)",  border:"rgba(239,68,68,0.35)",  color:"#f87171" },
} as const;

export function StatusBadge({ status }: { status: JobStatus }) {
  const s = S[status];
  return (
    <span style={{
      display:"inline-flex", alignItems:"center", gap:6,
      padding:"3px 10px", borderRadius:99, fontSize:12, fontWeight:600,
      background:s.bg, border:`1px solid ${s.border}`, color:s.color,
    }}>
      {status === "running" && (
        <span style={{ position:"relative", display:"inline-flex", width:8, height:8 }}>
          <span className="animate-ping" style={{
            position:"absolute", inset:0, borderRadius:"50%", background:s.color, opacity:0.75,
          }}/>
          <span style={{ borderRadius:"50%", width:8, height:8, background:s.color, display:"block" }}/>
        </span>
      )}
      {status === "success" && "✓ "}
      {status === "failed"  && "✕ "}
      {status === "pending" && "◷ "}
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  );
}

export function ApproachBadge({ approach }: { approach: Approach }) {
  const isThread = approach === "thread_pool";
  return (
    <span style={{
      display:"inline-flex", alignItems:"center", gap:5,
      padding:"3px 10px", borderRadius:99, fontSize:12, fontWeight:600,
      background: isThread ? "rgba(139,92,246,0.12)" : "rgba(59,130,246,0.12)",
      border:     isThread ? "1px solid rgba(139,92,246,0.35)" : "1px solid rgba(59,130,246,0.35)",
      color:      isThread ? "#a78bfa" : "#60a5fa",
    }}>
      {isThread ? "🧵 ThreadPoolExecutor" : "⚡ BackgroundTasks"}
    </span>
  );
}
