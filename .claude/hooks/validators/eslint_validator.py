#!/usr/bin/env -S uv run --script
# /// script
# requires-python = ">=3.11"
# dependencies = []
# ///
"""
ESLint Validator for Claude Code PostToolUse Hook

Runs `pnpm exec eslint` on individual TypeScript files after Write/Edit.

Outputs JSON decision:
- {"decision": "block", "reason": "..."} on lint errors
- {} on success or non-TS files
"""
import json
import logging
import subprocess
import sys
from pathlib import Path

SCRIPT_DIR = Path(__file__).parent
LOG_FILE = SCRIPT_DIR / "eslint_validator.log"

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s | %(levelname)s | %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
    handlers=[logging.FileHandler(LOG_FILE, mode="a")],
)
logger = logging.getLogger(__name__)


def main():
    logger.info("ESLINT VALIDATOR TRIGGERED")

    try:
        stdin_data = sys.stdin.read()
        hook_input = json.loads(stdin_data) if stdin_data.strip() else {}
    except json.JSONDecodeError:
        hook_input = {}

    file_path = hook_input.get("tool_input", {}).get("file_path", "")
    logger.info(f"file_path: {file_path}")

    if not file_path.endswith(".ts"):
        logger.info("Skipping non-TS file")
        print(json.dumps({}))
        return

    logger.info(f"Running: pnpm exec eslint {file_path}")
    try:
        result = subprocess.run(
            ["pnpm", "exec", "eslint", file_path],
            capture_output=True,
            text=True,
            timeout=30,
        )

        if result.returncode == 0:
            logger.info("RESULT: PASS")
            print(json.dumps({}))
        else:
            output = (result.stdout or result.stderr or "Lint check failed").strip()
            logger.info(f"RESULT: BLOCK (exit {result.returncode})")
            print(
                json.dumps(
                    {
                        "decision": "block",
                        "reason": f"ESLint errors:\n{output[:500]}",
                    }
                )
            )

    except subprocess.TimeoutExpired:
        logger.info("RESULT: BLOCK (timeout)")
        print(
            json.dumps(
                {"decision": "block", "reason": "ESLint timed out after 30 seconds"}
            )
        )
    except FileNotFoundError:
        logger.info("RESULT: PASS (pnpm/eslint not found, skipping)")
        print(json.dumps({}))


if __name__ == "__main__":
    main()
