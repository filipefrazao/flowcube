from platform_core.plugin_base import FlowCubePluginConfig


class ReportsConfig(FlowCubePluginConfig):
    default = True
    default_auto_field = "django.db.models.BigAutoField"
    name = "reports"
    verbose_name = "Reports"

    plugin_slug = "reports"
    plugin_icon = "file-text"
    plugin_label = "Reports"
    plugin_menu_position = 40
    plugin_url_prefix = "reports"
    plugin_frontend_route = "/reports"
    plugin_version = "1.0.0"
