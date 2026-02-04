
# flowcube/tests/factories.py

from factory import Factory, Faker, LazyAttribute
from uuid import uuid4
from ..models import Workflow, Step, Trigger

class WorkflowFactory(Factory):
    class Meta:
        model = Workflow

    name = Faker('word')
    description = Faker('sentence')
    pk = LazyAttribute(lambda o: uuid4())

    @LazyAttribute
    def steps(self):
        return [StepFactory.create() for _ in range(2)]

    @LazyAttribute
    def triggers(self):
        return [TriggerFactory.create() for _ in range(1)]


class StepFactory(Factory):
    class Meta:
        model = Step

    name = Faker('word')
    description = Faker('sentence')
    step_type = 'START'
    pk = LazyAttribute(lambda o: uuid4())


class TriggerFactory(Factory):
    class Meta:
        model = Trigger

    name = Faker('word')
    trigger_type = 'ON_CREATE'
    json_field = {'key': 'value'}
    pk = LazyAttribute(lambda o: uuid4())
