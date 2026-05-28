"use client";
import { Job } from "@/lib/types";
import { StatusBadge, ApproachBadge } from "./StatusBadge";
import LogTerminal from "./LogTerminal";
import { Clock, Rows3, Link } from "lucide-react";
import { useRouter } from "next/navigation";

interface JobCardProps {
  job: Job;
  compact?: boolean;
}

function timeAgo(isoString: string) {
  const diff = (Date.now() - new Date(isoString).getTime()) / 1000;
  if (diff < 60) return `${Math.floor(diff)}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  return `${Math.floor(diff / 3600)}h ago`;
}

export default function JobCard({ job, compact = false }: JobCardProps) {
  const router = useRouter();

  return (
    <div
      className="glass glass-hover rounded-2xl p-5 cursor-pointer transition-all duration-200"
      onClick={() => router.push(`/jobs/${job.id}`)}
      style={{ border: "1px solid var(--border)" }}
    >
      {/* Header row */}
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex flex-col gap-2">
          <StatusBadge status={job.status} />
          <ApproachBadge approach={job.approach} />
        </div>
        <div className="text-right">
          <p className="text-xs" style={{ color: "var(--text-muted)" }}>
            {timeAgo(job.created_at)}
          </p>
          <p
            className="text-xs mt-1 font-medium"
            style={{ color: "var(--accent-blue)", fontFamily: "JetBrains Mono, monospace" }}
          >
            #{job.id.split("-")[0]}
          </p>
        </div>
      </div>

      {/* Stats row */}
      {job.status === "success" && (
        <div
          className="flex gap-4 mb-4 p-3 rounded-xl"
          style={{ background: "rgba(16,185,129,0.05)", border: "1px solid rgba(16,185,129,0.15)" }}
        >
          <div className="flex items-center gap-2">
            <Rows3 size={14} color="var(--accent-green)" />
            <span className="text-xs font-semibold" style={{ color: "var(--accent-green)" }}>
              {(job.rows_joined ?? 0).toLocaleString()} rows
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Clock size={14} color="var(--accent-green)" />
            <span className="text-xs font-semibold" style={{ color: "var(--accent-green)" }}>
              {job.duration_sec}s
            </span>
          </div>
        </div>
      )}

      {job.status === "failed" && job.error_message && (
        <div
          className="mb-4 p-3 rounded-xl text-xs"
          style={{
            background: "rgba(239,68,68,0.05)",
            border: "1px solid rgba(239,68,68,0.15)",
            color: "var(--accent-red)",
            fontFamily: "JetBrains Mono, monospace",
          }}
        >
          {job.error_message}
        </div>
      )}

      {/* Logs preview (compact) */}
      {!compact && <LogTerminal logs={job.log_messages} maxHeight="160px" />}

      {/* Click hint */}
      <div
        className="flex items-center gap-1 mt-3 text-xs"
        style={{ color: "var(--text-muted)" }}
      >
        <Link size={11} />
        <span>View details</span>
      </div>
    </div>
  );
}
