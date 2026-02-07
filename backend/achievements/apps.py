from flowcube_core.plugin_base import FlowCubePluginConfig


class AchievementsConfig(FlowCubePluginConfig):
    default = True  # Required: override inherited default=False from base
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'achievements'
    verbose_name = 'Achievements System'

    # Plugin metadata
    plugin_slug = "achievements"
    plugin_icon = "trophy"
    plugin_label = "Conquistas"
    plugin_menu_position = 60
    plugin_url_prefix = "achievements"
    plugin_frontend_route = "/achievements"
    plugin_version = "1.0.0"
