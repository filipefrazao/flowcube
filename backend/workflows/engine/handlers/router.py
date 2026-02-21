"""
Router node handler (Make-style).

Supports multiple distribution modes:
  - expression: Evaluate filter conditions (original behavior)
  - round_robin: Atomic counter via Redis for perfectly equal distribution
  - weighted: Weighted round-robin
  - random: Uniform random
  - hash: Consistent hash-based routing
"""
import hashlib
import logging
import random as _random

from django.conf import settings as django_settings

from workflows.engine.base import BaseNodeHandler, NodeResult
from workflows.engine.context import ExecutionContext
from workflows.engine.registry import NodeRegistry
from .logic import _evaluate_condition

logger = logging.getLogger("flowcube.engine")


def _get_redis():
    """Get Redis client for atomic counters."""
    try:
        return django_redis.get_redis_connection("default")
    except Exception:
        import redis
        broker_url = getattr(django_settings, 'CELERY_BROKER_URL', 'redis://localhost:6379/0')
        return redis.from_url(broker_url)


@NodeRegistry.register
class RouterHandler(BaseNodeHandler):
    """
    Make-style Router with N output routes and multiple distribution modes.

    Config:
        distribution_mode: "expression" | "round_robin" | "weighted" | "random" | "hash"
        routes: list of route definitions
        hash_field: field to hash on (for hash mode)

    Modes:
        expression - Evaluate filter conditions per route (original)
        round_robin - Atomic Redis counter for perfectly equal distribution
        weighted - Weighted round-robin with configurable weights
        random - Uniform random selection
        hash - Consistent hash-based routing (same input always same route)
    """
    node_type = "router"

    async def execute(self, node_data: dict, context: ExecutionContext) -> NodeResult:
        config = node_data.get("config", node_data)
        routes = config.get("routes", [])
        mode = config.get("distribution_mode", "expression")

        if not routes:
            return NodeResult(
                output={"matched": "fallback", "mode": mode, "routes": []},
                source_handle="fallback",
            )

        if mode == "round_robin":
            return self._round_robin(config, routes, context)
        elif mode == "weighted":
            return self._weighted_round_robin(config, routes, context)
        elif mode == "random":
            return self._random(config, routes, context)
        elif mode == "hash":
            return self._hash_based(config, routes, context)
        else:
            return self._expression_based(config, routes, context)

    def _expression_based(self, config, routes, context):
        """Original expression-based routing with filter evaluation."""
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
                output={"matched": "fallback", "mode": "expression", "routes": []},
                source_handle="fallback",
            )

        primary = matched_handles[0]["handle"]
        return NodeResult(
            output={"matched": primary, "mode": "expression", "routes": matched_handles},
            source_handle=primary,
        )

    def _round_robin(self, config, routes, context):
        """Atomic round-robin using Redis INCR for perfectly equal distribution."""
        try:
            redis_client = _get_redis()
            workflow_id = getattr(context, 'workflow_id', 'unknown')
            node_id = getattr(self, 'node_id', config.get('node_id', 'router'))
            key = f"router:rr:{workflow_id}:{node_id}"
            counter = redis_client.incr(key)
            # Set TTL of 30 days to prevent key accumulation
            if counter == 1:
                redis_client.expire(key, 86400 * 30)
        except Exception as exc:
            logger.warning("Redis unavailable for round-robin, falling back to random: %s", exc)
            return self._random(config, routes, context)

        idx = (counter - 1) % len(routes)
        route = routes[idx]
        handle = route.get("handle", f"route_{idx}")
        label = route.get("label", handle)

        return NodeResult(
            output={
                "matched": label,
                "mode": "round_robin",
                "counter": counter,
                "route_index": idx,
                "routes": [{"handle": handle, "label": label}],
            },
            source_handle=handle,
        )

    def _weighted_round_robin(self, config, routes, context):
        """Weighted round-robin. Routes with higher weight get more leads."""
        try:
            redis_client = _get_redis()
            workflow_id = getattr(context, 'workflow_id', 'unknown')
            node_id = getattr(self, 'node_id', config.get('node_id', 'router'))
            key = f"router:wrr:{workflow_id}:{node_id}"
            counter = redis_client.incr(key)
            if counter == 1:
                redis_client.expire(key, 86400 * 30)
        except Exception:
            counter = _random.randint(0, 10000)

        # Build weighted sequence
        total_weight = sum(r.get("weight", 1) for r in routes)
        position = (counter - 1) % total_weight

        cumulative = 0
        for route in routes:
            weight = route.get("weight", 1)
            cumulative += weight
            if position < cumulative:
                handle = route.get("handle", "default")
                label = route.get("label", handle)
                return NodeResult(
                    output={
                        "matched": label,
                        "mode": "weighted",
                        "counter": counter,
                        "routes": [{"handle": handle, "label": label}],
                    },
                    source_handle=handle,
                )

        # Fallback to first route
        route = routes[0]
        handle = route.get("handle", "default")
        return NodeResult(
            output={"matched": route.get("label", handle), "mode": "weighted", "routes": [{"handle": handle}]},
            source_handle=handle,
        )

    def _random(self, config, routes, context):
        """Uniform random distribution."""
        route = _random.choice(routes)
        handle = route.get("handle", "default")
        label = route.get("label", handle)
        return NodeResult(
            output={"matched": label, "mode": "random", "routes": [{"handle": handle, "label": label}]},
            source_handle=handle,
        )

    def _hash_based(self, config, routes, context):
        """Consistent hash-based routing. Same input always routes to same output."""
        hash_field = config.get("hash_field", "phone")
        value = str(context.get_variable(hash_field, ""))

        if not value:
            return NodeResult(
                output={"matched": "fallback", "mode": "hash", "routes": []},
                source_handle="fallback",
            )

        hash_val = int(hashlib.md5(value.encode()).hexdigest(), 16)
        idx = hash_val % len(routes)
        route = routes[idx]
        handle = route.get("handle", f"route_{idx}")
        label = route.get("label", handle)

        return NodeResult(
            output={
                "matched": label,
                "mode": "hash",
                "hash_value": value,
                "route_index": idx,
                "routes": [{"handle": handle, "label": label}],
            },
            source_handle=handle,
        )
