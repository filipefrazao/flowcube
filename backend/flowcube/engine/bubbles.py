
# flowcube/engine/bubbles.py

import uuid
from django.db import models
from django.http import FileResponse, JsonResponse
import requests
from typing import Dict, Any


class Executor(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=255)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        abstract = True

    def __str__(self) -> str:
        return self.name


class TextExecutor(Executor):
    text = models.TextField()

    def execute(self, context: Dict[str, Any]) -> JsonResponse:
        """Execute the text operation.
        
        Args:
            context: Dictionary containing execution context data
            
        Returns:
            JsonResponse with the text content
        """
        return JsonResponse({"text": self.text})


class ImageExecutor(Executor):
    image_url = models.CharField(max_length=500)

    def execute(self, context: Dict[str, Any]) -> FileResponse:
        """Execute the image operation.
        
        Args:
            context: Dictionary containing execution context data
            
        Returns:
            FileResponse with the image content
        """
        response = requests.get(self.image_url)
        return FileResponse(
            response.content,
            content_type=f"image/{self.image_url.split('.')[-1].lower()}"
        )
