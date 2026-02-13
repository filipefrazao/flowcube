from rest_framework import serializers
from .models import UserGroup, BusinessUnit, Squad, Tag


class UserGroupSerializer(serializers.ModelSerializer):
    user_count = serializers.SerializerMethodField()

    class Meta:
        model = UserGroup
        fields = ["id", "name", "description", "users", "user_count", "created_at"]
        read_only_fields = ["id", "created_at"]

    def get_user_count(self, obj):
        return obj.users.count()


class BusinessUnitSerializer(serializers.ModelSerializer):
    squads_count = serializers.SerializerMethodField()
    manager_name = serializers.CharField(source="manager.get_full_name", read_only=True, default="")

    class Meta:
        model = BusinessUnit
        fields = [
            "id", "name", "address", "city", "state",
            "manager", "manager_name", "active",
            "squads_count", "created_at",
        ]
        read_only_fields = ["id", "created_at"]

    def get_squads_count(self, obj):
        return obj.squads.count()


class SquadSerializer(serializers.ModelSerializer):
    members_count = serializers.SerializerMethodField()
    leader_name = serializers.CharField(source="leader.get_full_name", read_only=True, default="")
    unit_name = serializers.CharField(source="unit.name", read_only=True)

    class Meta:
        model = Squad
        fields = [
            "id", "name", "description", "unit", "unit_name",
            "leader", "leader_name", "members", "members_count",
            "created_at",
        ]
        read_only_fields = ["id", "created_at"]

    def get_members_count(self, obj):
        return obj.members.count()


class TagSerializer(serializers.ModelSerializer):
    class Meta:
        model = Tag
        fields = ["id", "name", "slug", "color", "entity_type", "created_at"]
        read_only_fields = ["id", "created_at"]
