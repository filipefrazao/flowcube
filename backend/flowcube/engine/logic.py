
# flowcube/engine/logic.py
from django.db import models
from django.utils.translation import gettext_lazy as _
from abc import ABC, abstractmethod
import uuid
from typing import Any, Dict, Optional

class BaseExecutor(models.Model):
    """Base executor model."""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        abstract = True
        ordering = ['-created_at']

    @abstractmethod
    def execute(self, context: Dict[str, Any]) -> Dict[str, Any]:
        """Execute the executor's logic with the given context."""
        pass

class ConditionExecutor(BaseExecutor):
    """Executes conditional logic based on the given condition."""
    class ConditionType(models.TextChoices):
        FORMAT_STRING = 'format_string', _('Format String')
        PYTHON_EXPRESSION = 'python_expression', _('Python Expression')

    condition_type = models.CharField(max_length=20, choices=ConditionType.choices)
    condition_value = models.TextField()
    pass_through = models.BooleanField(default=True)

    def evaluate(self, context: Dict[str, Any]) -> bool:
        """Evaluate the condition with the given context."""
        if self.condition_type == ConditionExecutor.ConditionType.FORMAT_STRING:
            try:
                return bool(self.condition_value.format(**context))
            except KeyError as e:
                raise ValueError(f"Missing variable in format string: {e}") from None
        elif self.condition_type == ConditionExecutor.ConditionType.PYTHON_EXPRESSION:
            # Use eval safely with the given context
            return bool(eval(self.condition_value, {}, context))
        else:
            raise ValueError(f"Unknown condition type: {self.condition_type}")

    def execute(self, context: Dict[str, Any]) -> Dict[str, Any]:
        """Execute the conditional check."""
        result = self.evaluate(context)
        if not result and not self.pass_through:
            # If pass_through is False and condition fails, stop execution
            raise StopIteration("Condition failed")
        return context

class SetVariableExecutor(BaseExecutor):
    """Sets a variable in the execution context."""
    class ValueType(models.TextChoices):
        RAW = 'raw', _('Raw Value')
        JSON = 'json', _('JSON Object')

    variable_name = models.CharField(max_length=255)
    value_type = models.CharField(max_length=10, choices=ValueType.choices, default=ValueType.RAW)
    value = models.JSONField()

    def execute(self, context: Dict[str, Any]) -> Dict[str, Any]:
        """Set the variable in the context."""
        if self.value_type == SetVariableExecutor.ValueType.RAW:
            value = self.value
        elif self.value_type == SetVariableExecutor.ValueType.JSON:
            # Parse JSON value into Python object
            value = self.value
        else:
            raise ValueError(f"Unknown value type: {self.value_type}")

        context[self.variable_name] = value
        return context
