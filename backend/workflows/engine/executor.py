"""
Graph-based workflow executor.

Builds an adjacency list from React Flow edges, finds start nodes,
then executes via BFS following edge connections.  Broadcasts progress
events through Django Channels so the frontend WebSocket client can
show real-time node status updates.
"""
from __future__ import annotations

import time
import logging
from collections import defaultdict
from typing import Any, Optional

from asgiref.sync import sync_to_async
from channels.layers import get_channel_layer
from django.utils import timezone

from .registry import NodeRegistry
from .base import NodeResult
from .context import ExecutionContext

logger = logging.getLogger("flowcube.engine")


class WorkflowExecutor:
    """
    Execute a workflow graph stored as {nodes, edges, viewport}.
    """

    def __init__(self, graph: dict, context: ExecutionContext):
        self.graph = graph
        self.context = context
        self._nodes: list[dict] = graph.get("nodes", [])
        self._edges: list[dict] = graph.get("edges", [])
        self._nodes_by_id: dict[str, dict] = {n["id"]: n for n in self._nodes}
        # adjacency: source_id -> list of (target_id, source_handle)
        self._adj: dict[str, list[tuple[str, str]]] = defaultdict(list)
        for edge in self._edges:
            src = edge["source"]
            tgt = edge["target"]
            handle = edge.get("sourceHandle", "default") or "default"
            self._adj[src].append((tgt, handle))
        self._channel_layer = None
        self._registry = NodeRegistry()

    # ------------------------------------------------------------------
    # Graph helpers
    # ------------------------------------------------------------------

    def find_start_nodes(self) -> list[dict]:
        """Nodes with no incoming edges (roots of the DAG)."""
        target_ids = {e["target"] for e in self._edges}
        starts = [n for n in self._nodes if n["id"] not in target_ids]
        if not starts and self._nodes:
            starts = [self._nodes[0]]
        return starts

    def get_downstream(self, node_id: str, source_handle: str = "default") -> list[dict]:
        """Return nodes connected to *node_id* via matching source handle."""
        results = []
        for tgt_id, handle in self._adj.get(node_id, []):
            if handle == source_handle or source_handle == "default" and handle == "default":
                node = self._nodes_by_id.get(tgt_id)
                if node:
                    results.append(node)
        # If source_handle was specific and nothing matched, also try "default" edges
        if not results and source_handle != "default":
            for tgt_id, handle in self._adj.get(node_id, []):
                if handle == "default":
                    node = self._nodes_by_id.get(tgt_id)
                    if node:
                        results.append(node)
        return results

    # ------------------------------------------------------------------
    # Channel broadcasting
    # ------------------------------------------------------------------

    async def _broadcast(self, event_type: str, data: dict) -> None:
        """Send event to the execution's channel group."""
        if self._channel_layer is None:
            try:
                self._channel_layer = get_channel_layer()
            except Exception:
                return
        if self._channel_layer is None:
            return
        group = f"execution_{self.context.execution_id}"
        try:
            await self._channel_layer.group_send(
                group,
                {"type": "execution.progress", "event_type": event_type, **data},
            )
        except Exception as exc:
            logger.debug("Broadcast failed (no subscribers?): %s", exc)

    # ------------------------------------------------------------------
    # Main execution loop
    # ------------------------------------------------------------------

    async def execute(self) -> dict:
        """
        Run the full workflow.  Returns a summary dict.
        """
        # Recursion guard for subworkflows
        if hasattr(self.context, 'depth') and self.context.depth > 10:
            logger.error("Execution depth exceeded (max 10). Possible infinite recursion.")
            return {"status": "error", "message": "Maximum subworkflow depth exceeded (10 levels)"}

        start_nodes = self.find_start_nodes()
        if not start_nodes:
            return {"status": "error", "message": "No start nodes found"}

        await self._broadcast("execution_start", {
            "execution_id": self.context.execution_id,
        })

        executed_count = 0
        error_count = 0
        # BFS queue: list of nodes to execute
        queue: list[dict] = list(start_nodes)
        visited: set[str] = set()

        while queue:
            node = queue.pop(0)
            node_id = node["id"]

            if node_id in visited:
                continue
            visited.add(node_id)

            result = await self._execute_node(node)
            executed_count += 1

            if not result.success:
                error_count += 1
                # Check error handling config
                error_handling = node.get("data", {}).get("error_handling", "stop")
                if error_handling == "stop":
                    break
                elif error_handling == "ignore":
                    # Continue with default handle
                    pass
                elif error_handling == "resume":
                    # Use fallback output
                    fallback = node.get("data", {}).get("fallback_output")
                    if fallback is not None:
                        self.context.store_node_output(node_id, fallback)
                elif error_handling == "break":
                    # Stop this branch but continue others already in queue
                    continue

            # Find downstream nodes via the result's source_handle
            # Support parallel routing via source_handles list
            handles = result.source_handles if result.source_handles else [result.source_handle]
            for handle in handles:
                downstream = self.get_downstream(node_id, handle)
                for next_node in downstream:
                    if next_node["id"] not in visited:
                        queue.append(next_node)

        await self._broadcast("execution_complete", {
            "execution_id": self.context.execution_id,
            "executed_count": executed_count,
            "error_count": error_count,
        })

        return {
            "status": "completed" if error_count == 0 else "completed_with_errors",
            "executed_count": executed_count,
            "error_count": error_count,
        }

    # ------------------------------------------------------------------
    # Single node execution
    # ------------------------------------------------------------------

    async def _execute_node(self, node: dict) -> NodeResult:
        node_id = node["id"]
        node_type = node.get("type", "unknown")
        node_data = node.get("data", {})
        node_label = node_data.get("label", node_id)

        await self._broadcast("node_start", {
            "node_id": node_id,
            "node_type": node_type,
            "node_label": node_label,
        })

        start_time = time.monotonic()

        handler = self._registry.get_handler(node_type)
        if handler is None:
            result = NodeResult(
                output={"skipped": True, "reason": f"No handler for '{node_type}'"},
            )
            logger.warning("No handler registered for node type '%s'", node_type)
        else:
            # Validate first
            validation_error = handler.validate(node_data)
            if validation_error:
                result = NodeResult(error=f"Validation: {validation_error}")
            else:
                try:
                    result = await handler.execute(node_data, self.context)
                except Exception as exc:
                    logger.exception("Node %s (%s) raised: %s", node_id, node_type, exc)
                    result = NodeResult(error=str(exc))

        duration_ms = int((time.monotonic() - start_time) * 1000)

        # Store output for downstream nodes
        if result.success and result.output is not None:
            self.context.store_node_output(node_id, result.output)

        # Persist NodeExecutionLog
        await self._save_node_log(node, result, duration_ms)

        # Broadcast completion
        event = "node_complete" if result.success else "node_error"
        await self._broadcast(event, {
            "node_id": node_id,
            "node_type": node_type,
            "duration_ms": duration_ms,
            "error": result.error,
        })

        return result

    async def _save_node_log(self, node: dict, result: NodeResult, duration_ms: int) -> None:
        from workflows.models import Execution, NodeExecutionLog

        node_data = node.get("data", {})
        try:
            execution = await sync_to_async(
                Execution.objects.get
            )(id=self.context.execution_id)

            status = NodeExecutionLog.Status.SUCCESS if result.success else NodeExecutionLog.Status.ERROR

            await sync_to_async(NodeExecutionLog.objects.create)(
                execution=execution,
                node_id=node["id"],
                node_type=node.get("type", "unknown"),
                node_label=node_data.get("label", node["id"]),
                status=status,
                input_data=node_data,
                output_data=result.output if result.success else None,
                error_details=result.error or "",
                duration_ms=duration_ms,
            )
        except Exception as exc:
            logger.error("Failed to save NodeExecutionLog: %s", exc)
