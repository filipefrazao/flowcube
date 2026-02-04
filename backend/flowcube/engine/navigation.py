
import uuid
from django.db import models
from django.contrib.postgres.fields import JSONField
from typing import Dict, Any, Optional


class NavigationManager(models.Model):
    """
    Abstract base model providing navigation functionality for FlowCube workflows.
    
    This class provides methods to manage the execution flow of a workflow,
    including starting, resuming, completing, failing, and canceling nodes.
    It uses UUIDs for primary keys and JSONField for structured data storage.
    """
    uuid = models.UUIDField(
        primary_key=True,
        default=uuid.uuid4,
        editable=False
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    data = JSONField(default=dict)

    class Meta:
        abstract = True

    def start(self, **kwargs: Any) -> None:
        """
        Start the navigation process.
        
        Args:
            **kwargs: Additional parameters for the start action.
        """
        self.data.update({
            'action_history': {
                'timestamp': str(uuid.uuid1()),
                'action': 'start'
            }
        })
        self._handle_start(**kwargs)
    
    def resume(self, **kwargs: Any) -> None:
        """
        Resume the navigation process from a previous state.
        
        Args:
            **kwargs: Additional parameters for the resume action.
        """
        self.data.update({
            'action_history': {
                'timestamp': str(uuid.uuid1()),
                'action': 'resume'
            }
        })
        self._handle_resume(**kwargs)
    
    def complete(self, **kwargs: Any) -> None:
        """
        Complete the current node in the navigation process.
        
        Args:
            **kwargs: Additional parameters for the complete action.
        """
        self.data.update({
            'action_history': {
                'timestamp': str(uuid.uuid1()),
                'action': 'complete'
            }
        })
        self._handle_complete(**kwargs)
    
    def fail(self, **kwargs: Any) -> None:
        """
        Handle failure in the navigation process.
        
        Args:
            **kwargs: Additional parameters for the fail action.
        """
        self.data.update({
            'action_history': {
                'timestamp': str(uuid.uuid1()),
                'action': 'fail'
            }
        })
        self._handle_fail(**kwargs)
    
    def cancel(self, **kwargs: Any) -> None:
        """
        Cancel the navigation process.
        
        Args:
            **kwargs: Additional parameters for the cancel action.
        """
        self.data.update({
            'action_history': {
                'timestamp': str(uuid.uuid1()),
                'action': 'cancel'
            }
        })
        self._handle_cancel(**kwargs)
    
    def get_current_node(self) -> Optional[Dict[str, Any]]:
        """
        Retrieve the current node in the navigation process.
        
        Returns:
            Dict[str, Any]: The current node data or None if not found.
        """
        return self.data.get('current_node')
    
    def _handle_start(self, **kwargs: Any) -> None:
        """
        Abstract method to be implemented by subclasses for handling start action.
        
        Args:
            **kwargs: Additional parameters passed to the start method.
        """
        raise NotImplementedError
    
    def _handle_resume(self, **kwargs: Any) -> None:
        """
        Abstract method to be implemented by subclasses for handling resume action.
        
        Args:
            **kwargs: Additional parameters passed to the resume method.
        """
        raise NotImplementedError
    
    def _handle_complete(self, **kwargs: Any) -> None:
        """
        Abstract method to be implemented by subclasses for handling complete action.
        
        Args:
            **kwargs: Additional parameters passed to the complete method.
        """
        raise NotImplementedError
    
    def _handle_fail(self, **kwargs: Any) -> None:
        """
        Abstract method to be implemented by subclasses for handling fail action.
        
        Args:
            **kwargs: Additional parameters passed to the fail method.
        """
        raise NotImplementedError
    
    def _handle_cancel(self, **kwargs: Any) -> None:
        """
        Abstract method to be implemented by subclasses for handling cancel action.
        
        Args:
            **kwargs: Additional parameters passed to the cancel method.
        """
        raise NotImplementedError
