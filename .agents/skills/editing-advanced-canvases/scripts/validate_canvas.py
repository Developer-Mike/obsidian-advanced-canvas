#!/usr/bin/env python3
"""Partially lint structural invariants of JSON Canvas files."""

# This validator was created by an LLM agent for the Advanced Canvas skill.

from __future__ import annotations

import argparse
import json
import math
import sys
from pathlib import Path
from typing import Any


SIDES = {"top", "right", "bottom", "left"}
ENDS = {"none", "arrow"}
NODE_TYPES = {"text", "file", "link", "group"}
BACKGROUND_STYLES = {"cover", "ratio", "repeat"}
NODE_STYLES = {
    "textAlign": {"left", "center", "right"},
    "shape": {
        "rectangle", "pill", "diamond", "parallelogram", "circle",
        "predefined-process", "document", "database",
    },
    "border": {"solid", "dashed", "dotted", "invisible"},
}
EDGE_STYLES = {
    "path": {"solid", "long-dashed", "short-dashed", "dotted"},
    "arrow": {
        "triangle", "triangle-outline", "thin-triangle", "halved-triangle",
        "diamond", "diamond-outline", "circle", "circle-outline", "blunt",
    },
    "pathfindingMethod": {"bezier", "direct", "square", "a-star"},
}


class Reporter:
    def __init__(self, path: Path) -> None:
        self.path = path
        self.errors: list[str] = []
        self.warnings: list[str] = []

    def error(self, location: str, message: str) -> None:
        self.errors.append(f"{location}: {message}")

    def warn(self, location: str, message: str) -> None:
        self.warnings.append(f"{location}: {message}")

    def print(self) -> None:
        for message in self.errors:
            print(f"ERROR {self.path}: {message}")
        for message in self.warnings:
            print(f"WARN  {self.path}: {message}")
        if not self.errors:
            suffix = f" ({len(self.warnings)} warning(s))" if self.warnings else ""
            print(f"OK    {self.path}{suffix}")


def is_number(value: Any) -> bool:
    if isinstance(value, bool):
        return False
    if isinstance(value, int):
        return True
    return isinstance(value, float) and math.isfinite(value)


def require_string(
    obj: dict[str, Any],
    key: str,
    location: str,
    report: Reporter,
    *,
    allow_empty: bool = False,
) -> str | None:
    value = obj.get(key)
    if not isinstance(value, str) or (not allow_empty and not value):
        qualifier = "a string" if allow_empty else "a non-empty string"
        report.error(location, f'"{key}" must be {qualifier}')
        return None
    return value


def validate_styles(value: Any, allowed: dict[str, set[str]], location: str, report: Reporter) -> None:
    if not isinstance(value, dict):
        report.error(location, "must be an object")
        return
    for key, values in allowed.items():
        candidate = value.get(key)
        if key in value and candidate is not None and (not isinstance(candidate, str) or candidate not in values):
            report.error(f"{location}.{key}", f"unsupported value {candidate!r}")


def validate_edge(
    edge: Any,
    location: str,
    node_ids: set[str] | None,
    report: Reporter,
    *,
    require_sides: bool,
) -> str | None:
    if not isinstance(edge, dict):
        report.error(location, "must be an object")
        return None

    edge_id = require_string(edge, "id", location, report)
    from_node = require_string(edge, "fromNode", location, report)
    to_node = require_string(edge, "toNode", location, report)

    for key in ("fromSide", "toSide"):
        value = edge.get(key)
        if value is None and not require_sides:
            continue
        if not isinstance(value, str) or value not in SIDES:
            report.error(location, f'"{key}" must be one of {sorted(SIDES)}')
    for key in ("fromEnd", "toEnd"):
        if key in edge and (not isinstance(edge[key], str) or edge[key] not in ENDS):
            report.error(location, f'"{key}" must be one of {sorted(ENDS)}')
    for key in ("fromFloating", "toFloating"):
        if key in edge and not isinstance(edge[key], bool):
            report.error(location, f'"{key}" must be a boolean')

    if node_ids is not None:
        if from_node is not None and from_node not in node_ids:
            report.error(location, f'"fromNode" references missing node {from_node!r}')
        if to_node is not None and to_node not in node_ids:
            report.error(location, f'"toNode" references missing node {to_node!r}')

    if "styleAttributes" in edge:
        validate_styles(edge["styleAttributes"], EDGE_STYLES, f"{location}.styleAttributes", report)
    for key in ("color", "label"):
        if key in edge and not isinstance(edge[key], str):
            report.error(location, f'"{key}" must be a string')
    return edge_id


