
# flowcube/engine/variables.py
from django.db import models
from django.utils import timezone
import uuid
from typing import Optional, Any, Dict, List, Union

class VariableType(models.TextChoices):
    STRING = 'string'
    INTEGER = 'integer'
    FLOAT = 'float'
    BOOLEAN = 'boolean'
    OBJECT = 'object'
    ARRAY = 'array'
    NULL = 'null'

class Variable(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=255)
    type = models.EnumField(VariableType)
    value = models.JSONField()
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self) -> str:
        return f"{self.name} ({self.type})"

class VariableManager:
    @classmethod
    def get(cls, variable_id: uuid.UUID) -> Optional[Variable]:
        try:
            return Variable.objects.get(id=variable_id)
        except Variable.DoesNotExist:
            return None

    @classmethod
    def get_by_name(cls, name: str) -> Optional[Variable]:
        try:
            return Variable.objects.get(name=name)
        except Variable.DoesNotExist:
            return None

    @classmethod
    def create(cls, name: str, value: Any) -> Variable:
        variable = Variable(
            name=name,
            type=cls.detect_type(value),
            value=value
        )
        variable.save()
        return variable

    @classmethod
    def update(cls, variable_id: uuid.UUID, value: Any) -> Optional[Variable]:
        variable = cls.get(variable_id)
        if not variable:
            return None
            
        variable.value = value
        variable.type = cls.detect_type(value)
        variable.updated_at = timezone.now()
        variable.save()
        return variable

    @classmethod
    def delete(cls, variable_id: uuid.UUID) -> int:
        return Variable.objects.filter(id=variable_id).delete()[0]

    @staticmethod
    def detect_type(value: Any) -> str:
        if value is None:
            return VariableType.NULL
            
        if isinstance(value, bool):
            return VariableType.BOOLEAN
            
        if isinstance(value, int):
            return VariableType.INTEGER
            
        if isinstance(value, float):
            return VariableType.FLOAT
            
        if isinstance(value, (dict, list)):
            return VariableType.OBJECT if isinstance(value, dict) else VariableType.ARRAY
            
        return VariableType.STRING
