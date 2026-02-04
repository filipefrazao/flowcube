
# flowcube/tests/test_models.py
from django.test import TestCase
from uuid import UUID
from ..models import Flow, FlowGroup, FlowBlock


class FlowTests(TestCase):
    def setUp(self):
        self.flow = Flow.objects.create(
            name="Test Flow",
            description="Test Description",
            data={"key": "value"}
        )

    def test_create_flow(self):
        self.assertEqual(Flow.objects.count(), 1)
        flow = Flow.objects.first()
        self.assertIsInstance(flow.id, UUID)
        self.assertEqual(str(flow), "Test Flow")

    def test_flow_string_representation(self):
        self.assertEqual(str(self.flow), self.flow.name)

    def test_flow_validation(self):
        with self.assertRaises(ValueError):
            Flow.objects.create()

    def test_flow_json_field(self):
        self.assertEqual(self.flow.data, {"key": "value"})


class FlowGroupTests(TestCase):
    def setUp(self):
        self.group = FlowGroup.objects.create(
            name="Test Group",
            description="Test Description",
            data={"key": "value"}
        )

    def test_create_flow_group(self):
        self.assertEqual(FlowGroup.objects.count(), 1)
        group = FlowGroup.objects.first()
        self.assertIsInstance(group.id, UUID)
        self.assertEqual(str(group), "Test Group")

    def test_flow_group_string_representation(self):
        self.assertEqual(str(self.group), self.group.name)

    def test_flow_group_validation(self):
        with self.assertRaises(ValueError):
            FlowGroup.objects.create()

    def test_flow_group_json_field(self):
        self.assertEqual(self.group.data, {"key": "value"})


class FlowBlockTests(TestCase):
    def setUp(self):
        self.flow = Flow.objects.create(
            name="Test Flow",
            description="Test Description"
        )
        self.block = FlowBlock.objects.create(
            flow=self.flow,
            title="Test Block",
            data={"key": "value"}
        )

    def test_create_flow_block(self):
        self.assertEqual(FlowBlock.objects.count(), 1)
        block = FlowBlock.objects.first()
        self.assertIsInstance(block.id, UUID)
        self.assertEqual(str(block), f"Test Block ({self.flow.name})")

    def test_flow_block_string_representation(self):
        self.assertEqual(
            str(self.block),
            f"{self.block.title} ({self.block.flow.name})"
        )

    def test_flow_block_validation(self):
        with self.assertRaises(ValueError):
            FlowBlock.objects.create()

    def test_flow_block_json_field(self):
        self.assertEqual(self.block.data, {"key": "value"})

    def test_flow_block_cascade_delete(self):
        flow = Flow.objects.first()
        block_count = FlowBlock.objects.count()
        flow.delete()
        self.assertEqual(FlowBlock.objects.count(), 0)
