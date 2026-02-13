from flowcube_core.plugin_base import FlowCubePluginConfig


class SalescubeConfig(FlowCubePluginConfig):
    default = True
    default_auto_field = "django.db.models.BigAutoField"
    name = "salescube"
    verbose_name = "SalesCube - CRM"

    plugin_slug = "salescube"
    plugin_icon = "kanban-square"
    plugin_label = "SalesCube"
    plugin_menu_position = 20
    plugin_url_prefix = "salescube"
    plugin_frontend_route = "/salescube"
    plugin_version = "1.0.0"

    def ready(self):
        super().ready()
        import salescube.signals  # noqa: F401
