from platform_core.plugin_base import FlowCubePluginConfig


class SocialcubeConfig(FlowCubePluginConfig):
    default = True
    default_auto_field = "django.db.models.BigAutoField"
    name = "socialcube"
    verbose_name = "SocialCube - Social Media"

    plugin_slug = "socialcube"
    plugin_icon = "share-2"
    plugin_label = "SocialCube"
    plugin_menu_position = 10
    plugin_url_prefix = "socialcube"
    plugin_frontend_route = "/socialcube"
    plugin_celery_queues = ["social"]
    plugin_version = "1.0.0"
