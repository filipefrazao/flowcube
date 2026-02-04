"""
Telegram Integration App Configuration
telegram_integration/apps.py
"""
from django.apps import AppConfig


class TelegramIntegrationConfig(AppConfig):
    """Configuration for Telegram Bot Integration app"""
    
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'telegram_integration'
    verbose_name = 'Telegram Bot Integration'
    
    def ready(self):
        """
        Initialize app when Django starts.
        Import signals if any.
        """
        try:
            import telegram_integration.signals  # noqa
        except ImportError:
            pass
