"""
Logic and flow control node handlers.
"""
import asyncio
import logging

from simpleeval import simple_eval, NameNotDefined

from workflows.engine.base import BaseNodeHandler, NodeResult
from workflows.engine.context import ExecutionContext
from workflows.engine.registry import NodeRegistry

logger = logging.getLogger("flowcube.engine")


@NodeRegistry.register
class ConditionHandler(BaseNodeHandler):
    """
    Evaluates conditions and returns a source_handle matching the first true branch.
    Falls back to "else" handle if nothing matches.

    node_data.conditions = [
        {"handle": "true", "variable": "status", "operator": "equals", "value": "paid"},
        ...
    ]
    """
    node_type = ["condition", "decision_tree"]

    async def execute(self, node_data: dict, context: ExecutionContext) -> NodeResult:
        conditions = node_data.get("conditions") or node_data.get("config", {}).get("conditions", [])

        for cond in conditions:
            variable = cond.get("variable", "")
            operator = cond.get("operator", "equals")
            expected = cond.get("value", "")
            handle = cond.get("handle", "true")

            actual = context.get_variable(variable, "")
            # Also check node outputs for the variable name
            if actual == "" and variable:
                actual = context.get_node_output(variable, "")

            matched = _evaluate_condition(str(actual), operator, str(expected))
            if matched:
                return NodeResult(output={"matched": handle, "variable": variable}, source_handle=handle)

        # No condition matched -> "else" / default
        default_handle = node_data.get("default_output", "else")
        return NodeResult(output={"matched": default_handle}, source_handle=default_handle)


@NodeRegistry.register
class SetVariableHandler(BaseNodeHandler):
    node_type = "set_variable"

    async def execute(self, node_data: dict, context: ExecutionContext) -> NodeResult:
        var_name = node_data.get("variable_name") or node_data.get("config", {}).get("variable_name", "")
        raw_value = node_data.get("value") or node_data.get("config", {}).get("value", "")

        if not var_name:
            return NodeResult(error="variable_name is required")

        resolved = context.resolve_template(str(raw_value)) if isinstance(raw_value, str) else raw_value
        context.set_variable(var_name, resolved)
        return NodeResult(output={var_name: resolved})


@NodeRegistry.register
class WaitHandler(BaseNodeHandler):
    node_type = "wait"

    async def execute(self, node_data: dict, context: ExecutionContext) -> NodeResult:
        seconds = node_data.get("seconds") or node_data.get("config", {}).get("seconds", 0)
        try:
            seconds = int(seconds)
        except (ValueError, TypeError):
            seconds = 0
        # Cap at 300s (5 min) to prevent abuse
        seconds = min(max(seconds, 0), 300)
        if seconds > 0:
            await asyncio.sleep(seconds)
        return NodeResult(output={"waited_seconds": seconds})


@NodeRegistry.register
class MergeHandler(BaseNodeHandler):
    """
    Merge collects outputs from multiple incoming branches into a single output.
    Since BFS visits nodes once, this simply gathers all node_outputs available.
    """
    node_type = "merge"

    async def execute(self, node_data: dict, context: ExecutionContext) -> NodeResult:
        # Collect all upstream node outputs
        return NodeResult(output={"merged": dict(context.node_outputs)})


# ------------------------------------------------------------------
# Helpers
# ------------------------------------------------------------------

def _evaluate_condition(actual: str, operator: str, expected: str) -> bool:
    try:
        if operator == "equals":
            return actual == expected
        elif operator == "not_equals":
            return actual != expected
        elif operator == "contains":
            return expected in actual
        elif operator == "not_contains":
            return expected not in actual
        elif operator == "starts_with":
            return actual.startswith(expected)
        elif operator == "ends_with":
            return actual.endswith(expected)
        elif operator == "not_empty":
            return bool(actual)
        elif operator == "is_empty":
            return not bool(actual)
        elif operator == "greater_than":
            return float(actual) > float(expected)
        elif operator == "less_than":
            return float(actual) < float(expected)
        elif operator == "expression":
            # Use simpleeval for safe expression evaluation
            return bool(simple_eval(expected, names={"value": actual}))
        else:
            logger.warning("Unknown operator '%s', treating as false", operator)
            return False
    except Exception as exc:
        logger.debug("Condition evaluation error: %s", exc)
        return False
