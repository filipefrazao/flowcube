from flowcube_core.plugin_base import FlowCubePluginConfig


class FunnelcubeConfig(FlowCubePluginConfig):
    default = True
    default_auto_field = "django.db.models.BigAutoField"
    name = "funnelcube"
    verbose_name = "FunnelCube - Analytics"

    plugin_slug = "funnelcube"
    plugin_icon = "bar-chart-3"
    plugin_label = "FunnelCube"
    plugin_menu_position = 15
    plugin_url_prefix = "funnelcube"
    plugin_frontend_route = "/funnelcube"
    plugin_celery_queues = ["analytics"]
    plugin_version = "1.0.0"
