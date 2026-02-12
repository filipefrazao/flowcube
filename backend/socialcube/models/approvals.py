from django.conf import settings
from django.db import models


class ApprovalStatus(models.TextChoices):
    PENDING = "pending", "Pending"
    APPROVED = "approved", "Approved"
    REJECTED = "rejected", "Rejected"


class ContentApproval(models.Model):
    post = models.ForeignKey(
        "socialcube.ScheduledPost",
        on_delete=models.CASCADE,
        related_name="approvals",
    )
    reviewer = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="content_reviews",
    )
    status = models.CharField(
        max_length=20,
        choices=ApprovalStatus.choices,
        default=ApprovalStatus.PENDING,
    )
    comment = models.TextField(blank=True)
    reviewed_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ["post", "reviewer"]
        ordering = ["-created_at"]

    def __str__(self):
        return f"Review {self.post_id} by {self.reviewer} - {self.get_status_display()}"
