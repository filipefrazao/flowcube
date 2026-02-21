"""
Hook system for inter-plugin communication (Wagtail-style).

Plugins register hooks to extend core behavior without direct imports.

Usage:
    # In a plugin's hooks.py:
    from platform_core.hooks import hooks

    @hooks.register("user_created")
    def on_user_created(user):
        # Create subscription for new user
        Subscription.objects.create(user=user, plan="free")

    # In core code that fires the hook:
    from platform_core.hooks import hooks

    hooks.run("user_created", user=new_user)
"""
import logging
from collections import defaultdict

logger = logging.getLogger(__name__)


class HookRegistry:
    """Registry for hook handlers.

    Supports both decorator and manual registration.
    """

    def __init__(self):
        self._hooks: dict[str, list] = defaultdict(list)

    def register(self, hook_name: str, fn=None, *, order: int = 0):
        """Register a handler for a hook.

        Can be used as a decorator or called directly:

            @hooks.register("user_created")
            def handler(user): ...

            # or
            hooks.register("user_created", my_handler, order=10)
        """
        if fn is not None:
            self._hooks[hook_name].append((order, fn))
            self._hooks[hook_name].sort(key=lambda x: x[0])
            return fn

        # Used as decorator
        def decorator(func):
            self._hooks[hook_name].append((order, func))
            self._hooks[hook_name].sort(key=lambda x: x[0])
            return func
        return decorator

    def run(self, hook_name: str, **kwargs):
        """Fire a hook, calling all registered handlers.

        Returns list of results from each handler.
        Exceptions in handlers are logged but do not stop execution.
        """
        results = []
        for _order, handler in self._hooks.get(hook_name, []):
            try:
                result = handler(**kwargs)
                results.append(result)
            except Exception:
                logger.exception(
                    "Error in hook '%s' handler '%s'",
                    hook_name,
                    handler.__qualname__,
                )
        return results

    def get_hooks(self, hook_name: str) -> list:
        """Get all handlers for a hook."""
        return [fn for _order, fn in self._hooks.get(hook_name, [])]

    def get_registered_hooks(self) -> dict[str, int]:
        """Return all registered hook names and handler counts."""
        return {name: len(handlers) for name, handlers in self._hooks.items()}

    def clear(self, hook_name: str | None = None):
        """Clear hooks (for testing). If hook_name is None, clear all."""
        if hook_name:
            self._hooks.pop(hook_name, None)
        else:
            self._hooks.clear()


# Global hooks instance
hooks = HookRegistry()
