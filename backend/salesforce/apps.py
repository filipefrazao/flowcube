from flowcube_core.plugin_base import FlowCubePluginConfig


class SalesforceConfig(FlowCubePluginConfig):
    default = True
    default_auto_field = "django.db.models.BigAutoField"
    name = "salesforce"
    verbose_name = "Salesforce Integration"

    plugin_slug = "salesforce"
    plugin_icon = "cloud"
    plugin_label = "Salesforce"
    plugin_menu_position = 60
    plugin_url_prefix = "salesforce"
    plugin_frontend_route = "/salesforce"
    plugin_version = "1.0.0"
