"""
FlowCube AI Agents App Configuration

This module configures the Django app for AI agents functionality.
"""

from django.apps import AppConfig


class AiAgentsConfig(AppConfig):
    """Configuration class for the AI Agents app."""
    
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'ai_agents'
    verbose_name = 'AI Agents'
    
    def ready(self):
        """
        Called when the app is ready.
        Import signals and perform initialization tasks.
        """
        # Import signals if needed
        # from . import signals
        
        # Register default tools
        try:
            from .tools import register_default_tools
            register_default_tools()
        except Exception:
            # App might not be fully loaded during migrations
            pass
