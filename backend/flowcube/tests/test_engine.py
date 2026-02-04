
import uuid
from datetime import datetime
from unittest.mock import Mock, patch
from django.test import TestCase
from flowcube.models import Workflow, Step
from flowcube.engine import FlowEngine, WorkflowExecutor, StepManager

class TestFlowEngine(TestCase):
    def setUp(self):
        self.workflow_id = uuid.uuid4()
        self.workflow = Workflow.objects.create(
            id=self.workflow_id,
            name="Test Workflow",
            data={"steps": [{"id": "step1", "name": "Step 1"}]}
        )

    def test_init_workflow(self):
        engine = FlowEngine(workflow_id=str(self.workflow_id))
        self.assertEqual(engine.workflow_id, str(self.workflow_id))
        self.assertEqual(engine.workflow.name, "Test Workflow")

    @patch.object(Workflow, 'get_valid_workflow')
    def test_execute_workflow_valid(self, mock_get_workflow):
        mock_workflow = Mock()
        mock_workflow.is_valid.return_value = True
        mock_get_workflow.return_value = mock_workflow

        engine = FlowEngine(workflow_id=str(self.workflow_id))
        result = engine.execute()

        self.assertTrue(result['success'])
        self.assertEqual(result['workflow_name'], "Test Workflow")

    @patch.object(Workflow, 'get_valid_workflow')
    def test_execute_workflow_invalid(self, mock_get_workflow):
        mock_workflow = Mock()
        mock_workflow.is_valid.return_value = False
        mock_get_workflow.return_value = mock_workflow

        engine = FlowEngine(workflow_id=str(self.workflow_id))
        result = engine.execute()

        self.assertFalse(result['success'])
        self.assertEqual(result['error'], "Invalid workflow")

class TestWorkflowExecutor(TestCase):
    def setUp(self):
        self.executor = WorkflowExecutor()
        
    @patch('flowcube.engine.StepManager')
    def test_execute_step(self, mock_step_manager):
        step_id = str(uuid.uuid4())
        mock_step = Mock()
        mock_step.execute.return_value = {"result": "success"}
        mock_step_manager.get_step.return_value = mock_step

        result = self.executor.execute_step(step_id)
        
        self.assertEqual(result, {"result": "success"})
        mock_step_manager.get_step.assert_called_once_with(step_id)
        mock_step.execute.assert_called_once()

    @patch('flowcube.engine.StepManager')
    def test_execute_step_error(self, mock_step_manager):
        step_id = str(uuid.uuid4())
        mock_step = Mock()
        mock_step.execute.side_effect = Exception("Step error")
        mock_step_manager.get_step.return_value = mock_step

        result = self.executor.execute_step(step_id)
        
        self.assertFalse(result['success'])
        self.assertEqual(result['error'], "Step error")

class TestStepManager(TestCase):
    def setUp(self):
        self.manager = StepManager()
        self.step1 = Step.objects.create(
            id=uuid.uuid4(),
            name="Test Step 1",
            data={},
            created_at=datetime.now()
        )
        self.step2 = Step.objects.create(
            id=uuid.uuid4(),
            name="Test Step 2",
            data={},
            created_at=datetime.now()
        )

    def test_create_step(self):
        step_data = {"name": "New Step", "data": {}}
        new_step = self.manager.create_step(step_data)
        
        self.assertIsNotNone(new_step.id)
        self.assertEqual(new_step.name, "New Step")

    def test_get_step(self):
        retrieved_step = self.manager.get_step(str(self.step1.id))
        
        self.assertEqual(retrieved_step.id, self.step1.id)
        self.assertEqual(retrieved_step.name, "Test Step 1")

    def test_list_steps(self):
        steps = self.manager.list_steps()
        
        self.assertEqual(len(steps), 2)
