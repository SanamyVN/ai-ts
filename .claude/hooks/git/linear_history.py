#!/usr/bin/env -S uv run --script
# /// script
# requires-python = ">=3.11"
# dependencies = []
# ///
"""
Linear History Enforcer for Claude Code PreToolUse Hook

Blocks merge commits and non-rebase pulls to keep git history linear.

Outputs JSON decision:
- {"decision": "block", "reason": "..."} on merge or pull without --rebase
- {} on allowed commands
"""
import json
import logging
import re
import sys
from pathlib import Path

SCRIPT_DIR = Path(__file__).parent
LOG_FILE = SCRIPT_DIR / "linear_history.log"

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s | %(levelname)s | %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
    handlers=[logging.FileHandler(LOG_FILE, mode="a")],
)
logger = logging.getLogger(__name__)


def strip_quoted_strings(command: str) -> str:
    """Remove single-quoted, double-quoted, and HEREDOC content from a command.

    This prevents false positives when git keywords appear inside commit
    messages or other quoted arguments.
    """
    # Strip HEREDOC blocks: <<'EOF' ... EOF  or  <<EOF ... EOF
    result = re.sub(
        r"<<-?\s*'?(\w+)'?.*?\n.*?\1", "", command, flags=re.DOTALL
    )
    # Strip double-quoted strings
    result = re.sub(r'"(?:[^"\\]|\\.)*"', "", result)
    # Strip single-quoted strings
    result = re.sub(r"'(?:[^'\\]|\\.)*'", "", result)
    # Strip $() subshells
    result = re.sub(r"\$\(.*?\)", "", result, flags=re.DOTALL)
    return result


def is_merge_command(command: str) -> bool:
    """Detect `git merge` commands, allowing --ff-only (no merge commit)."""
    stripped = strip_quoted_strings(command)
    if not re.search(r"\bgit\s+merge\b", stripped):
        return False
    return "--ff-only" not in stripped


def is_pull_without_rebase(command: str) -> bool:
    """Detect `git pull` without --rebase flag, ignoring text inside quoted strings."""
    stripped = strip_quoted_strings(command)
    if not re.search(r"\bgit\s+pull\b", stripped):
        return False
    return "--rebase" not in stripped


def main():
    logger.info("LINEAR HISTORY ENFORCER TRIGGERED")

    try:
        stdin_data = sys.stdin.read()
        hook_input = json.loads(stdin_data) if stdin_data.strip() else {}
    except json.JSONDecodeError:
        hook_input = {}

    command = hook_input.get("tool_input", {}).get("command", "")
    logger.info(f"command: {command}")

    if is_merge_command(command):
        logger.info("RESULT: BLOCK (git merge)")
        print(
            json.dumps(
                {
                    "decision": "block",
                    "reason": "git merge is not allowed — use git rebase to keep history linear.",
                }
            )
        )
        return

    if is_pull_without_rebase(command):
        logger.info("RESULT: BLOCK (git pull without --rebase)")
        print(
            json.dumps(
                {
                    "decision": "block",
                    "reason": "git pull without --rebase is not allowed. Use `git pull --rebase` to keep history linear.",
                }
            )
        )
        return

    logger.info("RESULT: PASS")
    print(json.dumps({}))


if __name__ == "__main__":
    main()
