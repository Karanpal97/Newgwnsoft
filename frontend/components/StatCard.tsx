"use client";
import { ReactNode } from "react";

interface StatCardProps {
  label: string;
  value: string | number;
  icon: ReactNode;
  color?: string;
  sub?: string;
}

export default function StatCard({ label, value, icon, color = "var(--accent-blue)", sub }: StatCardProps) {
  return (
    <div
      className="glass rounded-2xl p-5 flex items-center gap-4"
      style={{ border: "1px solid var(--border)" }}
    >
      <div
        className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0"
        style={{ background: `${color}18`, border: `1px solid ${color}30` }}
      >
        <span style={{ color }}>{icon}</span>
      </div>
      <div>
        <p className="text-2xl font-bold tracking-tight" style={{ color }}>
          {value}
        </p>
        <p className="text-xs font-medium mt-0.5" style={{ color: "var(--text-secondary)" }}>
          {label}
        </p>
        {sub && (
          <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>
            {sub}
          </p>
        )}
      </div>
    </div>
  );
}
