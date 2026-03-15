#!/usr/bin/env -S uv run --script
# /// script
# requires-python = ">=3.11"
# dependencies = []
# ///
"""
TypeScript Type-Check Validator for Claude Code Stop Hook

Runs `pnpm check-types` (project-wide tsc --noEmit) when the agent tries to stop.
Blocks if type errors exist, forcing the agent to fix them before finishing.

Uses a file-based counter to prevent infinite loops: after 3 consecutive failures
within 5 minutes, allows the agent to stop regardless.
"""
import json
import logging
import subprocess
import sys
import time
from pathlib import Path

SCRIPT_DIR = Path(__file__).parent
LOG_FILE = SCRIPT_DIR / "typecheck_validator.log"
COUNTER_FILE = SCRIPT_DIR / ".typecheck_stop_counter"
MAX_RETRIES = 3
COUNTER_EXPIRY_SECS = 300  # 5 minutes

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s | %(levelname)s | %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
    handlers=[logging.FileHandler(LOG_FILE, mode="a")],
)
logger = logging.getLogger(__name__)


def read_counter() -> tuple[int, float]:
    """Read (count, timestamp) from counter file. Returns (0, 0) if missing/stale."""
    try:
        data = json.loads(COUNTER_FILE.read_text())
        ts = data.get("timestamp", 0)
        if time.time() - ts > COUNTER_EXPIRY_SECS:
            return 0, 0
        return data.get("count", 0), ts
    except (FileNotFoundError, json.JSONDecodeError, KeyError):
        return 0, 0


def write_counter(count: int):
    """Write current count and timestamp to counter file."""
    COUNTER_FILE.write_text(json.dumps({"count": count, "timestamp": time.time()}))


def reset_counter():
    """Remove the counter file (type check passed)."""
    COUNTER_FILE.unlink(missing_ok=True)


def main():
    logger.info("TYPECHECK STOP VALIDATOR TRIGGERED")

    try:
        stdin_data = sys.stdin.read()
        hook_input = json.loads(stdin_data) if stdin_data.strip() else {}
    except json.JSONDecodeError:
        hook_input = {}

    logger.info(f"hook_input keys: {list(hook_input.keys())}")

    # Infinite loop guard: allow stop after MAX_RETRIES consecutive failures
    count, _ = read_counter()
    if count >= MAX_RETRIES:
        logger.info(f"RESULT: ALLOW (exceeded {MAX_RETRIES} retries, breaking loop)")
        reset_counter()
        print(json.dumps({}))
        return

    logger.info("Running: pnpm check-types")
    try:
        result = subprocess.run(
            ["pnpm", "check-types"],
            capture_output=True,
            text=True,
            timeout=120,
        )

        if result.returncode == 0:
            logger.info("RESULT: PASS")
            reset_counter()
            print(json.dumps({}))
        else:
            output = (result.stdout or result.stderr or "Type check failed").strip()
            logger.info(f"RESULT: BLOCK (exit {result.returncode})")
            write_counter(count + 1)
            print(
                json.dumps(
                    {
                        "decision": "block",
                        "reason": f"Type errors found:\n{output[:800]}",
                    }
                )
            )

    except subprocess.TimeoutExpired:
        logger.info("RESULT: BLOCK (timeout)")
        write_counter(count + 1)
        print(
            json.dumps(
                {
                    "decision": "block",
                    "reason": "Type check timed out after 120 seconds",
                }
            )
        )
    except FileNotFoundError:
        logger.info("RESULT: PASS (pnpm not found, skipping)")
        reset_counter()
        print(json.dumps({}))


if __name__ == "__main__":
    main()
