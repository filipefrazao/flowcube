from platform_core.plugin_base import FlowCubePluginConfig


class TelephonyConfig(FlowCubePluginConfig):
    default = True
    default_auto_field = "django.db.models.BigAutoField"
    name = "telephony"
    verbose_name = "Telephony - PABX"

    plugin_slug = "telephony"
    plugin_icon = "phone"
    plugin_label = "Telefonia"
    plugin_menu_position = 25
    plugin_url_prefix = "telephony"
    plugin_frontend_route = "/telephony"
    plugin_celery_queues = ["telephony"]
    plugin_version = "1.0.0"
