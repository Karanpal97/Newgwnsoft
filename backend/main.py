"""
FastAPI Application
====================
Exposes two approaches for triggering the out-of-core join:

  POST /api/trigger-join
      Body: { "approach": "background_task" | "celery" }
      Returns: { "job_id": "...", "message": "..." }

  GET  /api/job/{job_id}         → job status + logs
  GET  /api/jobs                 → list all jobs
  GET  /api/results/{job_id}     → first 100 rows of result.csv
  GET  /api/health               → health check
"""

import asyncio
import logging
import os
from contextlib import asynccontextmanager
from pathlib import Path
from typing import Optional

import csv
from fastapi import FastAPI, BackgroundTasks, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from sqlalchemy.orm import Session

from database import (
    SessionLocal, create_job, update_job, append_log,
    get_job, list_jobs, init_db, Job
)
from join_engine import run_join

# ---------------------------------------------------------------------------
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s | %(levelname)s | %(name)s | %(message)s",
)
logger = logging.getLogger(__name__)
DATA_DIR = Path(os.getenv("DATA_DIR", "./data"))
# ---------------------------------------------------------------------------


@asynccontextmanager
async def lifespan(app: FastAPI):
    init_db()
    logger.info("Database initialised.")
    yield


app = FastAPI(
    title="Scalable Data Processing API",
    description="Out-of-core join with two non-blocking approaches",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],   # tighten in prod
    allow_methods=["*"],
    allow_headers=["*"],
)


# ---- Pydantic schemas -------------------------------------------------------

class TriggerRequest(BaseModel):
    approach: str = "background_task"   # "background_task" | "celery"


class JobResponse(BaseModel):
    id: str
    approach: str
    status: str
    rows_joined: Optional[int]
    duration_sec: Optional[int]
    log_messages: str
    error_message: Optional[str]
    created_at: str
    updated_at: str

    class Config:
        from_attributes = True


# ---- DB dependency ----------------------------------------------------------

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


# ============================================================================
# APPROACH 1 — FastAPI BackgroundTasks
# ============================================================================

def _background_join(job_id: str):
    """
    Runs in the same process as FastAPI via BackgroundTasks.
    Simple, zero-dependency, but tied to the server process.

    PROS:
      - No extra infrastructure (no broker, no worker)
      - Trivial to set up and deploy
      - Works perfectly fine for low concurrency

    CONS:
      - Shares CPU/memory with web server
      - If the server restarts, the job is lost (no persistence)
      - Cannot distribute work across multiple machines
      - No retry on failure
    """
    db = SessionLocal()
    try:
        logger.info(f"[BackgroundTask] Job {job_id} started.")
        append_log(db, job_id, "FastAPI BackgroundTask started. Running join...")
        update_job(db, job_id, status="running")

        def _progress(phase: str):
            append_log(db, job_id, f"Phase: {phase}")

        stats = run_join(
            users_path=DATA_DIR / "users.csv",
            transactions_path=DATA_DIR / "transactions.csv",
            progress_cb=_progress,
        )

        update_job(
            db, job_id,
            status="success",
            rows_joined=stats["rows_joined"],
            duration_sec=int(stats["duration_seconds"]),
        )
        append_log(
            db, job_id,
            f"✅ Join complete! {stats['rows_joined']:,} rows in {stats['duration_seconds']}s. "
            f"Result written to {stats['result_path']}"
        )
        logger.info(f"[BackgroundTask] Job {job_id} succeeded.")

    except Exception as exc:
        logger.exception(f"[BackgroundTask] Job {job_id} failed: {exc}")
        append_log(db, job_id, f"❌ Error: {exc}")
        update_job(db, job_id, status="failed", error_message=str(exc))
    finally:
        db.close()


# ============================================================================
# APPROACH 2 — Celery + RabbitMQ (CloudAMQP)
# ============================================================================

def _celery_dispatch(job_id: str):
    """
    Dispatches the join task to a Celery worker via RabbitMQ.

    PROS:
      - Fully decoupled from the web server — server stays responsive
      - Tasks survive server restarts (queue persists in RabbitMQ)
      - Built-in retry logic (max_retries=2 configured in tasks.py)
      - Horizontally scalable: spawn more workers without touching API code
      - Task status visible via Flower monitoring dashboard

    CONS:
      - Requires external broker (RabbitMQ / CloudAMQP)
      - Separate worker process must be deployed (Render Background Worker)
      - Slight cold-start delay when free-tier worker spins up
      - More complex local development setup
    """
    from tasks import run_join_task  # import only when needed
    run_join_task.delay(job_id)
    logger.info(f"[Celery] Job {job_id} dispatched to RabbitMQ queue.")


