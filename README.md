# 🚀 DataFlow — Scalable Join Engine

**Assignment 1 + 2** — Out-of-Core Data Join API with Non-Blocking approaches.

---

## Architecture

```
┌─────────────────┐    POST /api/trigger-join     ┌─────────────────────────────┐
│   Next.js UI    │ ──────────────────────────────▶│   FastAPI (Render Web Svc)  │
│   (Vercel)      │ ◀────────────────────────────── │   main.py                   │
│                 │    { job_id, message }          └──────────────┬──────────────┘
│  - Approach     │                                               │
│    selector     │    GET /api/job/:id (poll)                    │ Approach 1: BackgroundTasks
│  - Live logs    │ ──────────────────────────────▶               │ (same process)
│  - Result table │                                               │
└─────────────────┘                                               │ Approach 2: Celery task
                                                                  ▼
                                               ┌──────────────────────────────┐
                                               │   RabbitMQ (CloudAMQP)       │
                                               │   Free tier (Lemur plan)     │
                                               └──────────────┬───────────────┘
                                                              │
                                                              ▼
                                               ┌──────────────────────────────┐
                                               │  Celery Worker (Render BG)   │
                                               │  tasks.py → join_engine.py   │
                                               └──────────────────────────────┘
```

---

## How the Join Works (Assignment 1)

**Algorithm: Hash Partition Join** — stays well under 256 MB RAM.

```
Phase 1a: Stream users.csv  → bucket each row into part_0.csv … part_63.csv (disk)
Phase 1b: Stream txns.csv   → same bucketing by user_id

Phase 2:  For i in 0..63:
            load users_part_i into RAM dict (small!)
            stream txn_part_i, probe dict → write matches to result.csv
```

**Peak RAM ≈ largest_partition × 2 ≈ ~30 MB** (with 64 partitions over 5M rows).

---

## Local Development

### 1. Backend

```bash
cd backend

# Create venv and install deps
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt

# Create .env from template
cp .env.example .env
# Edit .env: set DATABASE_URL, RABBITMQ_URL

# Generate test data (creates ./data/users.csv, transactions.csv)
python generate_data.py

# Start FastAPI server
uvicorn main:app --reload --port 8000
```

API docs: http://localhost:8000/docs

### 2. Celery Worker (Approach 2 only)

In a **separate terminal**:
```bash
cd backend && source .venv/bin/activate
celery -A tasks worker --loglevel=info --concurrency=1
```

### 3. Frontend

```bash
cd frontend
cp .env.local .env.local       # already has localhost:8000
npm install
npm run dev
```

Open: http://localhost:3000

---

## Deployment (Free Tier)

### Services Needed

| Service | What | URL |
|---|---|---|
| **Render** | FastAPI + Celery Worker | render.com |
| **Vercel** | Next.js Frontend | vercel.com |
| **CloudAMQP** | RabbitMQ Broker | cloudamqp.com |
| **Neon** | PostgreSQL (job metadata) | neon.tech |

---

### Step 1 — Neon PostgreSQL

1. Go to [neon.tech](https://neon.tech) → Create project
2. Copy the connection string: `postgresql://user:pass@host/db?sslmode=require`

---

### Step 2 — CloudAMQP (RabbitMQ)

1. Go to [cloudamqp.com](https://cloudamqp.com) → Create Instance → **Lemur (Free)**
2. Copy the AMQP URL: `amqps://user:pass@host/vhost`

---

### Step 3 — Render (Backend + Worker)

1. Push this repo to GitHub
2. Go to [render.com](https://render.com) → New → **Blueprint**
3. Connect repo — Render will read `render.yaml` and create both services automatically
4. Add these **Environment Variables** in Render dashboard for both services:
   - `DATABASE_URL` → Neon connection string
   - `RABBITMQ_URL` → CloudAMQP AMQP URL
   - `DATA_DIR` → `/opt/render/project/src/data`
5. Deploy — note the Web Service URL (e.g. `https://dataflow-api.onrender.com`)

> **Note:** The free Render tier spins down after 15 min inactivity. First request takes ~30s to wake up.

> **Important:** CSV files on Render free tier use ephemeral storage. You'll need to run `generate_data.py` as part of the build command or use a Render Disk (paid). For assignment demo, the join logic works even on small sample files.

---

### Step 4 — Vercel (Frontend)

```bash
cd frontend

# Install Vercel CLI
npm i -g vercel

# Deploy
vercel --prod
```

When prompted, set environment variable:
```
NEXT_PUBLIC_API_URL = https://dataflow-api.onrender.com
```

Or set it in the Vercel dashboard under **Settings → Environment Variables**.

---

## API Reference

| Endpoint | Method | Description |
|---|---|---|
| `/api/health` | GET | Health check |
| `/api/trigger-join` | POST | Start a join job |
| `/api/jobs` | GET | List all jobs |
| `/api/job/{id}` | GET | Get job status + logs |
| `/api/results/{id}` | GET | Preview first 100 rows of result.csv |
| `/api/approaches` | GET | Pros/cons of both approaches |

### Trigger Join — Request Body
```json
{
  "approach": "background_task"   // or "celery"
}
```

### Response
```json
{
  "job_id": "uuid-here",
  "approach": "background_task",
  "message": "Job queued via FastAPI BackgroundTasks."
}
```

---

## Approach Comparison

| | FastAPI BackgroundTasks | Celery + RabbitMQ |
|---|---|---|
| **Infrastructure** | None | RabbitMQ + separate worker |
| **Decoupling** | Same process as web server | Fully decoupled |
| **Survives restart** | ❌ No | ✅ Yes (queue persists) |
| **Retry on failure** | ❌ No | ✅ Yes (max_retries=2) |
| **Horizontal scale** | ❌ No | ✅ Spawn more workers |
| **Complexity** | ⭐ Low | ⭐⭐⭐ Medium |
| **Best for** | Dev / low traffic | Production / high concurrency |

---

## File Structure

```
clgAssign/
├── backend/
│   ├── main.py           # FastAPI app (both approaches)
│   ├── join_engine.py    # Out-of-core hash partition join
│   ├── tasks.py          # Celery task definition
│   ├── database.py       # SQLAlchemy models + helpers (Neon)
│   ├── generate_data.py  # Synthetic data generator
│   ├── requirements.txt
│   └── .env.example
├── frontend/
│   ├── app/
│   │   ├── page.tsx          # Main dashboard
│   │   └── jobs/[id]/page.tsx # Job detail + results preview
│   ├── components/
│   │   ├── JobCard.tsx
│   │   ├── LogTerminal.tsx
│   │   ├── StatusBadge.tsx
│   │   ├── ApproachComparison.tsx
│   │   └── StatCard.tsx
│   ├── lib/
│   │   ├── api.ts
│   │   └── types.ts
│   └── .env.local
└── render.yaml           # Render Blueprint (web + worker)
```
