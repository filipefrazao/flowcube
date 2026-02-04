
# flowcube/tests/conftest.py
import pytest
from django_webtest import Client as WebTestClient
from django.test import TestCase
from flowcube.websocket import WebSocketConsumer

@pytest.fixture
def client():
    return WebTestClient()

@pytest.fixture(autouse=True)
def setup_db():
    # Setup database for tests
    pass
