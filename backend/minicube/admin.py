from django.contrib import admin

from .models import Class, ContentBlock, EducationFlow, Location, Student


@admin.register(Location)
class LocationAdmin(admin.ModelAdmin):
    list_display = ["name", "city", "state", "manager", "active"]
    list_filter = ["active", "state"]
    search_fields = ["name", "city"]


@admin.register(Class)
class ClassAdmin(admin.ModelAdmin):
    list_display = ["name", "location", "instructor", "start_date", "end_date", "status", "capacity"]
    list_filter = ["status", "location"]
    search_fields = ["name"]


@admin.register(Student)
class StudentAdmin(admin.ModelAdmin):
    list_display = ["name", "email", "phone", "cpf", "student_class", "location", "status"]
    list_filter = ["status", "location"]
    search_fields = ["name", "email", "phone", "cpf"]


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
