"""
Base classes for workflow node handlers.

Every node handler extends BaseNodeHandler and implements execute().
Handlers are stateless - all state lives in ExecutionContext.
"""
from __future__ import annotations

import logging
from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from typing import Any, Optional

logger = logging.getLogger("flowcube.engine")


@dataclass
class NodeResult:
    """Result of executing a single node."""
    output: Any = None
    error: Optional[str] = None
    # Which source handle to follow (for branching nodes like Router/Condition)
    source_handle: str = "default"
    # For parallel routing: list of handles to follow simultaneously
    source_handles: list = field(default_factory=list)
    # Extra metadata (timing, provider info, etc.)
    metadata: dict = field(default_factory=dict)

    @property
    def success(self) -> bool:
        return self.error is None


class BaseNodeHandler(ABC):
    """
    Abstract base for all node handlers.

    Subclasses MUST:
      - Set `node_type` class attribute (str or list[str])
      - Implement `execute(node_data, context) -> NodeResult`

    Optionally override:
      - `validate(node_data)` for pre-execution checks
    """

    # The node type(s) this handler processes.
    # Can be a single string or list of strings for aliases.
    node_type: str | list[str] = ""

    @abstractmethod
    async def execute(self, node_data: dict, context: "ExecutionContext") -> NodeResult:
        """
        Execute the node logic.

        Args:
            node_data: The `data` dict from the React Flow node
            context: Shared execution context with variables, credentials, outputs
        Returns:
            NodeResult with output data and optional source_handle for routing
        """
        ...

    def validate(self, node_data: dict) -> Optional[str]:
        """
        Validate node configuration before execution.
        Returns error message string if invalid, None if ok.
        """
        return None
