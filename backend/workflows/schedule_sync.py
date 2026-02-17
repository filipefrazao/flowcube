"""
Sync WorkflowSchedule with django-celery-beat PeriodicTask.

Called via signals when WorkflowSchedule is created/updated.
"""
import json
import logging

from django.utils import timezone

logger = logging.getLogger("flowcube.schedule")


def sync_schedule_to_celery_beat(schedule):
    """
    Create or update a django_celery_beat PeriodicTask
    based on the WorkflowSchedule instance.
    """
    from django_celery_beat.models import (
        PeriodicTask, IntervalSchedule, CrontabSchedule, ClockedSchedule,
    )

    task_name = f"workflow_schedule_{schedule.workflow_id}"

    # Delete existing task
    PeriodicTask.objects.filter(name=task_name).delete()

    if not schedule.is_active:
        schedule.celery_task_name = ""
        schedule.save(update_fields=["celery_task_name"])
        logger.info("Disabled schedule for workflow %s", schedule.workflow_id)
        return

    stype = schedule.schedule_type

    if stype == "on_demand" or stype == "immediately" or stype == "event":
        # These don't need periodic tasks
        return

    kwargs_json = json.dumps({"workflow_id": str(schedule.workflow_id)})

    if stype == "interval":
        interval, _ = IntervalSchedule.objects.get_or_create(
            every=schedule.interval_minutes,
            period=IntervalSchedule.MINUTES,
        )
        PeriodicTask.objects.create(
            name=task_name,
            task="workflows.tasks.execute_scheduled_workflow",
            interval=interval,
            kwargs=kwargs_json,
            enabled=True,
        )

    elif stype == "cron":
        parts = schedule.cron_expression.split()
        if len(parts) >= 5:
            crontab, _ = CrontabSchedule.objects.get_or_create(
                minute=parts[0],
                hour=parts[1],
                day_of_month=parts[2],
                month_of_year=parts[3],
                day_of_week=parts[4],
            )
            PeriodicTask.objects.create(
                name=task_name,
                task="workflows.tasks.execute_scheduled_workflow",
                crontab=crontab,
                kwargs=kwargs_json,
                enabled=True,
            )

    elif stype == "daily":
        hour = schedule.time_of_day.hour if schedule.time_of_day else 9
        minute = schedule.time_of_day.minute if schedule.time_of_day else 0
        crontab, _ = CrontabSchedule.objects.get_or_create(
            minute=str(minute),
            hour=str(hour),
            day_of_month="*",
            month_of_year="*",
            day_of_week="*",
        )
        PeriodicTask.objects.create(
            name=task_name,
            task="workflows.tasks.execute_scheduled_workflow",
            crontab=crontab,
            kwargs=kwargs_json,
            enabled=True,
        )

    elif stype == "weekly":
        hour = schedule.time_of_day.hour if schedule.time_of_day else 9
        minute = schedule.time_of_day.minute if schedule.time_of_day else 0
        dow = str(schedule.day_of_week) if schedule.day_of_week is not None else "1"
        crontab, _ = CrontabSchedule.objects.get_or_create(
            minute=str(minute),
            hour=str(hour),
            day_of_month="*",
            month_of_year="*",
            day_of_week=dow,
        )
        PeriodicTask.objects.create(
            name=task_name,
            task="workflows.tasks.execute_scheduled_workflow",
            crontab=crontab,
            kwargs=kwargs_json,
            enabled=True,
        )

    elif stype == "monthly":
        hour = schedule.time_of_day.hour if schedule.time_of_day else 9
        minute = schedule.time_of_day.minute if schedule.time_of_day else 0
        dom = str(schedule.day_of_month) if schedule.day_of_month else "1"
        crontab, _ = CrontabSchedule.objects.get_or_create(
            minute=str(minute),
            hour=str(hour),
            day_of_month=dom,
            month_of_year="*",
            day_of_week="*",
        )
        PeriodicTask.objects.create(
            name=task_name,
            task="workflows.tasks.execute_scheduled_workflow",
            crontab=crontab,
            kwargs=kwargs_json,
            enabled=True,
        )

    elif stype == "once":
        if schedule.run_at:
            clocked, _ = ClockedSchedule.objects.get_or_create(
                clocked_time=schedule.run_at,
            )
            PeriodicTask.objects.create(
                name=task_name,
                task="workflows.tasks.execute_scheduled_workflow",
                clocked=clocked,
                kwargs=kwargs_json,
                enabled=True,
                one_off=True,
            )

    schedule.celery_task_name = task_name
    schedule.save(update_fields=["celery_task_name"])
    logger.info("Synced schedule for workflow %s: %s", schedule.workflow_id, stype)
