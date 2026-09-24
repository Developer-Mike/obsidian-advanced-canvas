#!/usr/bin/env python3
"""Focused regression tests for validate_canvas.py."""

# These tests were created by an LLM agent for the Advanced Canvas skill.

from __future__ import annotations

import json
import subprocess
import tempfile
import unittest
from pathlib import Path


VALIDATOR = Path(__file__).with_name("validate_canvas.py")


def run_validator(data: object) -> subprocess.CompletedProcess[str]:
    with tempfile.TemporaryDirectory() as directory:
        canvas = Path(directory) / "fixture.canvas"
        canvas.write_text(json.dumps(data), encoding="utf-8")
        return subprocess.run(
            ["python3", str(VALIDATOR), str(canvas)],
            capture_output=True,
            check=False,
            text=True,
        )


def text_node(node_id: str, text: str = "") -> dict[str, object]:
    return {
        "id": node_id,
        "type": "text",
        "x": 0.5,
        "y": 0,
        "width": 400,
        "height": 200,
        "text": text,
    }


class ValidatorTests(unittest.TestCase):
    def test_accepts_blank_text_and_fractional_geometry(self) -> None:
        result = run_validator({"nodes": [text_node("a1")], "edges": []})
        self.assertEqual(result.returncode, 0, result.stdout + result.stderr)

    def test_accepts_standard_edge_without_sides(self) -> None:
        result = run_validator({
            "nodes": [text_node("a1"), text_node("b2")],
            "edges": [{"id": "e1", "fromNode": "a1", "toNode": "b2"}],
        })
        self.assertEqual(result.returncode, 0, result.stdout + result.stderr)

    def test_reports_unhashable_enum_values_without_crashing(self) -> None:
        node = text_node("a1")
        node["type"] = []
        result = run_validator({
            "nodes": [node],
            "edges": [{
                "id": "e1", "fromNode": "a1", "fromSide": {},
                "toNode": "a1", "toSide": "left",
            }],
        })
        self.assertEqual(result.returncode, 1)
        self.assertIn('"type" must be one of', result.stdout)
        self.assertIn('"fromSide" must be one of', result.stdout)
        self.assertNotIn("Traceback", result.stderr)

    def test_accepts_current_portal_endpoint_encoding(self) -> None:
        portal = {
            "id": "p1",
            "type": "file",
            "x": 500,
            "y": 0,
            "width": 400,
            "height": 300,
            "file": "nested.canvas",
            "portal": True,
            "interdimensionalEdges": [{
                "id": "ie1",
                "fromNode": "a1",
                "fromSide": "right",
                "toNode": "acportal||p1||nested1",
                "toSide": "left",
            }],
        }
        result = run_validator({
            "metadata": {"version": "1.0-1.0", "frontmatter": {}},
            "nodes": [text_node("a1"), portal],
            "edges": [],
        })
        self.assertEqual(result.returncode, 0, result.stdout + result.stderr)

    def test_rejects_duplicate_ids_and_invalid_portal_endpoints(self) -> None:
        portal = {
            "id": "p1",
            "type": "file",
            "x": 500,
            "y": 0,
            "width": 400,
            "height": 300,
            "file": "nested.canvas",
            "portal": True,
            "interdimensionalEdges": [{
                "id": "e1",
                "fromNode": "a1",
                "fromSide": "right",
                "toNode": "p1-nested1",
                "toSide": "left",
            }],
        }
        result = run_validator({
            "metadata": {"version": "1.0-1.0", "frontmatter": {}},
            "nodes": [text_node("a1"), text_node("a1"), portal],
            "edges": [{
                "id": "e1", "fromNode": "a1", "fromSide": "right",
                "toNode": "p1", "toSide": "left",
            }],
        })
        self.assertEqual(result.returncode, 1)
        self.assertIn("duplicate node ID", result.stdout)
        self.assertIn("duplicate edge ID", result.stdout)
        self.assertIn("exactly one endpoint must be local", result.stdout)


if __name__ == "__main__":
    unittest.main()
