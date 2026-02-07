"""
URL auto-registration for FlowCube plugins.

Generates URL patterns from the plugin registry, auto-prefixing
each plugin's URLs with /api/v1/{plugin_slug}/.
"""
from django.urls import path, include

from flowcube_core.plugin_loader import PluginRegistry


def get_plugin_urlpatterns():
    """Generate URL patterns for all registered plugins.

    Returns a list of path() entries that can be added to urlpatterns.
    Each plugin's URLs are prefixed with api/v1/{url_prefix}/.
    """
    patterns = []
    for plugin in PluginRegistry.get_all_plugins():
        url_prefix = plugin.get("url_prefix", plugin["slug"])
        app_name = plugin.get("name", "")

        try:
            patterns.append(
                path(
                    f"api/v1/{url_prefix}/",
                    include(f"{app_name}.urls"),
                )
            )
        except Exception:
            # Plugin may not have urls.py - that's okay
            pass

    return patterns
