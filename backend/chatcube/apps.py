from flowcube_core.plugin_base import FlowCubePluginConfig


class ChatcubeConfig(FlowCubePluginConfig):
    default = True  # Required: override inherited default=False from base
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'chatcube'
    verbose_name = 'ChatCube - WhatsApp Manager'

    # Plugin metadata
    plugin_slug = "chatcube"
    plugin_icon = "message-circle"
    plugin_label = "ChatCube"
    plugin_menu_position = 20
    plugin_url_prefix = "chatcube"
    plugin_frontend_route = "/chatcube"
    plugin_version = "5.0.0"

    def ready(self):
        super().ready()
        import chatcube.signals  # noqa
