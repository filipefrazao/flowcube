from django.test import TestCase
from django.urls import reverse
from django.contrib.auth.models import User
from rest_framework.test import APITestCase
from rest_framework import status
from workflows.models import Workflow, Block, Edge, Variable


class WorkflowAPITestCase(APITestCase):
    """Test cases for Workflow CRUD operations."""
    
    def setUp(self):
        """Set up test data."""
        self.user = User.objects.create_user(
            username='testuser',
            email='test@example.com',
            password='testpass123'
        )
        # Force authentication
        self.client.force_authenticate(user=self.user)
        
        self.workflow = Workflow.objects.create(
            name="Test Workflow",
            description="A test workflow",
            owner=self.user
        )
    
    def test_list_workflows(self):
        """Test listing all workflows."""
        url = '/api/v1/workflows/'
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIsInstance(response.data, list)
    
    def test_create_workflow(self):
        """Test creating a new workflow."""
        url = '/api/v1/workflows/'
        data = {
            'name': 'New Workflow',
            'description': 'A new test workflow'
        }
        response = self.client.post(url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data['name'], 'New Workflow')
    
    def test_get_workflow(self):
        """Test retrieving a single workflow."""
        url = f'/api/v1/workflows/{self.workflow.id}/'
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['name'], 'Test Workflow')
    
    def test_update_workflow(self):
        """Test updating a workflow."""
        url = f'/api/v1/workflows/{self.workflow.id}/'
        data = {'name': 'Updated Workflow'}
        response = self.client.patch(url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['name'], 'Updated Workflow')
    
    def test_delete_workflow(self):
        """Test deleting a workflow."""
        url = f'/api/v1/workflows/{self.workflow.id}/'
        response = self.client.delete(url)
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        self.assertFalse(Workflow.objects.filter(id=self.workflow.id).exists())


class BlockAPITestCase(APITestCase):
    """Test cases for Block CRUD operations."""
    
    def setUp(self):
        """Set up test data."""
        self.user = User.objects.create_user(
            username='testuser2',
            email='test2@example.com',
            password='testpass123'
        )
        self.client.force_authenticate(user=self.user)
        
        self.workflow = Workflow.objects.create(
            name="Test Workflow",
            owner=self.user
        )
        self.block = Block.objects.create(
            workflow=self.workflow,
            block_type="text_input",
            position_x=100,
            position_y=100
        )
    
    def test_list_blocks(self):
        """Test listing blocks for a workflow."""
        url = f'/api/v1/workflows/{self.workflow.id}/blocks/'
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIsInstance(response.data, list)
        self.assertEqual(len(response.data), 1)
    
    def test_create_block(self):
        """Test creating a new block."""
        url = f'/api/v1/workflows/{self.workflow.id}/blocks/'
        data = {
            'block_type': 'openai',
            'position_x': 200,
            'position_y': 200,
            'content': {'model': 'gpt-4o-mini'}
        }
        response = self.client.post(url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data['block_type'], 'openai')
    
    def test_update_block(self):
        """Test updating a block."""
        url = f'/api/v1/workflows/{self.workflow.id}/blocks/{self.block.id}/'
        data = {'position_x': 300}
        response = self.client.patch(url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['position_x'], 300)


class EdgeAPITestCase(APITestCase):
    """Test cases for Edge operations."""
    
    def setUp(self):
        """Set up test data."""
        self.user = User.objects.create_user(
            username='testuser3',
            email='test3@example.com',
            password='testpass123'
        )
        self.client.force_authenticate(user=self.user)
        
        self.workflow = Workflow.objects.create(
            name="Test Workflow",
            owner=self.user
        )
        self.block1 = Block.objects.create(
            workflow=self.workflow,
            block_type="text_input"
        )
        self.block2 = Block.objects.create(
            workflow=self.workflow,
            block_type="openai"
        )
    
    def test_create_edge(self):
        """Test creating an edge between blocks."""
        url = f'/api/v1/workflows/{self.workflow.id}/edges/'
        data = {
            'source_block': str(self.block1.id),
            'target_block': str(self.block2.id),
            'source_handle': 'default',
            'target_handle': 'default'
        }
        response = self.client.post(url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
    
    def test_list_edges(self):
        """Test listing edges for a workflow."""
        Edge.objects.create(
            workflow=self.workflow,
            source_block=self.block1,
            target_block=self.block2
        )
        url = f'/api/v1/workflows/{self.workflow.id}/edges/'
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)
