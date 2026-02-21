"""
FlowCube Core - Plugin Framework

Provides plugin discovery, registration, hooks, and URL auto-inclusion
for pip-installable FlowCube plugins.

Usage:
    # In your plugin's pyproject.toml:
    [project.entry-points."flowcube.plugins"]
    my_plugin = "my_plugin.apps:MyPluginConfig"

    # In your plugin's apps.py:
    from platform_core.plugin_base import FlowCubePluginConfig

    class MyPluginConfig(FlowCubePluginConfig):
        name = "my_plugin"
        plugin_slug = "my-plugin"
        plugin_label = "My Plugin"
        plugin_icon = "puzzle"
"""
default_app_config = "platform_core.apps.FlowCubeCoreConfig"