# ============================================================================
# ROUTES
# ============================================================================

@app.get("/api/health")
def health():
    return {"status": "ok", "service": "scalable-data-api"}


@app.post("/api/trigger-join", status_code=202)
def trigger_join(
    req: TriggerRequest,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
):
    if req.approach not in ("background_task", "celery"):
        raise HTTPException(400, "approach must be 'background_task' or 'celery'")

    job = create_job(db, approach=req.approach)
    append_log(db, job.id, f"Job created. Approach: {req.approach}")

    if req.approach == "background_task":
        background_tasks.add_task(_background_join, job.id)
        message = "Job queued via FastAPI BackgroundTasks."
    else:
        try:
            _celery_dispatch(job.id)
            message = "Job dispatched to Celery worker via RabbitMQ."
        except Exception as exc:
            update_job(db, job.id, status="failed", error_message=str(exc))
            raise HTTPException(503, f"Celery broker unavailable: {exc}")

    return {
        "job_id": job.id,
        "approach": req.approach,
        "message": message,
    }


@app.get("/api/jobs")
def get_all_jobs(db: Session = Depends(get_db)):
    jobs = list_jobs(db)
    return [_serialize_job(j) for j in jobs]


@app.get("/api/job/{job_id}")
def get_job_status(job_id: str, db: Session = Depends(get_db)):
    job = get_job(db, job_id)
    if not job:
        raise HTTPException(404, "Job not found")
    return _serialize_job(job)


@app.get("/api/results/{job_id}")
def get_results(job_id: str, db: Session = Depends(get_db)):
    """Return first 100 rows of result.csv for previewing."""
    job = get_job(db, job_id)
    if not job:
        raise HTTPException(404, "Job not found")
    if job.status != "success":
        raise HTTPException(400, f"Job is not complete (status: {job.status})")

    result_path = DATA_DIR / "result.csv"
    if not result_path.exists():
        raise HTTPException(404, "result.csv not found on disk")

    rows = []
    with open(result_path, "r", newline="") as f:
        reader = csv.DictReader(f)
        for i, row in enumerate(reader):
            if i >= 100:
                break
            rows.append(dict(row))

    return {"job_id": job_id, "preview_rows": rows, "count": len(rows)}


@app.get("/api/approaches")
def get_approaches():
    """Return pros/cons explanation of both approaches."""
    return {
        "approaches": [
            {
                "id": "background_task",
                "name": "FastAPI BackgroundTasks",
                "description": "Uses FastAPI's built-in BackgroundTasks to run the join in the same server process.",
                "pros": [
                    "Zero extra infrastructure needed",
                    "Simple to implement and deploy",
                    "Works well for low concurrency",
                    "No broker setup required",
                ],
                "cons": [
                    "Shares CPU and memory with web server",
                    "Job lost if server restarts",
                    "Cannot scale across multiple machines",
                    "No built-in retry on failure",
                    "Blocks GIL during CPU-bound work",
                ],
                "best_for": "Development, low-traffic, simple deployments",
            },
            {
                "id": "celery",
                "name": "Celery + RabbitMQ (CloudAMQP)",
                "description": "Dispatches the join to a dedicated Celery worker via RabbitMQ message queue on CloudAMQP.",
                "pros": [
                    "Fully decoupled from the web server",
                    "Tasks survive server restarts (queue is persistent)",
                    "Built-in retry logic (configurable)",
                    "Horizontally scalable — add more workers easily",
                    "Monitorable via Flower dashboard",
                ],
                "cons": [
                    "Requires external broker (CloudAMQP / RabbitMQ)",
                    "Separate worker process must be deployed",
                    "Free-tier Render worker has cold start delay",
                    "More complex local development setup",
                    "CloudAMQP free tier has message limits",
                ],
                "best_for": "Production, high concurrency, fault-tolerant systems",
            },
        ]
    }


# ---- Helpers ----------------------------------------------------------------

def _serialize_job(j: Job) -> dict:
    return {
        "id": j.id,
        "approach": j.approach,
        "status": j.status,
        "rows_joined": j.rows_joined,
        "duration_sec": j.duration_sec,
        "log_messages": j.log_messages or "",
        "error_message": j.error_message,
        "created_at": j.created_at.isoformat() if j.created_at else None,
        "updated_at": j.updated_at.isoformat() if j.updated_at else None,
    }
