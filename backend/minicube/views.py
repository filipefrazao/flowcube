from django.db.models import Count
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import viewsets
from rest_framework.filters import OrderingFilter, SearchFilter
from rest_framework.permissions import IsAuthenticated

from .filters import (
    ClassFilter,
    ContentBlockFilter,
    EducationFlowFilter,
    LocationFilter,
    StudentFilter,
)
from .models import Class, ContentBlock, EducationFlow, Location, Student
from .serializers import (
    ClassSerializer,
    ContentBlockSerializer,
    EducationFlowSerializer,
    LocationSerializer,
    StudentSerializer,
)


class LocationViewSet(viewsets.ModelViewSet):
    queryset = Location.objects.all()
    serializer_class = LocationSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_class = LocationFilter
    search_fields = ["name", "city", "address"]
    ordering_fields = ["name", "city", "created_at"]


class ClassViewSet(viewsets.ModelViewSet):
    queryset = Class.objects.select_related("location", "instructor")
    serializer_class = ClassSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_class = ClassFilter
    search_fields = ["name", "description"]
    ordering_fields = ["name", "start_date", "created_at"]

    def get_queryset(self):
        return Class.objects.select_related(
            "location", "instructor"
        ).annotate(students_count=Count("students"))


class StudentViewSet(viewsets.ModelViewSet):
    queryset = Student.objects.select_related("student_class", "location")
    serializer_class = StudentSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_class = StudentFilter
    search_fields = ["name", "email", "phone", "cpf"]
    ordering_fields = ["name", "enrollment_date", "created_at"]


class EducationFlowViewSet(viewsets.ModelViewSet):
    queryset = EducationFlow.objects.select_related("education_class").prefetch_related("blocks")
    serializer_class = EducationFlowSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_class = EducationFlowFilter
    search_fields = ["name", "description"]
    ordering_fields = ["name", "created_at"]


class ContentBlockViewSet(viewsets.ModelViewSet):
    queryset = ContentBlock.objects.select_related("flow")
    serializer_class = ContentBlockSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, OrderingFilter]
    filterset_class = ContentBlockFilter
    ordering_fields = ["order", "created_at"]
