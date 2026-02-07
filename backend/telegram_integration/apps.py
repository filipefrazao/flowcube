from flowcube_core.plugin_base import FlowCubePluginConfig


class TelegramIntegrationConfig(FlowCubePluginConfig):
    default = True  # Required: override inherited default=False from base
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'telegram_integration'
    verbose_name = 'Telegram Bot Integration'

    # Plugin metadata
    plugin_slug = "telegram"
    plugin_icon = "send"
    plugin_label = "Telegram"
    plugin_menu_position = 30
    plugin_url_prefix = "telegram"
    plugin_frontend_route = "/telegram"
    plugin_version = "1.0.0"
