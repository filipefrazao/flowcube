from django.contrib.auth import get_user_model
from rest_framework import status
from rest_framework.test import APITestCase

from workflows.models import Workflow, Block, Edge


User = get_user_model()


def extract_list(data):
    if isinstance(data, dict) and 'results' in data:
        return data['results']
    return data


class WorkflowAPITestCase(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            username='testuser',
            email='test@example.com',
            password='testpass123',
        )
        self.client.force_authenticate(user=self.user)

        self.workflow = Workflow.objects.create(
            name='Test Workflow',
            description='A test workflow',
            owner=self.user,
        )

    def test_list_workflows(self):
        url = '/api/v1/workflows/'
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        items = extract_list(response.data)
        self.assertIsInstance(items, list)

    def test_create_workflow(self):
        url = '/api/v1/workflows/'
        data = {
            'name': 'New Workflow',
            'description': 'A new test workflow',
        }
        response = self.client.post(url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data['name'], 'New Workflow')

    def test_get_workflow(self):
        url = f'/api/v1/workflows/{self.workflow.id}/'
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['name'], 'Test Workflow')

    def test_update_workflow(self):
        url = f'/api/v1/workflows/{self.workflow.id}/'
        data = {'name': 'Updated Workflow'}
        response = self.client.patch(url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['name'], 'Updated Workflow')

    def test_delete_workflow(self):
        url = f'/api/v1/workflows/{self.workflow.id}/'
        response = self.client.delete(url)
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        self.assertFalse(Workflow.objects.filter(id=self.workflow.id).exists())


class BlockAPITestCase(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            username='testuser2',
            email='test2@example.com',
            password='testpass123',
        )
        self.client.force_authenticate(user=self.user)

        self.workflow = Workflow.objects.create(
            name='Test Workflow',
            owner=self.user,
        )
        self.block = Block.objects.create(
            workflow=self.workflow,
            block_type='text_input',
            position_x=100,
            position_y=100,
        )

    def test_list_blocks(self):
        url = f'/api/v1/workflows/{self.workflow.id}/blocks/'
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        items = extract_list(response.data)
        self.assertIsInstance(items, list)
        self.assertEqual(len(items), 1)

    def test_create_block(self):
        url = f'/api/v1/workflows/{self.workflow.id}/blocks/'
        data = {
            'block_type': 'openai',
            'position_x': 200,
            'position_y': 200,
            'content': {'model': 'gpt-4o-mini'},
        }
        response = self.client.post(url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data['block_type'], 'openai')

    def test_update_block(self):
        url = f'/api/v1/workflows/{self.workflow.id}/blocks/{self.block.id}/'
        data = {'position_x': 300}
        response = self.client.patch(url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['position_x'], 300)


class EdgeAPITestCase(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            username='testuser3',
            email='test3@example.com',
            password='testpass123',
        )
        self.client.force_authenticate(user=self.user)

        self.workflow = Workflow.objects.create(
            name='Test Workflow',
            owner=self.user,
        )
        self.block1 = Block.objects.create(
            workflow=self.workflow,
            block_type='text_input',
        )
        self.block2 = Block.objects.create(
            workflow=self.workflow,
            block_type='openai',
        )

    def test_create_edge(self):
        url = f'/api/v1/workflows/{self.workflow.id}/edges/'
        data = {
            'source_block': str(self.block1.id),
            'target_block': str(self.block2.id),
            'source_handle': 'default',
            'target_handle': 'default',
        }
        response = self.client.post(url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

    def test_list_edges(self):
        Edge.objects.create(
            workflow=self.workflow,
            source_block=self.block1,
            target_block=self.block2,
        )
        url = f'/api/v1/workflows/{self.workflow.id}/edges/'
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        items = extract_list(response.data)
        self.assertIsInstance(items, list)
        self.assertEqual(len(items), 1)
