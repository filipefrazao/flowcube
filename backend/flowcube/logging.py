
# flowcube/models.py
from django.db import models
from django.utils import timezone
from uuid import UUID
import json

class FlowExecutionLog(models.Model):
    class ExecutionStatus:
        STARTED = 'STARTED'
        COMPLETED = 'COMPLETED'
        FAILED = 'FAILED'

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    flow = models.ForeignKey('Flow', on_delete=models.CASCADE)
    executor = models.CharField(max_length=255)
    start_time = models.DateTimeField(default=timezone.now)
    end_time = models.DateTimeField(null=True, blank=True)
    status = models.CharField(
        max_length=50,
        choices=[
            (ExecutionStatus.STARTED, 'Started'),
            (ExecutionStatus.COMPLETED, 'Completed'),
            (ExecutionStatus.FAILED, 'Failed')
        ],
        default=ExecutionStatus.STARTED
    )
    input_data = models.JSONField(null=True, blank=True)
    output_data = models.JSONField(null=True, blank=True)
    execution_time = models.DurationField(blank=True, null=True)

    def __str__(self):
        return f"Execution Log for Flow {self.flow.id} - {self.status}"

    class Meta:
        ordering = ['-start_time']
        verbose_name_plural = "Flow Execution Logs"

# flowcube/logging.py
import logging
from typing import Optional
from datetime import timedelta

logger = logging.getLogger('flowcube.execution')

def setup_logging() -> None:
    formatter = logging.Formatter('%(asctime)s - %(name)s - %(levelname)s - %(message)s')
    
    file_handler = logging.FileHandler('flow_execution.log')
    file_handler.setFormatter(formatter)
    
    console_handler = logging.StreamHandler()
    console_handler.setFormatter(formatter)
    
    logger.addHandler(file_handler)
    logger.addHandler(console_handler)
    logger.setLevel(logging.DEBUG)

def log_flow_start(execution_log: FlowExecutionLog) -> None:
    logger.debug(
        f"Flow execution started - ID: {execution_log.id}, "
        f"Flow: {execution_log.flow.id}, Executor: {execution_log.executor}"
    )

def log_flow_end(execution_log: FlowExecutionLog, status: str, error: Optional[Exception] = None) -> None:
    execution_time = timezone.now() - execution_log.start_time
    execution_log.execution_time = execution_time
    
    if error:
        logger.error(
            f"Flow execution failed - ID: {execution_log.id}, "
            f"Flow: {execution_log.flow.id}, Error: {str(error)}"
        )
    else:
        logger.info(
            f"Flow execution completed - ID: {execution_log.id}, "
            f"Flow: {execution_log.flow.id}, Duration: {execution_time}"
        )

def create_execution_log(flow, executor, input_data) -> FlowExecutionLog:
    log = FlowExecutionLog(
        flow=flow,
        executor=executor,
        input_data=input_data
    )
    log.save()
    return log

def update_execution_log_status(log_id: UUID, status: str, output_data: dict, error: Optional[Exception] = None) -> None:
    execution_log = FlowExecutionLog.objects.get(id=log_id)
    execution_log.status = status
    execution_log.output_data = output_data
    if error:
        execution_log.error_details = str(error)
    execution_log.save()
