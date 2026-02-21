from django.apps import AppConfig


class FlowCubeCoreConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "platform_core"
    verbose_name = "Platform Core"

    def ready(self):
        from platform_core.plugin_loader import PluginRegistry
        PluginRegistry.discover()
