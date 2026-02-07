from django.apps import AppConfig


class FlowCubeCoreConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "flowcube_core"
    verbose_name = "FlowCube Core"

    def ready(self):
        from flowcube_core.plugin_loader import PluginRegistry
        PluginRegistry.discover()
