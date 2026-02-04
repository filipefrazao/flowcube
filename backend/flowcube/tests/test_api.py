
# flowcube/tests/test_api.py
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase
from uuid import UUID
from ..models import Workflow, Node, Step

class WorkflowAPITests(APITestCase):
    def setUp(self):
        self.workflow = Workflow.objects.create(
            name="Test Workflow",
            description="This is a test workflow"
        )
        self.node = Node.objects.create(
            workflow=self.workflow,
            name="Start Node",
            type="START",
            position_x=0,
            position_y=0
        )

    def test_get_workflows(self):
        url = reverse('workflow-list')
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]['name'], "Test Workflow")

    def test_create_workflow(self):
        url = reverse('workflow-list')
        data = {
            'name': 'New Workflow',
            'description': 'Another test workflow'
        }
        response = self.client.post(url, data)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data['name'], data['name'])
        self.assertEqual(response.data['description'], data['description'])

    def test_get_workflow_detail(self):
        url = reverse('workflow-detail', args=[str(self.workflow.id)])
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(UUID(str(response.data['id'])), self.workflow.id)

    def test_update_workflow(self):
        url = reverse('workflow-detail', args=[str(self.workflow.id)])
        data = {
            'name': 'Updated Workflow',
            'description': 'Updated description'
        }
        response = self.client.put(url, data)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['name'], data['name'])

    def test_partial_update_workflow(self):
        url = reverse('workflow-detail', args=[str(self.workflow.id)])
        data = {
            'description': 'Partial update'
        }
        response = self.client.patch(url, data)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['description'], data['description'])

    def test_delete_workflow(self):
        url = reverse('workflow-detail', args=[str(self.workflow.id)])
        response = self.client.delete(url)
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        self.assertFalse(Workflow.objects.filter(id=self.workflow.id).exists())
