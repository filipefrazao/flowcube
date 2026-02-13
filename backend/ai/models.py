from django.db import models
from django.contrib.auth import get_user_model
import uuid

User = get_user_model()


class AIAgent(models.Model):
    MODEL_CHOICES = [
        ("gpt-4o", "GPT-4o"), ("gpt-4o-mini", "GPT-4o Mini"),
        ("claude-sonnet-4-5", "Claude Sonnet 4.5"), ("claude-haiku", "Claude Haiku"),
        ("gemini-2.5-pro", "Gemini 2.5 Pro"), ("deepseek-chat", "DeepSeek Chat"),
    ]
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    owner = models.ForeignKey(User, on_delete=models.CASCADE, related_name="ai_agents")
    name = models.CharField(max_length=150)
    description = models.TextField(blank=True, default="")
    system_prompt = models.TextField(default="You are a helpful assistant.")
    model = models.CharField(max_length=50, choices=MODEL_CHOICES, default="gpt-4o-mini")
    temperature = models.FloatField(default=0.7)
    max_tokens = models.IntegerField(default=1024)
    fallback_message = models.CharField(max_length=500, default="Desculpe, nao consegui processar sua mensagem.")
    active = models.BooleanField(default=True)
    tools = models.JSONField(default=list, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.name} ({self.model})"


class KnowledgeBase(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    agent = models.ForeignKey(AIAgent, on_delete=models.CASCADE, related_name="knowledge_bases")
    name = models.CharField(max_length=200)
    description = models.TextField(blank=True, default="")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.name} ({self.agent.name})"


class KnowledgeDocument(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    knowledge_base = models.ForeignKey(KnowledgeBase, on_delete=models.CASCADE, related_name="documents")
    title = models.CharField(max_length=300)
    file_name = models.CharField(max_length=300, blank=True, default="")
    content_text = models.TextField(blank=True, default="")
    chunk_count = models.IntegerField(default=0)
    indexed_at = models.DateTimeField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return self.title


class KnowledgeChunk(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    document = models.ForeignKey(KnowledgeDocument, on_delete=models.CASCADE, related_name="chunks")
    index = models.IntegerField()
    text = models.TextField()
    token_count = models.IntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["document", "index"]
        unique_together = ["document", "index"]

    def __str__(self):
        return f"Chunk {self.index} of {self.document.title}"
