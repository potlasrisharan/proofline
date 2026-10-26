from __future__ import annotations

from pathlib import Path
import shutil
import subprocess
import sys


ROOT = Path(__file__).resolve().parents[1]
EVALUATOR = ROOT / "scripts/eval.py"
TRACKED_REPORT = ROOT / "docs/EVAL_REPORT.md"


def run_evaluator(*args: str) -> subprocess.CompletedProcess[str]:
    return subprocess.run(
        [sys.executable, str(EVALUATOR), *args],
        cwd=ROOT,
        check=False,
        capture_output=True,
        text=True,
    )


def test_check_report_is_read_only(tmp_path: Path) -> None:
    report = tmp_path / "EVAL_REPORT.md"
    shutil.copyfile(TRACKED_REPORT, report)
    before = report.read_bytes()

    result = run_evaluator("--check-report", str(report))

    assert result.returncode == 0, result.stderr
    assert "read-only check" in result.stdout
    assert report.read_bytes() == before


def test_explicit_report_write_preserves_hand_maintained_sections(tmp_path: Path) -> None:
    report = tmp_path / "EVAL_REPORT.md"
    shutil.copyfile(TRACKED_REPORT, report)

    result = run_evaluator("--report", str(report))

    assert result.returncode == 0, result.stderr
    rendered = report.read_text(encoding="utf-8")
    assert "## Phase 2 HTTP contract evaluation" in rendered
    assert "<!-- BEGIN PROOFLINE GENERATED RELIABILITY REPORT -->" in rendered
    assert "<!-- END PROOFLINE GENERATED RELIABILITY REPORT -->" in rendered


def test_report_writer_refuses_secret_like_destination(tmp_path: Path) -> None:
    secret = tmp_path / ".env.local"

    result = run_evaluator("--report", str(secret))

    assert result.returncode == 2
    assert "secret-like path" in result.stderr
    assert not secret.exists()
