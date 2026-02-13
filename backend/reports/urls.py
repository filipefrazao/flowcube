from django.urls import path, include
from rest_framework.routers import DefaultRouter

from .views import (
    ReportDefinitionViewSet,
    ReportExecutionViewSet,
    report_execute,
    report_export,
)

router = DefaultRouter()
router.register("definitions", ReportDefinitionViewSet)
router.register("executions", ReportExecutionViewSet)

urlpatterns = [
    path("execute/<slug:slug>/", report_execute, name="report-execute"),
    path("export/<uuid:execution_id>/", report_export, name="report-export"),
    path("", include(router.urls)),
]
