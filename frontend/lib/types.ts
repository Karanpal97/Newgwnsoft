// Shared types across the frontend

export type JobStatus = "pending" | "running" | "success" | "failed";
export type Approach = "background_task" | "celery";

export interface Job {
  id: string;
  approach: Approach;
  status: JobStatus;
  rows_joined: number | null;
  duration_sec: number | null;
  log_messages: string;
  error_message: string | null;
  created_at: string;
  updated_at: string;
}

export interface TriggerResponse {
  job_id: string;
  approach: Approach;
  message: string;
}

export interface ResultsResponse {
  job_id: string;
  preview_rows: Record<string, string>[];
  count: number;
}

export interface ApproachInfo {
  id: Approach;
  name: string;
  description: string;
  pros: string[];
  cons: string[];
  best_for: string;
}
