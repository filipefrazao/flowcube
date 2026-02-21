from platform_core.plugin_base import FlowCubePluginConfig


class AiConfig(FlowCubePluginConfig):
    default = True  # Required: override inherited default=False from base
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'ai'
    verbose_name = 'AI Features'

    # Plugin metadata
    plugin_slug = "ai"
    plugin_icon = "brain"
    plugin_label = "AI"
    plugin_menu_position = 50
    plugin_url_prefix = "ai"
    plugin_frontend_route = "/ai"
    plugin_version = "1.0.0"
