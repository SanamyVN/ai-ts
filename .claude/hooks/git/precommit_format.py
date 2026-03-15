#!/usr/bin/env -S uv run --script
# /// script
# requires-python = ">=3.11"
# dependencies = []
# ///
"""
Pre-commit Formatter for Claude Code PreToolUse Hook

Runs `pnpm format` and stages formatting changes before git commit.

Outputs JSON decision:
- {"decision": "block", "reason": "..."} if formatting fails
- {} on success or non-commit commands
"""
import json
import logging
import subprocess
import sys
from pathlib import Path

SCRIPT_DIR = Path(__file__).parent
LOG_FILE = SCRIPT_DIR / "precommit_format.log"

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s | %(levelname)s | %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
    handlers=[logging.FileHandler(LOG_FILE, mode="a")],
)
logger = logging.getLogger(__name__)


def main():
    logger.info("PRECOMMIT FORMAT TRIGGERED")

    try:
        stdin_data = sys.stdin.read()
        hook_input = json.loads(stdin_data) if stdin_data.strip() else {}
    except json.JSONDecodeError:
        hook_input = {}

    command = hook_input.get("tool_input", {}).get("command", "")
    logger.info(f"command: {command}")

    if "git commit" not in command:
        logger.info("Skipping non-commit command")
        print(json.dumps({}))
        return

    logger.info("Running: pnpm format")
    try:
        result = subprocess.run(
            ["pnpm", "format"],
            capture_output=True,
            text=True,
            timeout=60,
        )

        if result.returncode != 0:
            output = (result.stdout or result.stderr or "Format failed").strip()
            logger.info(f"RESULT: BLOCK (format exit {result.returncode})")
            print(
                json.dumps(
                    {
                        "decision": "block",
                        "reason": f"pnpm format failed:\n{output[:500]}",
                    }
                )
            )
            return

        logger.info("Format succeeded, staging changes")
        stage_result = subprocess.run(
            ["git", "add", "-u"],
            capture_output=True,
            text=True,
            timeout=10,
        )

        if stage_result.returncode != 0:
            logger.info(f"RESULT: BLOCK (git add -u exit {stage_result.returncode})")
            print(
                json.dumps(
                    {
                        "decision": "block",
                        "reason": f"Failed to stage formatted files:\n{stage_result.stderr[:500]}",
                    }
                )
            )
            return

        logger.info("RESULT: PASS")
        print(json.dumps({}))

    except subprocess.TimeoutExpired:
        logger.info("RESULT: BLOCK (timeout)")
        print(
            json.dumps(
                {"decision": "block", "reason": "pnpm format timed out after 60 seconds"}
            )
        )
    except FileNotFoundError:
        logger.info("RESULT: PASS (pnpm not found, skipping)")
        print(json.dumps({}))


if __name__ == "__main__":
    main()
