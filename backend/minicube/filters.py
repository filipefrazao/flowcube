import django_filters

from .models import Class, ContentBlock, EducationFlow, Location, Student


class LocationFilter(django_filters.FilterSet):
    class Meta:
        model = Location
        fields = ["active", "state", "manager"]


class ClassFilter(django_filters.FilterSet):
    class Meta:
        model = Class
        fields = ["location", "instructor", "status"]


class StudentFilter(django_filters.FilterSet):
    class Meta:
        model = Student
        fields = ["student_class", "location", "status"]


class EducationFlowFilter(django_filters.FilterSet):
    class Meta:
        model = EducationFlow
        fields = ["education_class", "active"]


class ContentBlockFilter(django_filters.FilterSet):
    class Meta:
        model = ContentBlock
        fields = ["flow", "type"]
