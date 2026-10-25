from __future__ import annotations

import json
from pathlib import Path


FIXTURE_DIR = Path(__file__).parent / "fixtures" / "golden"


def test_twelve_voltedge_golden_fixtures_are_present_and_structured() -> None:
    fixtures = sorted(FIXTURE_DIR.glob("*.json"))

    assert len(fixtures) == 12
    for fixture_path in fixtures:
        fixture = json.loads(fixture_path.read_text())
        assert fixture["fixture_schema_version"] == "golden-v1"
        assert fixture["tenant"] == "voltedge"
        assert fixture["input"]["content"]
        assert "expected_findings" in fixture
        for finding in fixture["expected_findings"]:
            assert finding["category"]
            assert finding["severity"]
            if finding["evidence_status"] == "supported_mismatch":
                assert finding["evidence_refs"]
