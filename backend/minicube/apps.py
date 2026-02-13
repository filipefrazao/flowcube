from flowcube_core.plugin_base import FlowCubePluginConfig


class MinicubeConfig(FlowCubePluginConfig):
    default = True
    default_auto_field = "django.db.models.BigAutoField"
    name = "minicube"
    verbose_name = "MiniCube - Education"

    plugin_slug = "minicube"
    plugin_icon = "graduation-cap"
    plugin_label = "MiniCube"
    plugin_menu_position = 30
    plugin_url_prefix = "minicube"
    plugin_frontend_route = "/minicube"
    plugin_version = "1.0.0"
