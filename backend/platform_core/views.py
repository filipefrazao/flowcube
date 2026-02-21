"""
Plugin API views.

Exposes plugin metadata to the frontend for dynamic sidebar rendering.
"""
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from platform_core.plugin_loader import PluginRegistry
from platform_core.hooks import hooks


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def plugin_list(request):
    """List all installed plugins.

    Returns metadata used by the frontend to build the sidebar
    and dynamic route registry.

    Response:
        [
            {
                "slug": "billing",
                "label": "Faturamento",
                "icon": "credit-card",
                "menu_position": 50,
                "frontend_route": "/billing",
                "version": "1.0.0"
            },
            ...
        ]
    """
    plugins = PluginRegistry.get_all_plugins()
    data = [
        {
            "slug": p["slug"],
            "label": p["label"],
            "icon": p["icon"],
            "menu_position": p["menu_position"],
            "frontend_route": p["frontend_route"],
            "version": p["version"],
        }
        for p in plugins
    ]
    return Response(data)


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def plugin_detail(request, slug):
    """Get details for a specific plugin."""
    plugin = PluginRegistry.get_plugin(slug)
    if not plugin:
        return Response({"error": "Plugin not found"}, status=404)

    return Response({
        "slug": plugin["slug"],
        "label": plugin["label"],
        "icon": plugin["icon"],
        "menu_position": plugin["menu_position"],
        "frontend_route": plugin["frontend_route"],
        "url_prefix": plugin["url_prefix"],
        "version": plugin["version"],
        "source": plugin["source"],
    })


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def hooks_list(request):
    """List all registered hooks (debug/admin endpoint)."""
    registered = hooks.get_registered_hooks()
    return Response({"hooks": registered})
