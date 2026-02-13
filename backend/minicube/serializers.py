from rest_framework import serializers
from django.db.models import Count

from .models import Class, ContentBlock, EducationFlow, Location, Student


class LocationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Location
        fields = [
            "id", "name", "address", "city", "state", "zip_code",
            "phone", "manager", "active", "created_at", "updated_at",
        ]


class ClassSerializer(serializers.ModelSerializer):
    location_name = serializers.SerializerMethodField()
    students_count = serializers.IntegerField(read_only=True, default=0)

    class Meta:
        model = Class
        fields = [
            "id", "name", "description", "location", "location_name",
            "instructor", "start_date", "end_date", "capacity",
            "status", "students_count", "created_at", "updated_at",
        ]

    def get_location_name(self, obj):
        return obj.location.name if obj.location else None


class StudentSerializer(serializers.ModelSerializer):
    class_name = serializers.SerializerMethodField()
    location_name = serializers.SerializerMethodField()

    class Meta:
        model = Student
        fields = [
            "id", "name", "email", "phone", "cpf", "enrollment_date",
            "student_class", "class_name", "location", "location_name",
            "status", "created_at", "updated_at",
        ]

    def get_class_name(self, obj):
        return obj.student_class.name if obj.student_class else None

    def get_location_name(self, obj):
        return obj.location.name if obj.location else None


class ContentBlockSerializer(serializers.ModelSerializer):
    class Meta:
        model = ContentBlock
        fields = [
            "id", "flow", "title", "type", "content", "order",
            "duration_minutes", "created_at", "updated_at",
        ]


class EducationFlowSerializer(serializers.ModelSerializer):
    blocks = ContentBlockSerializer(many=True, read_only=True)

    class Meta:
        model = EducationFlow
        fields = [
            "id", "name", "description", "education_class", "active",
            "blocks", "created_at", "updated_at",
        ]
