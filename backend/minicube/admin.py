from django.contrib import admin

from .models import (
    Attendance, Class, ContentBlock, Customer, EducationFlow,
    Enrollment, Location, Pole, Student,
)


@admin.register(Pole)
class PoleAdmin(admin.ModelAdmin):
    list_display = ["name", "city", "state", "status", "manager"]
    list_filter = ["status", "state"]
    search_fields = ["name", "city"]


@admin.register(Location)
class LocationAdmin(admin.ModelAdmin):
    list_display = ["name", "city", "state", "pole", "manager", "active"]
    list_filter = ["active", "state", "pole"]
    search_fields = ["name", "city"]


@admin.register(Customer)
class CustomerAdmin(admin.ModelAdmin):
    list_display = ["name", "email", "phone", "cpf", "tipo_pessoa", "city", "state", "status"]
    list_filter = ["status", "tipo_pessoa", "state", "pole"]
    search_fields = ["name", "email", "phone", "cpf", "cnpj"]


@admin.register(Class)
class ClassAdmin(admin.ModelAdmin):
    list_display = ["name", "product", "location", "pole", "instructor", "start_date", "end_date", "status", "capacity"]
    list_filter = ["status", "location", "pole"]
    search_fields = ["name"]


@admin.register(Enrollment)
class EnrollmentAdmin(admin.ModelAdmin):
    list_display = ["student", "course_class", "customer", "status", "enrolled_at"]
    list_filter = ["status", "course_class"]
    search_fields = ["student__name", "course_class__name"]


@admin.register(Student)
class StudentAdmin(admin.ModelAdmin):
    list_display = ["name", "email", "phone", "cpf", "student_class", "location", "customer", "status"]
    list_filter = ["status", "location"]
    search_fields = ["name", "email", "phone", "cpf"]


@admin.register(Attendance)
class AttendanceAdmin(admin.ModelAdmin):
    list_display = ["enrollment", "date", "present", "recorded_by"]
    list_filter = ["present", "date"]
    search_fields = ["enrollment__student__name"]


@admin.register(EducationFlow)
class EducationFlowAdmin(admin.ModelAdmin):
    list_display = ["name", "education_class", "active"]
    list_filter = ["active"]
    search_fields = ["name"]


@admin.register(ContentBlock)
class ContentBlockAdmin(admin.ModelAdmin):
    list_display = ["title", "flow", "type", "order", "duration_minutes"]
    list_filter = ["type"]
    ordering = ["flow", "order"]
