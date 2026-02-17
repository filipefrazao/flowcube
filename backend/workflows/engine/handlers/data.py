"""
Data transformation node handlers.

JSONTransform, Iterator, Aggregator, TextParser, Filter, Sort.
"""
import re
import logging
from typing import Any

import jmespath

from workflows.engine.base import BaseNodeHandler, NodeResult
from workflows.engine.context import ExecutionContext
from workflows.engine.registry import NodeRegistry

logger = logging.getLogger("flowcube.engine")


@NodeRegistry.register
class JSONTransformHandler(BaseNodeHandler):
    """Transform data using JMESPath expressions."""
    node_type = "json_transform"

    async def execute(self, node_data: dict, context: ExecutionContext) -> NodeResult:
        config = node_data.get("config", node_data)
        expression = config.get("expression", "")
        input_var = config.get("input_variable", "")
        output_var = config.get("output_variable", "transform_result")

        if not expression:
            return NodeResult(error="JMESPath expression is required")

        # Get input data
        data = context.get_variable(input_var) if input_var else context.trigger_data
        if data is None:
            data = dict(context.node_outputs)

        try:
            result = jmespath.search(expression, data)
            context.set_variable(output_var, result)
            return NodeResult(output=result)
        except Exception as exc:
            return NodeResult(error=f"JMESPath error: {exc}")


@NodeRegistry.register
class IteratorHandler(BaseNodeHandler):
    """
    Split an array into individual items for downstream processing.
    Each item becomes the output so downstream nodes process it.
    """
    node_type = "iterator"

    async def execute(self, node_data: dict, context: ExecutionContext) -> NodeResult:
        config = node_data.get("config", node_data)
        input_var = config.get("input_variable", "")

        data = context.get_variable(input_var) if input_var else None
        if data is None:
            return NodeResult(error=f"Variable '{input_var}' not found or empty")

        if not isinstance(data, (list, tuple)):
            return NodeResult(error=f"Expected array, got {type(data).__name__}")

        # Store items for downstream processing
        # In a real implementation, this would fan-out execution.
        # For now, we store the array and let downstream nodes handle iteration.
        context.set_variable("_iterator_items", list(data))
        context.set_variable("_iterator_count", len(data))

        return NodeResult(output={
            "items": data,
            "count": len(data),
        })


@NodeRegistry.register
class AggregatorHandler(BaseNodeHandler):
    """Collect items back into an array after Iterator processing."""
    node_type = "aggregator"

    async def execute(self, node_data: dict, context: ExecutionContext) -> NodeResult:
        config = node_data.get("config", node_data)
        input_var = config.get("input_variable", "_iterator_items")
        output_var = config.get("output_variable", "aggregated_result")

        items = context.get_variable(input_var, [])
        if not isinstance(items, list):
            items = [items]

        context.set_variable(output_var, items)
        return NodeResult(output={"items": items, "count": len(items)})


@NodeRegistry.register
class TextParserHandler(BaseNodeHandler):
    """Extract or replace text using regex."""
    node_type = "text_parser"

    async def execute(self, node_data: dict, context: ExecutionContext) -> NodeResult:
        config = node_data.get("config", node_data)
        action = config.get("action", "extract")  # extract | replace
        pattern = config.get("pattern", "")
        text = context.resolve_template(config.get("text", ""))
        replacement = config.get("replacement", "")
        output_var = config.get("output_variable", "parsed_result")

        if not pattern:
            return NodeResult(error="Regex pattern is required")

        try:
            if action == "extract":
                matches = re.findall(pattern, text)
                context.set_variable(output_var, matches)
                return NodeResult(output={"matches": matches, "count": len(matches)})
            elif action == "replace":
                result = re.sub(pattern, replacement, text)
                context.set_variable(output_var, result)
                return NodeResult(output={"result": result})
            else:
                return NodeResult(error=f"Unknown action: {action}")
        except re.error as exc:
            return NodeResult(error=f"Regex error: {exc}")


@NodeRegistry.register
class FilterHandler(BaseNodeHandler):
    """Filter items from an array by condition."""
    node_type = "filter"

    async def execute(self, node_data: dict, context: ExecutionContext) -> NodeResult:
        config = node_data.get("config", node_data)
        input_var = config.get("input_variable", "")
        field = config.get("field", "")
        operator = config.get("operator", "not_empty")
        value = config.get("value", "")
        output_var = config.get("output_variable", "filtered_result")

        data = context.get_variable(input_var, [])
        if not isinstance(data, list):
            return NodeResult(error=f"Expected array, got {type(data).__name__}")

        from .logic import _evaluate_condition

        filtered = []
        for item in data:
            actual = _deep_field(item, field) if field else item
            if _evaluate_condition(str(actual), operator, str(value)):
                filtered.append(item)

        context.set_variable(output_var, filtered)
        return NodeResult(output={"items": filtered, "count": len(filtered)})


@NodeRegistry.register
class SortHandler(BaseNodeHandler):
    """Sort items in an array."""
    node_type = "sort"

    async def execute(self, node_data: dict, context: ExecutionContext) -> NodeResult:
        config = node_data.get("config", node_data)
        input_var = config.get("input_variable", "")
        field = config.get("field", "")
        direction = config.get("direction", "asc")
        output_var = config.get("output_variable", "sorted_result")

        data = context.get_variable(input_var, [])
        if not isinstance(data, list):
            return NodeResult(error=f"Expected array, got {type(data).__name__}")

        try:
            if field:
                sorted_data = sorted(
                    data,
                    key=lambda x: _deep_field(x, field) or "",
                    reverse=(direction == "desc"),
                )
            else:
                sorted_data = sorted(data, reverse=(direction == "desc"))

            context.set_variable(output_var, sorted_data)
            return NodeResult(output={"items": sorted_data, "count": len(sorted_data)})
        except Exception as exc:
            return NodeResult(error=f"Sort error: {exc}")


def _deep_field(obj: Any, field: str) -> Any:
    """Get a nested field from a dict using dot notation."""
    for part in field.split("."):
        if isinstance(obj, dict):
            obj = obj.get(part)
        else:
            return None
    return obj
