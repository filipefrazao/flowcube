from django.apps import AppConfig


class FlowcubeConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "flowcube"
    verbose_name = "FlowCube Core"

    def ready(self):
        # Import tasks to register with Celery
        import flowcube.tasks  # noqa
