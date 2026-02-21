"""
Workflow graph validation.

Validates the workflow graph structure before publishing.
"""
import logging
from collections import defaultdict
from typing import List, Optional

logger = logging.getLogger("flowcube.engine")

TRIGGER_TYPES = {
    "webhook_trigger", "schedule", "manual_trigger", "whatsapp_trigger",
    "evolution_trigger", "facebook_lead_ads", "premium_trigger",
    "email_trigger", "form_trigger", "api_trigger",
}


class WorkflowGraphValidator:
    """Validates a workflow graph before publishing."""

    def validate(self, graph: dict) -> List[str]:
        """Return a list of validation error strings. Empty = valid."""
        errors = []
        nodes = graph.get("nodes", [])
        edges = graph.get("edges", [])

        if not nodes:
            return ["Workflow has no nodes."]

        # 1. At least one trigger node
        triggers = [
            n for n in nodes
            if self._get_node_type(n) in TRIGGER_TYPES
        ]
        if not triggers:
            errors.append("Workflow must have at least one trigger node.")

        # 2. Orphan detection (nodes with no connections, excluding single-node workflows)
        if len(nodes) > 1:
            connected_ids = set()
            for edge in edges:
                connected_ids.add(edge.get("source", ""))
                connected_ids.add(edge.get("target", ""))
            orphans = [
                n["id"] for n in nodes
                if n["id"] not in connected_ids
            ]
            if orphans:
                errors.append(
                    f"Disconnected nodes found: {orphans}. "
                    "Connect them in the editor or remove them."
                )

        # 3. Router handle validation
        for node in nodes:
            if self._get_node_type(node) == "router":
                config = node.get("data", {}).get("config", {})
                routes = config.get("routes", [])
                route_handles = {r.get("handle", "") for r in routes} | {"fallback", "default"}
                node_edges = [e for e in edges if e.get("source") == node["id"]]
                for edge in node_edges:
                    src_handle = edge.get("sourceHandle", "default") or "default"
                    if src_handle not in route_handles and src_handle != "default":
                        errors.append(
                            f"Edge from router '{node['id']}' uses handle "
                            f"'{src_handle}' which is not defined in router routes."
                        )

        # 4. Cycle detection
        if self._has_cycle(nodes, edges):
            errors.append("Workflow graph contains cycles. Remove circular connections.")

        # 5. Trigger nodes should not have incoming edges
        trigger_ids = {n["id"] for n in triggers}
        for edge in edges:
            if edge.get("target", "") in trigger_ids:
                errors.append(
                    f"Trigger node '{edge['target']}' has an incoming connection. "
                    "Trigger nodes cannot receive connections."
                )

        # 6. Duplicate edges
        seen_edges = set()
        for edge in edges:
            key = (edge.get("source"), edge.get("target"), edge.get("sourceHandle", "default"))
            if key in seen_edges:
                errors.append(
                    f"Duplicate connection from '{key[0]}' to '{key[1]}' "
                    f"on handle '{key[2]}'."
                )
            seen_edges.add(key)

        return errors

    def _get_node_type(self, node: dict) -> str:
        """Extract the effective node type from a React Flow node."""
        return (
            node.get("data", {}).get("type", "")
            or node.get("type", "")
        )

    def _has_cycle(self, nodes: list, edges: list) -> bool:
        """Detect cycles using DFS."""
        adj = defaultdict(list)
        for edge in edges:
            adj[edge.get("source", "")].append(edge.get("target", ""))

        WHITE, GRAY, BLACK = 0, 1, 2
        color = {n["id"]: WHITE for n in nodes}

        def dfs(node_id: str) -> bool:
            color[node_id] = GRAY
            for neighbor in adj.get(node_id, []):
                if neighbor not in color:
                    continue
                if color[neighbor] == GRAY:
                    return True
                if color[neighbor] == WHITE and dfs(neighbor):
                    return True
            color[node_id] = BLACK
            return False

        for node in nodes:
            if color.get(node["id"]) == WHITE:
                if dfs(node["id"]):
                    return True
        return False


# Singleton instance
graph_validator = WorkflowGraphValidator()
