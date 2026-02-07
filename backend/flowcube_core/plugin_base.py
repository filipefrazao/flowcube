"""
Base class for all FlowCube plugins.

Every plugin app must define an AppConfig that extends FlowCubePluginConfig.
The core framework discovers plugins via:
  1. entry_points(group="flowcube.plugins") for pip-installed packages
  2. INSTALLED_APPS introspection for apps using FlowCubePluginConfig
"""
from django.apps import AppConfig


class FlowCubePluginConfig(AppConfig):
    """Base configuration class for FlowCube plugins.

    IMPORTANT: `default = False` prevents Django's auto-discovery from
    picking up this base class when it's imported in a plugin's apps.py.
    Without this, Django sees two AppConfig subclasses (the base + the
    concrete) and falls back to the default AppConfig.
    """
    default = False  # Exclude from Django auto-discovery (base class only)

    # --- Plugin metadata (override in subclass) ---
    plugin_slug: str = ""           # URL-safe identifier (e.g., "billing")
    plugin_icon: str = "puzzle"     # Lucide icon name for sidebar
    plugin_label: str = ""          # Human-readable sidebar label
    plugin_menu_position: int = 100 # Sidebar ordering (lower = higher)
    plugin_url_prefix: str = ""     # URL prefix (e.g., "billing" -> /api/v1/billing/)
    plugin_frontend_route: str = "" # Frontend route (e.g., "/billing")
    plugin_celery_queues: list = [] # Celery queue names this plugin uses
    plugin_requires: list = []      # Dependencies (e.g., ["flowcube-core>=1.0"])
    plugin_version: str = "0.0.0"  # Plugin version

    def ready(self):
        """Auto-register this plugin with the core registry."""
        super().ready()
        from flowcube_core.plugin_loader import PluginRegistry
        PluginRegistry.register(self)

    def get_urls(self):
        """Return URL patterns for this plugin.

        Default implementation looks for a `urls` module in the app.
        Override for custom behavior.
        """
        try:
            from importlib import import_module
            urls_module = import_module(f"{self.name}.urls")
            if hasattr(urls_module, "urlpatterns"):
                return urls_module.urlpatterns
        except ImportError:
            pass
        return []
