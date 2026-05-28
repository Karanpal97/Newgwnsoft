"""
Celery worker — Approach 2 (RabbitMQ via CloudAMQP)
"""

import logging
import os
from celery import Celery
from sqlalchemy.orm import Session

from database import SessionLocal, append_log, update_job
from join_engine import run_join
from pathlib import Path

RABBITMQ_URL = os.getenv(
    "RABBITMQ_URL",
    "amqp://guest:guest@localhost:5672//"
)

# Celery app pointing at RabbitMQ broker (CloudAMQP in production)
celery_app = Celery(
    "worker",
    broker=RABBITMQ_URL,
    backend="db+sqlite:///./celery_results.db",  # lightweight result backend
)

celery_app.conf.update(
    task_serializer="json",
    result_serializer="json",
    accept_content=["json"],
    timezone="UTC",
    enable_utc=True,
    broker_connection_retry_on_startup=True,
)

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

DATA_DIR = Path(os.getenv("DATA_DIR", "./data"))


@celery_app.task(name="tasks.run_join_task", bind=True, max_retries=2)
def run_join_task(self, job_id: str):
    """
    Celery task: execute the out-of-core join and update job status in DB.
    This runs in a dedicated Render Background Worker process.
    """
    db: Session = SessionLocal()
    try:
        logger.info(f"[Celery] Job {job_id} started.")
        append_log(db, job_id, "Celery worker picked up job. Starting join...")
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
        append_log(db, job_id, f"✅ Join complete! {stats['rows_joined']:,} rows in {stats['duration_seconds']}s")
        logger.info(f"[Celery] Job {job_id} succeeded.")

    except Exception as exc:
        logger.exception(f"[Celery] Job {job_id} failed: {exc}")
        append_log(db, job_id, f"❌ Error: {exc}")
        update_job(db, job_id, status="failed", error_message=str(exc))
        raise self.retry(exc=exc, countdown=5)
    finally:
        db.close()
