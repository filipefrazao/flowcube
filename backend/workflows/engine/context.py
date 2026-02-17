"""
Execution context shared across all nodes in a single workflow run.

Holds variables, node outputs, credential references, and template resolution.
"""
from __future__ import annotations

import re
import logging
from typing import Any, Optional

logger = logging.getLogger("flowcube.engine")


class ExecutionContext:
    """
    Mutable context passed through every node during execution.
    """

    def __init__(
        self,
        execution_id: str,
        workflow_id: str,
        trigger_data: Optional[dict] = None,
        variables: Optional[dict] = None,
    ):
        self.execution_id = execution_id
        self.workflow_id = workflow_id
        self.trigger_data = trigger_data or {}
        self.variables: dict[str, Any] = variables or {}
        # Maps node_id -> NodeResult.output from already-executed nodes
        self.node_outputs: dict[str, Any] = {}

    # ------------------------------------------------------------------
    # Variable helpers
    # ------------------------------------------------------------------

    def set_variable(self, name: str, value: Any) -> None:
        self.variables[name] = value

    def get_variable(self, name: str, default: Any = None) -> Any:
        return self.variables.get(name, default)

    def store_node_output(self, node_id: str, output: Any) -> None:
        """Store the output of a completed node so downstream nodes can reference it."""
        self.node_outputs[node_id] = output

    def get_node_output(self, node_id: str, default: Any = None) -> Any:
        return self.node_outputs.get(node_id, default)

    # ------------------------------------------------------------------
    # Template interpolation  {{variable}}  and  {{$node.nodeId.field}}
    # ------------------------------------------------------------------

    _VAR_RE = re.compile(r"\{\{\s*(.+?)\s*\}\}")

    def resolve_template(self, text: str) -> str:
        """
        Replace {{variable}} and {{$node.nodeId.field}} in a string.

        Supported patterns:
          {{name}}             -> self.variables['name']
          {{$trigger.field}}   -> self.trigger_data['field']
          {{$node.id.field}}   -> self.node_outputs['id']['field']
        """
        if not text or "{{" not in text:
            return text

        def _replace(match: re.Match) -> str:
            expr = match.group(1).strip()

            # Node output reference: $node.nodeId.path.to.field
            if expr.startswith("$node."):
                parts = expr[6:].split(".", 1)
                node_id = parts[0]
                output = self.node_outputs.get(node_id)
                if output is None:
                    return match.group(0)
                if len(parts) > 1:
                    return str(_deep_get(output, parts[1]))
                return str(output)

            # Trigger data reference: $trigger.field
            if expr.startswith("$trigger."):
                path = expr[9:]
                return str(_deep_get(self.trigger_data, path))

            # Plain variable
            val = self.variables.get(expr)
            if val is not None:
                return str(val)

            return match.group(0)  # leave unresolved

        return self._VAR_RE.sub(_replace, text)

    def resolve_dict(self, data: dict) -> dict:
        """Recursively resolve templates in a dict."""
        result = {}
        for key, value in data.items():
            if isinstance(value, str):
                result[key] = self.resolve_template(value)
            elif isinstance(value, dict):
                result[key] = self.resolve_dict(value)
            elif isinstance(value, list):
                result[key] = [
                    self.resolve_template(v) if isinstance(v, str)
                    else self.resolve_dict(v) if isinstance(v, dict)
                    else v
                    for v in value
                ]
            else:
                result[key] = value
        return result


def _deep_get(obj: Any, path: str) -> Any:
    """Navigate nested dict/list by dot-separated path."""
    for part in path.split("."):
        if isinstance(obj, dict):
            obj = obj.get(part)
        elif isinstance(obj, (list, tuple)):
            try:
                obj = obj[int(part)]
            except (ValueError, IndexError):
                return None
        else:
            return None
        if obj is None:
            return None
    return obj
