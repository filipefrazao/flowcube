"""
Singleton registry that maps node type strings to handler classes.

Usage:
    from workflows.engine import NodeRegistry

    @NodeRegistry.register
    class MyHandler(BaseNodeHandler):
        node_type = "my_custom_node"
        ...

At runtime:
    handler = NodeRegistry.get_handler("my_custom_node")
    result = await handler.execute(node_data, context)
"""
from __future__ import annotations

import logging
from typing import Optional

from .base import BaseNodeHandler

logger = logging.getLogger("flowcube.engine")


class _NodeRegistryMeta(type):
    """Metaclass ensuring a single registry instance."""
    _instance: Optional["NodeRegistry"] = None

    def __call__(cls, *args, **kwargs):
        if cls._instance is None:
            cls._instance = super().__call__(*args, **kwargs)
        return cls._instance


class NodeRegistry(metaclass=_NodeRegistryMeta):
    """
    Global registry of node type -> handler class.

    Handlers register themselves via the ``@NodeRegistry.register`` decorator
    or by calling ``NodeRegistry().register_handler(handler_class)``.
    """

    def __init__(self):
        self._handlers: dict[str, type[BaseNodeHandler]] = {}

    # ------------------------------------------------------------------
    # Registration
    # ------------------------------------------------------------------

    @staticmethod
    def register(handler_cls: type[BaseNodeHandler]) -> type[BaseNodeHandler]:
        """Class decorator that registers a handler."""
        registry = NodeRegistry()
        registry.register_handler(handler_cls)
        return handler_cls

    def register_handler(self, handler_cls: type[BaseNodeHandler]) -> None:
        node_type = handler_cls.node_type
        if isinstance(node_type, str):
            types = [node_type]
        elif isinstance(node_type, (list, tuple)):
            types = list(node_type)
        else:
            raise TypeError(
                f"{handler_cls.__name__}.node_type must be str or list[str], "
                f"got {type(node_type)}"
            )

        for t in types:
            if not t:
                raise ValueError(f"{handler_cls.__name__} has empty node_type")
            if t in self._handlers:
                logger.warning(
                    "Overriding handler for node type '%s': %s -> %s",
                    t,
                    self._handlers[t].__name__,
                    handler_cls.__name__,
                )
            self._handlers[t] = handler_cls
            logger.debug("Registered handler %s for '%s'", handler_cls.__name__, t)

    # ------------------------------------------------------------------
    # Lookup
    # ------------------------------------------------------------------

    def get_handler(self, node_type: str) -> Optional[BaseNodeHandler]:
        """Return an instance of the handler for *node_type*, or None."""
        handler_cls = self._handlers.get(node_type)
        if handler_cls is None:
            return None
        return handler_cls()

    def has_handler(self, node_type: str) -> bool:
        return node_type in self._handlers

    def list_types(self) -> list[str]:
        """Return all registered node type strings."""
        return sorted(self._handlers.keys())

    # ------------------------------------------------------------------
    # Introspection
    # ------------------------------------------------------------------

    def __len__(self) -> int:
        return len(self._handlers)

    def __contains__(self, item: str) -> bool:
        return item in self._handlers

    def __repr__(self) -> str:
        return f"<NodeRegistry handlers={len(self._handlers)}>"
