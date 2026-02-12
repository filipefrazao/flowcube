from rest_framework import serializers
from socialcube.models import ContentApproval


class ContentApprovalSerializer(serializers.ModelSerializer):
    reviewer_name = serializers.CharField(source="reviewer.get_full_name", read_only=True)
    post_title = serializers.CharField(source="post.title", read_only=True)

    class Meta:
        model = ContentApproval
        fields = [
            "id", "post", "post_title", "reviewer", "reviewer_name",
            "status", "comment", "reviewed_at", "created_at",
        ]
        read_only_fields = ["id", "reviewer", "reviewer_name", "reviewed_at", "created_at"]
