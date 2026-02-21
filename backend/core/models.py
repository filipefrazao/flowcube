"""
Core models — Re-exported from flowcube.models.

These are the shared, cross-app models. Other apps should import from here:
    from core.models import Credential, UserGroup, BusinessUnit, Squad, Tag

The actual model definitions remain in flowcube/models.py to avoid
risky Django migration ownership changes in production.
"""
from flowcube.models import (  # noqa: F401
    UserPreference,
    Credential,
    UserGroup,
    BusinessUnit,
    Squad,
    Tag,
    FlowExecutionLog,
)