def validate_node(node: Any, location: str, report: Reporter) -> str | None:
    if not isinstance(node, dict):
        report.error(location, "must be an object")
        return None

    node_id = require_string(node, "id", location, report)
    node_type = node.get("type")
    if not isinstance(node_type, str) or node_type not in NODE_TYPES:
        report.error(location, f'"type" must be one of {sorted(NODE_TYPES)}')
        node_type = None

    for key in ("x", "y", "width", "height"):
        if not is_number(node.get(key)):
            report.error(location, f'"{key}" must be a finite number')
    for key in ("dynamicHeight", "portal", "collapsed"):
        if key in node and not isinstance(node[key], bool):
            report.error(location, f'"{key}" must be a boolean')
    if "ratio" in node and not is_number(node["ratio"]):
        report.error(location, '"ratio" must be a finite number')
    if "zIndex" in node and (not isinstance(node["zIndex"], int) or isinstance(node["zIndex"], bool)):
        report.error(location, '"zIndex" must be an integer')

    if node_type == "text":
        require_string(node, "text", location, report, allow_empty=True)
    elif node_type == "file":
        require_string(node, "file", location, report)
    elif node_type == "link":
        require_string(node, "url", location, report)
    if node_type == "file" and "subpath" in node:
        if not isinstance(node["subpath"], str) or not node["subpath"].startswith("#"):
            report.error(location, '"subpath" must be a string beginning with "#"')
    if node_type == "group":
        if "backgroundStyle" in node and (
            not isinstance(node["backgroundStyle"], str) or node["backgroundStyle"] not in BACKGROUND_STYLES
        ):
            report.error(location, f'"backgroundStyle" must be one of {sorted(BACKGROUND_STYLES)}')
        for key in ("label", "background"):
            if key in node and not isinstance(node[key], str):
                report.error(location, f'"{key}" must be a string')

    if "styleAttributes" in node:
        validate_styles(node["styleAttributes"], NODE_STYLES, f"{location}.styleAttributes", report)
    if "collapsedData" in node or "isPortalLoaded" in node:
        report.error(location, "contains a runtime-only field that must not be saved")
    if "color" in node and not isinstance(node["color"], str):
        report.error(location, '"color" must be a string')

    if node_id is not None and "-" in node_id:
        report.warn(location, "ID contains '-', which can be ambiguous with portal-qualified IDs")
    return node_id


def validate(path: Path) -> Reporter:
    report = Reporter(path)
    try:
        data = json.loads(path.read_text(encoding="utf-8"))
    except (OSError, UnicodeError, json.JSONDecodeError) as error:
        report.error("document", str(error))
        return report

    if not isinstance(data, dict):
        report.error("document", "top level must be an object")
        return report

    metadata = data.get("metadata")
    if "metadata" in data:
        if not isinstance(metadata, dict):
            report.error("metadata", "must be an object")
        else:
            if metadata.get("version") != "1.0-1.0":
                report.error("metadata.version", 'must be "1.0-1.0"')
            if "frontmatter" in metadata and not isinstance(metadata["frontmatter"], dict):
                report.error("metadata.frontmatter", "must be an object")

    nodes = data.get("nodes", [])
    edges = data.get("edges", [])
    if not isinstance(nodes, list):
        report.error("nodes", "must be an array")
        nodes = []
    if not isinstance(edges, list):
        report.error("edges", "must be an array")
        edges = []

    node_ids: set[str] = set()
    for index, node in enumerate(nodes):
        node_id = validate_node(node, f"nodes[{index}]", report)
        if node_id in node_ids:
            report.error(f"nodes[{index}].id", f"duplicate node ID {node_id!r}")
        elif node_id is not None:
            node_ids.add(node_id)

    edge_ids: set[str] = set()
    advanced = isinstance(metadata, dict) and metadata.get("version") == "1.0-1.0"
    for index, edge in enumerate(edges):
        edge_id = validate_edge(edge, f"edges[{index}]", node_ids, report, require_sides=advanced)
        if edge_id in edge_ids:
            report.error(f"edges[{index}].id", f"duplicate edge ID {edge_id!r}")
        elif edge_id is not None:
            edge_ids.add(edge_id)

    for node_index, node in enumerate(nodes):
        if not isinstance(node, dict) or "interdimensionalEdges" not in node:
            continue
        portal_edges = node["interdimensionalEdges"]
        location = f"nodes[{node_index}].interdimensionalEdges"
        if not isinstance(portal_edges, list):
            report.error(location, "must be an array")
            continue
        portal_id = node.get("id")
        portal_prefix = f"acportal||{portal_id}||" if isinstance(portal_id, str) else None
        for edge_index, edge in enumerate(portal_edges):
            edge_location = f"{location}[{edge_index}]"
            edge_id = validate_edge(edge, edge_location, None, report, require_sides=True)
            if edge_id in edge_ids:
                report.error(f"{edge_location}.id", f"duplicate edge ID {edge_id!r}")
            elif edge_id is not None:
                edge_ids.add(edge_id)
            if not isinstance(edge, dict) or portal_prefix is None:
                continue
            endpoints = (edge.get("fromNode"), edge.get("toNode"))
            local_count = sum(endpoint in node_ids for endpoint in endpoints if isinstance(endpoint, str))
            portal_count = sum(
                endpoint.startswith(portal_prefix) for endpoint in endpoints if isinstance(endpoint, str)
            )
            if local_count != 1 or portal_count != 1:
                report.error(
                    edge_location,
                    f'exactly one endpoint must be local and one must start with "{portal_prefix}"',
                )

    if isinstance(metadata, dict) and "startNode" in metadata:
        start_node = metadata["startNode"]
        if not isinstance(start_node, str) or start_node not in node_ids:
            report.error("metadata.startNode", "must reference an existing node ID")
    return report


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("canvas", type=Path, nargs="+", help=".canvas file(s) to validate")
    args = parser.parse_args()

    has_errors = False
    for path in args.canvas:
        report = validate(path)
        report.print()
        has_errors = has_errors or bool(report.errors)
    return 1 if has_errors else 0


if __name__ == "__main__":
    sys.exit(main())
