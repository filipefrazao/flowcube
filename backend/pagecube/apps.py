from flowcube_core.plugin_base import FlowCubePluginConfig


class PageCubeConfig(FlowCubePluginConfig):
    default = True  # CRITICAL: must override base's default=False
    name = 'pagecube'
    plugin_slug = "pagecube"
    plugin_icon = "layout"  # Lucide icon
    plugin_label = "PageCube"
    plugin_menu_position = 5  # High priority - before socialcube(10)
    plugin_url_prefix = "pagecube"
    plugin_frontend_route = "/pagecube"
    plugin_celery_queues = ["pages"]
    plugin_version = "1.0.0"
