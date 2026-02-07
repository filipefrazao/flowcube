from flowcube_core.plugin_base import FlowCubePluginConfig


class BillingConfig(FlowCubePluginConfig):
    default = True  # Required: override inherited default=False from base
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'billing'
    verbose_name = 'Billing & Subscriptions'

    # Plugin metadata
    plugin_slug = "billing"
    plugin_icon = "credit-card"
    plugin_label = "Faturamento"
    plugin_menu_position = 80
    plugin_url_prefix = "billing"
    plugin_frontend_route = "/billing"
    plugin_version = "1.0.0"

    def ready(self):
        super().ready()
        import billing.signals  # noqa
