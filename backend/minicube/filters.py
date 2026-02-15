import django_filters

from .models import Attendance, Class, ContentBlock, Customer, EducationFlow, Enrollment, Location, Pole, Student


class PoleFilter(django_filters.FilterSet):
    class Meta:
        model = Pole
        fields = ["status", "state", "city", "manager"]


class LocationFilter(django_filters.FilterSet):
    class Meta:
        model = Location
        fields = ["active", "state", "manager", "pole"]


class CustomerFilter(django_filters.FilterSet):
    tipo_pessoa = django_filters.CharFilter(field_name="tipo_pessoa")
    status = django_filters.CharFilter(field_name="status")
    state = django_filters.CharFilter(field_name="state")
    city = django_filters.CharFilter(field_name="city", lookup_expr="icontains")
    pole = django_filters.UUIDFilter(field_name="pole")
    created_after = django_filters.DateFilter(field_name="created_at", lookup_expr="gte")
    created_before = django_filters.DateFilter(field_name="created_at", lookup_expr="lte")

    class Meta:
        model = Customer
        fields = ["tipo_pessoa", "status", "state", "city", "pole"]


class ClassFilter(django_filters.FilterSet):
    pole = django_filters.UUIDFilter(field_name="pole")
    product = django_filters.UUIDFilter(field_name="product")

    class Meta:
        model = Class
        fields = ["location", "pole", "product", "instructor", "status"]


class EnrollmentFilter(django_filters.FilterSet):
    class Meta:
        model = Enrollment
        fields = ["student", "course_class", "customer", "status"]


class AttendanceFilter(django_filters.FilterSet):
    class Meta:
        model = Attendance
        fields = ["enrollment", "date", "present"]


class StudentFilter(django_filters.FilterSet):
    class Meta:
        model = Student
        fields = ["student_class", "location", "status", "customer"]


class EducationFlowFilter(django_filters.FilterSet):
    class Meta:
        model = EducationFlow
        fields = ["education_class", "active"]


class ContentBlockFilter(django_filters.FilterSet):
    class Meta:
        model = ContentBlock
        fields = ["flow", "type"]
