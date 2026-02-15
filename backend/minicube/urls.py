from django.urls import path, include
from rest_framework.routers import DefaultRouter

from .views import (
    AttendanceViewSet,
    ClassViewSet,
    ContentBlockViewSet,
    CustomerViewSet,
    EducationFlowViewSet,
    EnrollmentViewSet,
    LocationViewSet,
    PoleViewSet,
    StudentViewSet,
)

router = DefaultRouter()
router.register("poles", PoleViewSet, basename="pole")
router.register("locations", LocationViewSet)
router.register("customers", CustomerViewSet, basename="customer")
router.register("classes", ClassViewSet, basename="class")
router.register("enrollments", EnrollmentViewSet, basename="enrollment")
router.register("attendances", AttendanceViewSet, basename="attendance")
router.register("students", StudentViewSet)
router.register("flows", EducationFlowViewSet)
router.register("blocks", ContentBlockViewSet)

urlpatterns = [
    path("", include(router.urls)),
]
