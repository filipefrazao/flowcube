"""
Instagram Automation App Configuration
instagram_automation/apps.py
"""
from django.apps import AppConfig


class InstagramAutomationConfig(AppConfig):
    """Configuration for Instagram DM Automation app"""
    
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'instagram_automation'
    verbose_name = 'Instagram DM Automation'
    
    def ready(self):
        """
        Initialize app when Django starts.
        Import signals if any.
        """
        try:
            import instagram_automation.signals  # noqa
        except ImportError:
            pass
