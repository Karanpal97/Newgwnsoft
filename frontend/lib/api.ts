import { Job, TriggerResponse, ResultsResponse, ApproachInfo, Approach } from "./types";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: { "Content-Type": "application/json", ...(options?.headers ?? {}) },
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(err.detail ?? "API error");
  }
  return res.json();
}

export const api = {
  triggerJoin: (approach: Approach) =>
    apiFetch<TriggerResponse>("/api/trigger-join", {
      method: "POST",
      body: JSON.stringify({ approach }),
    }),

  getJob: (jobId: string) => apiFetch<Job>(`/api/job/${jobId}`),

  listJobs: () => apiFetch<Job[]>("/api/jobs"),

  getResults: (jobId: string) => apiFetch<ResultsResponse>(`/api/results/${jobId}`),

  getApproaches: () =>
    apiFetch<{ approaches: ApproachInfo[] }>("/api/approaches").then(
      (r) => r.approaches
    ),

  health: () => apiFetch<{ status: string }>("/api/health"),
};
