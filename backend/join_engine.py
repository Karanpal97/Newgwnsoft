"""
Out-of-Core Hash Partition Join Engine
---------------------------------------
Memory-safe join that stays well under 256MB RAM.

Algorithm: Hash Partition Join
1. Stream both CSV files and hash each row's user_id into N partition buckets.
2. Write partitions to temp files on disk (not in RAM).
3. Load one pair of partitions at a time (small enough to fit in RAM), join them in-memory.
4. Append joined rows to final result.csv.

Peak RAM usage: ~( max_partition_size * 2 ), kept well under 256MB by tuning N_PARTITIONS.
"""

import os
import csv
import logging
import hashlib
import tempfile
import time
from pathlib import Path
from typing import Callable, Optional

logger = logging.getLogger(__name__)

# --- Tuning knobs -----------------------------------------------------------
N_PARTITIONS = 64          # More partitions → smaller per-partition RAM, more temp files
CHUNK_ROWS    = 50_000     # Rows read at once from CSV (streaming)
DATA_DIR      = Path(os.getenv("DATA_DIR", "./data"))
RESULT_PATH   = DATA_DIR / "result.csv"
# ----------------------------------------------------------------------------


def _partition_key(user_id: str, n: int) -> int:
    """Deterministic bucket for a user_id string."""
    return int(hashlib.md5(user_id.encode()).hexdigest(), 16) % n


def _stream_partition(
    filepath: Path,
    partition_dir: Path,
    n: int,
    prefix: str,
    progress_cb: Optional[Callable[[int], None]] = None,
) -> list[str]:
    """
    Stream a CSV file and write each row to the appropriate partition file.
    Returns list of partition file paths.
    """
    partition_files = [
        open(partition_dir / f"{prefix}_part_{i}.csv", "w", newline="")
        for i in range(n)
    ]
    writers = [csv.writer(f) for f in partition_files]
    header_written = [False] * n
    header = None
    total_rows = 0

    with open(filepath, "r", newline="") as src:
        reader = csv.reader(src)
        header = next(reader)  # skip/capture header

        # Write header to every partition file for this dataset
        for w in writers:
            w.writerow(header)

        for row in reader:
            uid_idx = header.index("user_id")
            bucket = _partition_key(row[uid_idx], n)
            writers[bucket].writerow(row)
            total_rows += 1
            if progress_cb and total_rows % 500_000 == 0:
                progress_cb(total_rows)

    for f in partition_files:
        f.close()

    logger.info(f"[{prefix}] Partitioned {total_rows} rows into {n} buckets.")
    return [str(partition_dir / f"{prefix}_part_{i}.csv") for i in range(n)]


def _join_partition(
    users_part: str,
    txn_part: str,
    out_writer: csv.writer,
    write_header: bool,
) -> int:
    """
    Load one pair of small partition files, hash-join on user_id in RAM.
    Returns number of joined rows written.
    """
    # Load users partition into a dict keyed by user_id
    users_map: dict[str, list] = {}
    users_header: list[str] = []

    with open(users_part, "r", newline="") as f:
        reader = csv.reader(f)
        users_header = next(reader)
        uid_idx = users_header.index("user_id")
        for row in reader:
            users_map[row[uid_idx]] = row

    # Stream transactions partition, probe the hash map
    txn_header: list[str] = []
    joined = 0

    with open(txn_part, "r", newline="") as f:
        reader = csv.reader(f)
        txn_header = next(reader)
        uid_idx = txn_header.index("user_id")

        if write_header:
            # Merge headers (avoid duplicate user_id)
            extra_cols = [c for c in txn_header if c != "user_id"]
            combined_header = users_header + extra_cols
            out_writer.writerow(combined_header)

        extra_indices = [i for i, c in enumerate(txn_header) if c != "user_id"]

        for row in reader:
            uid = row[uid_idx]
            if uid in users_map:
                extra_values = [row[i] for i in extra_indices]
                out_writer.writerow(users_map[uid] + extra_values)
                joined += 1

    return joined


def run_join(
    users_path: Path = DATA_DIR / "users.csv",
    transactions_path: Path = DATA_DIR / "transactions.csv",
    result_path: Path = RESULT_PATH,
    n_partitions: int = N_PARTITIONS,
    progress_cb: Optional[Callable[[str], None]] = None,
) -> dict:
    """
    Execute the full out-of-core hash partition join.

    Returns a dict with stats: { rows_joined, duration_seconds, result_path }
    """
    start = time.time()
    logger.info("=== Out-of-Core Join Started ===")
    logger.info(f"Users file     : {users_path}")
    logger.info(f"Transactions   : {transactions_path}")
    logger.info(f"N partitions   : {n_partitions}")

    result_path.parent.mkdir(parents=True, exist_ok=True)

    with tempfile.TemporaryDirectory(prefix="join_") as tmpdir:
        tmp = Path(tmpdir)

        # --- Phase 1: Partition both files -----------------------------------
        if progress_cb:
            progress_cb("phase1_users")
        logger.info("Phase 1a: Partitioning users.csv ...")
        users_parts = _stream_partition(
            users_path, tmp, n_partitions, "users",
            progress_cb=lambda n: logger.info(f"  Users: {n:,} rows streamed"),
        )

        if progress_cb:
            progress_cb("phase1_transactions")
        logger.info("Phase 1b: Partitioning transactions.csv ...")
        txn_parts = _stream_partition(
            transactions_path, tmp, n_partitions, "txn",
            progress_cb=lambda n: logger.info(f"  Transactions: {n:,} rows streamed"),
        )

        # --- Phase 2: Join partition pairs -----------------------------------
        logger.info("Phase 2: Joining partition pairs ...")
        total_joined = 0
        with open(result_path, "w", newline="") as out_f:
            writer = csv.writer(out_f)
            for i in range(n_partitions):
                rows = _join_partition(
                    users_parts[i],
                    txn_parts[i],
                    writer,
                    write_header=(i == 0),
                )
                total_joined += rows
                if progress_cb:
                    progress_cb(f"join_partition_{i+1}_of_{n_partitions}")
                logger.info(f"  Partition {i+1}/{n_partitions} → {rows:,} matches")

    duration = round(time.time() - start, 2)
    logger.info(f"=== Join Complete: {total_joined:,} rows in {duration}s ===")
    logger.info(f"Result written to: {result_path}")

    return {
        "rows_joined": total_joined,
        "duration_seconds": duration,
        "result_path": str(result_path),
    }
