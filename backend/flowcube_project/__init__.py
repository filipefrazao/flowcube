"""
FlowCube Project
Django project configuration with Celery integration.
"""
from flowcube_project.celery import app as celery_app

__all__ = ("celery_app",)
