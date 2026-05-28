"use client";
import { useEffect, useRef } from "react";

export default function LogTerminal({ logs, maxHeight = "240px" }: { logs: string; maxHeight?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (ref.current) ref.current.scrollTop = ref.current.scrollHeight;
  }, [logs]);

  const lines = (logs || "").trim().split("\n").filter(Boolean);

  return (
    <div ref={ref} className="log-term" style={{ maxHeight }}>
      {lines.length === 0
        ? <span style={{ color:"#475569" }}>Waiting for output…</span>
        : lines.map((line, i) => (
          <div key={i}>
            <span style={{ color:"#334155", userSelect:"none", marginRight:8 }}>
              {String(i+1).padStart(3," ")} │
            </span>
            <span style={{
              color: line.includes("✅") || line.includes("complete") || line.includes("success")
                ? "#86efac"
                : line.includes("❌") || line.includes("Error") || line.includes("failed")
                ? "#fca5a5"
                : line.includes("Phase") || line.includes("started") || line.includes("worker")
                ? "#93c5fd"
                : "#86efac",
            }}>
              {line}
            </span>
          </div>
        ))}
    </div>
  );
}
