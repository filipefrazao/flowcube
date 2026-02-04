"""
Email Sequences App Configuration
email_sequences/apps.py
"""
from django.apps import AppConfig


class EmailSequencesConfig(AppConfig):
    """Configuration for Email Sequences app"""
    
    default_auto_field = "django.db.models.BigAutoField"
    name = "email_sequences"
    verbose_name = "Email Sequences"
    
    def ready(self):
        """
        Initialize app when Django starts.
        Import signals if any.
        """
        try:
            import email_sequences.signals  # noqa
        except ImportError:
            pass
