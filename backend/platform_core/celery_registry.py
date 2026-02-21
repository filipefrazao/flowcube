"""
Celery queue auto-registration for FlowCube plugins.

Plugins declare their Celery queues in plugin_celery_queues and
task routes are auto-generated.
"""
from platform_core.plugin_loader import PluginRegistry


def get_plugin_queues() -> dict:
    """Get all Celery queues declared by plugins.

    Returns a dict suitable for Celery task_queues config:
        {"queue_name": {"routing_key": "queue_name"}, ...}
    """
    queues = {}
    for plugin in PluginRegistry.get_all_plugins():
        config_class = plugin.get("config_class")
        if config_class:
            for queue_name in getattr(config_class, "plugin_celery_queues", []):
                queues[queue_name] = {"routing_key": queue_name}
    return queues


def get_plugin_task_routes() -> dict:
    """Get task routing rules from plugins.

    Scans plugin AppConfigs for a `celery_task_routes` class attribute
    that maps task names to queues.
    """
    routes = {}
    for plugin in PluginRegistry.get_all_plugins():
        config_class = plugin.get("config_class")
        if config_class:
            plugin_routes = getattr(config_class, "celery_task_routes", {})
            routes.update(plugin_routes)
    return routes
