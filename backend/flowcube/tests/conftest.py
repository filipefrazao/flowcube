
# flowcube/tests/__init__.py
"""
Tests configuration for FlowCube project.
"""

# flowcube/tests/conftest.py
import pytest
from uuid import UUID
from datetime import datetime
from flowcube.models import User, Workflow, Step

@pytest.fixture
def user_fixture():
    """Fixture to create a test user."""
    return User(
        id=UUID("01234567-89ab-cdef-0123-456789abcdef"),
        username="testuser",
        email="test@example.com"
    )

@pytest.fixture
def workflow_fixture(user_fixture):
    """Fixture to create a test workflow."""
    return Workflow(
        id=UUID("fedcba98-7654-3210-fedc-ba9876543210"),
        name="Test Workflow",
        data={
            "nodes": [
                {
                    "id": "start-node",
                    "type": "START",
                    "configuration": {}
                }
            ]
        },
        created_at=datetime(2023, 10, 1),
        updated_at=datetime(2023, 10, 1)
    )

@pytest.fixture
def step_fixture(workflow_fixture):
    """Fixture to create test steps for a workflow."""
    return [
        Step(
            id=UUID("12345678-9abc-def0-1234-56789abcdef0"),
            workflow=workflow_fixture,
            name="Test Step 1",
            type="TASK",
            configuration={
                "description": "First test step"
            },
            position_x=100,
            position_y=100
        ),
        Step(
            id=UUID("23456789-abcd-ef10-2345-6789abcdef10"),
            workflow=workflow_fixture,
            name="Test Step 2",
            type="TASK",
            configuration={
                "description": "Second test step"
            },
            position_x=200,
            position_y=100
        )
    ]
