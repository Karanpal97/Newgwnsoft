"""
Database (Neon PostgreSQL) — job metadata store.
"""

import os
import uuid
from datetime import datetime, timezone
from typing import Optional

from sqlalchemy import (
    Column, String, DateTime, Integer, Text, create_engine, text
)
from sqlalchemy.orm import declarative_base, sessionmaker, Session

DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./jobs.db")

# SQLite needs this flag for use with FastAPI's threading model
_connect_args = {"check_same_thread": False} if DATABASE_URL.startswith("sqlite") else {}

engine = create_engine(DATABASE_URL, pool_pre_ping=True, connect_args=_connect_args)
SessionLocal = sessionmaker(bind=engine, autocommit=False, autoflush=False)
Base = declarative_base()


class Job(Base):
    __tablename__ = "jobs"

    id            = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    approach      = Column(String, nullable=False)       # "background_task" | "celery"
    status        = Column(String, default="pending")    # pending | running | success | failed
    rows_joined   = Column(Integer, nullable=True)
    duration_sec  = Column(Integer, nullable=True)
    log_messages  = Column(Text, default="")             # newline-separated log lines
    created_at    = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at    = Column(DateTime, default=lambda: datetime.now(timezone.utc),
                           onupdate=lambda: datetime.now(timezone.utc))
    error_message = Column(Text, nullable=True)


def init_db():
    Base.metadata.create_all(bind=engine)


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


# ---- Helper functions -------------------------------------------------------

def create_job(db: Session, approach: str) -> Job:
    job = Job(approach=approach)
    db.add(job)
    db.commit()
    db.refresh(job)
    return job


def update_job(db: Session, job_id: str, **kwargs):
    kwargs["updated_at"] = datetime.now(timezone.utc)
    db.query(Job).filter(Job.id == job_id).update(kwargs)
    db.commit()


def append_log(db: Session, job_id: str, message: str):
    job = db.query(Job).filter(Job.id == job_id).first()
    if job:
        existing = job.log_messages or ""
        job.log_messages = existing + f"[{datetime.now(timezone.utc).strftime('%H:%M:%S')}] {message}\n"
        job.updated_at = datetime.now(timezone.utc)
        db.commit()


def get_job(db: Session, job_id: str) -> Optional[Job]:
    return db.query(Job).filter(Job.id == job_id).first()


def list_jobs(db: Session) -> list[Job]:
    return db.query(Job).order_by(Job.created_at.desc()).all()
