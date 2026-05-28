"use client";
import { ApproachInfo } from "@/lib/types";
import { CheckCircle2, XCircle } from "lucide-react";

interface Props {
  approaches: ApproachInfo[];
}

export default function ApproachComparison({ approaches }: Props) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {approaches.map((ap, idx) => (
        <div
          key={ap.id}
          className="glass rounded-2xl p-6"
          style={{
            border: `1px solid ${
              idx === 0 ? "rgba(59,130,246,0.3)" : "rgba(139,92,246,0.3)"
            }`,
            background: `${
              idx === 0
                ? "rgba(59,130,246,0.04)"
                : "rgba(139,92,246,0.04)"
            }`,
          }}
        >
          {/* Title */}
          <div className="flex items-center gap-3 mb-4">
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center text-lg"
              style={{
                background: idx === 0 ? "rgba(59,130,246,0.15)" : "rgba(139,92,246,0.15)",
              }}
            >
              {idx === 0 ? "⚡" : "⚙"}
            </div>
            <div>
              <h3 className="font-bold text-sm" style={{ color: "var(--text-primary)" }}>
                {ap.name}
              </h3>
              <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                {ap.best_for}
              </p>
            </div>
          </div>

          <p className="text-xs mb-5" style={{ color: "var(--text-secondary)", lineHeight: 1.7 }}>
            {ap.description}
          </p>

          {/* Pros */}
          <div className="mb-4">
            <p
              className="text-xs font-semibold uppercase tracking-widest mb-2"
              style={{ color: "var(--accent-green)" }}
            >
              Pros
            </p>
            <ul className="space-y-1.5">
              {ap.pros.map((p, i) => (
                <li key={i} className="flex items-start gap-2">
                  <CheckCircle2
                    size={13}
                    className="mt-0.5 shrink-0"
                    color="var(--accent-green)"
                  />
                  <span className="text-xs" style={{ color: "var(--text-secondary)", lineHeight: 1.6 }}>
                    {p}
                  </span>
                </li>
              ))}
            </ul>
          </div>

          {/* Cons */}
          <div>
            <p
              className="text-xs font-semibold uppercase tracking-widest mb-2"
              style={{ color: "var(--accent-red)" }}
            >
              Cons
            </p>
            <ul className="space-y-1.5">
              {ap.cons.map((c, i) => (
                <li key={i} className="flex items-start gap-2">
                  <XCircle
                    size={13}
                    className="mt-0.5 shrink-0"
                    color="var(--accent-red)"
                  />
                  <span className="text-xs" style={{ color: "var(--text-secondary)", lineHeight: 1.6 }}>
                    {c}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      ))}
    </div>
  );
}
