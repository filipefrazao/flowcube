"""
Router node handler (Make-style).

Evaluates filters for each route and returns matching source handles.
Unlike Condition which is binary (true/else), Router supports N routes.
"""
import logging

from workflows.engine.base import BaseNodeHandler, NodeResult
from workflows.engine.context import ExecutionContext
from workflows.engine.registry import NodeRegistry
from .logic import _evaluate_condition

logger = logging.getLogger("flowcube.engine")


@NodeRegistry.register
class RouterHandler(BaseNodeHandler):
    """
    Make-style Router with N output routes.

    node_data.routes = [
        {
            "handle": "route_1",
            "label": "Paid",
            "filters": [
                {"variable": "status", "operator": "equals", "value": "paid"}
            ]
        },
        {
            "handle": "route_2",
            "label": "Pending",
            "filters": [
                {"variable": "status", "operator": "equals", "value": "pending"}
            ]
        }
    ]

    If multiple routes match, all their handles are returned (parallel execution).
    If no routes match, returns "fallback" handle.
    """
    node_type = "router"

    async def execute(self, node_data: dict, context: ExecutionContext) -> NodeResult:
        config = node_data.get("config", node_data)
        routes = config.get("routes", [])
        matched_handles = []

        for route in routes:
            filters = route.get("filters", [])
            handle = route.get("handle", "default")
            label = route.get("label", handle)

            all_match = True
            for f in filters:
                variable = f.get("variable", "")
                operator = f.get("operator", "equals")
                expected = f.get("value", "")
                actual = str(context.get_variable(variable, ""))
                if not _evaluate_condition(actual, operator, str(expected)):
                    all_match = False
                    break

            if all_match and filters:
                matched_handles.append({"handle": handle, "label": label})

        if not matched_handles:
            return NodeResult(
                output={"matched": "fallback", "routes": []},
                source_handle="fallback",
            )

        # Use first matching route as primary source_handle
        # (executor follows edges with this handle)
        primary = matched_handles[0]["handle"]
        return NodeResult(
            output={"matched": primary, "routes": matched_handles},
            source_handle=primary,
        )
