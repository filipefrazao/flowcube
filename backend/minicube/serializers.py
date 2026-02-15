from rest_framework import serializers
from django.db.models import Count

from .models import (
    Attendance, Class, ContentBlock, Customer, EducationFlow,
    Enrollment, Location, Pole, Student,
)


class PoleSerializer(serializers.ModelSerializer):
    classes_count = serializers.IntegerField(read_only=True, default=0)
    customers_count = serializers.IntegerField(read_only=True, default=0)
    locations_count = serializers.IntegerField(read_only=True, default=0)
    manager_name = serializers.SerializerMethodField()

    class Meta:
        model = Pole
        fields = [
            "id", "name", "address", "city", "state", "zip_code",
            "phone", "email", "manager", "manager_name", "status",
            "notes", "classes_count", "customers_count", "locations_count",
            "created_at", "updated_at",
        ]

    def get_manager_name(self, obj):
        if obj.manager:
            return obj.manager.get_full_name() or obj.manager.username
        return None


class LocationSerializer(serializers.ModelSerializer):
    pole_name = serializers.SerializerMethodField()

    class Meta:
        model = Location
        fields = [
            "id", "name", "address", "city", "state", "zip_code",
            "phone", "manager", "pole", "pole_name", "active",
            "created_at", "updated_at",
        ]

    def get_pole_name(self, obj):
        return obj.pole.name if obj.pole else None


class CustomerSerializer(serializers.ModelSerializer):
    pole_name = serializers.SerializerMethodField()
    owner_name = serializers.SerializerMethodField()
    enrollments_count = serializers.IntegerField(read_only=True, default=0)

    class Meta:
        model = Customer
        fields = [
            "id", "name", "email", "phone", "cpf", "cnpj",
            "tipo_pessoa", "company", "position", "address", "city",
            "state", "zip_code", "photo_url", "birth_date", "notes",
            "status", "user", "lead", "pole", "pole_name",
            "owner", "owner_name", "enrollments_count",
            "created_at", "updated_at",
        ]

    def get_pole_name(self, obj):
        return obj.pole.name if obj.pole else None

    def get_owner_name(self, obj):
        if obj.owner:
            return obj.owner.get_full_name() or obj.owner.username
        return None


class EnrollmentSerializer(serializers.ModelSerializer):
    student_name = serializers.SerializerMethodField()
    class_name = serializers.SerializerMethodField()
    customer_name = serializers.SerializerMethodField()

    class Meta:
        model = Enrollment
        fields = [
            "id", "student", "student_name", "course_class", "class_name",
            "customer", "customer_name", "status", "notes",
            "enrolled_at", "updated_at",
        ]

    def get_student_name(self, obj):
        return obj.student.name if obj.student else None

    def get_class_name(self, obj):
        return obj.course_class.name if obj.course_class else None

    def get_customer_name(self, obj):
        return obj.customer.name if obj.customer else None


class ClassSerializer(serializers.ModelSerializer):
    location_name = serializers.SerializerMethodField()
    pole_name = serializers.SerializerMethodField()
    product_name = serializers.SerializerMethodField()
    students_count = serializers.IntegerField(read_only=True, default=0)
    enrollments_count = serializers.IntegerField(read_only=True, default=0)

    class Meta:
        model = Class
        fields = [
            "id", "name", "description", "product", "product_name",
            "location", "location_name", "pole", "pole_name",
            "instructor", "start_date", "end_date", "capacity",
            "status", "students_count", "enrollments_count",
            "created_at", "updated_at",
        ]

    def get_location_name(self, obj):
        return obj.location.name if obj.location else None

    def get_pole_name(self, obj):
        return obj.pole.name if obj.pole else None

    def get_product_name(self, obj):
        return obj.product.name if obj.product else None


class StudentSerializer(serializers.ModelSerializer):
    class_name = serializers.SerializerMethodField()
    location_name = serializers.SerializerMethodField()
    customer_name = serializers.SerializerMethodField()

    class Meta:
        model = Student
        fields = [
            "id", "name", "email", "phone", "cpf", "enrollment_date",
            "student_class", "class_name", "location", "location_name",
            "customer", "customer_name", "status",
            "created_at", "updated_at",
        ]

    def get_class_name(self, obj):
        return obj.student_class.name if obj.student_class else None

    def get_location_name(self, obj):
        return obj.location.name if obj.location else None

    def get_customer_name(self, obj):
        return obj.customer.name if obj.customer else None


class AttendanceSerializer(serializers.ModelSerializer):
    student_name = serializers.SerializerMethodField()
    class_name = serializers.SerializerMethodField()

    class Meta:
        model = Attendance
        fields = [
            "id", "enrollment", "date", "present", "notes",
            "recorded_by", "student_name", "class_name",
            "created_at",
        ]

    def get_student_name(self, obj):
        return obj.enrollment.student.name if obj.enrollment else None

    def get_class_name(self, obj):
        return obj.enrollment.course_class.name if obj.enrollment else None


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
