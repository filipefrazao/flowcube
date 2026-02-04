
# flowcube/engine/inputs.py

from django.db import models
from uuid import UUID
from typing import Optional, Dict, Any

class BaseInputExecutor(models.Model):
    """
    Base model for input executors.
    
    Attributes:
        id (UUID): Unique identifier for the executor.
        created_at (datetime): Timestamp when the executor was created.
        updated_at (datetime): Timestamp when the executor was last updated.
        name (str): Name of the executor.
        description (Optional[str]): Description of the executor.
        type (str): Type of input (e.g., 'text', 'choice').
        required (bool): Whether the input is required.
        default_value (Optional[str]): Default value for the input.
    """
    id = models.UUIDField(primary_key=True, default=UUID, editable=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    name = models.CharField(max_length=255)
    description = models.TextField(blank=True, null=True)
    type = models.CharField(max_length=50)
    required = models.BooleanField(default=True)
    default_value = models.CharField(max_length=500, blank=True, null=True)

    class Meta:
        abstract = True
        verbose_name = "Input Executor"
        verbose_name_plural = "Input Executors"

class TextInputExecutor(BaseInputExecutor):
    """
    Executor for text input type.
    
    Inherits all fields from BaseInputExecutor.
    """
    pass

    class Meta:
        verbose_name = "Text Input Executor"
        verbose_name_plural = "Text Input Executors"

class ChoiceInputExecutor(BaseInputExecutor):
    """
    Executor for choice input type.
    
    Attributes:
        options (Dict[str, Any]): Dictionary of choices where keys are labels and values are values.
    """
    options = models.JSONField(default=list)

    class Meta:
        verbose_name = "Choice Input Executor"
        verbose_name_plural = "Choice Input Executors"
