from django.urls import path, include
from rest_framework.routers import DefaultRouter

from .views import (
    ClassViewSet,
    ContentBlockViewSet,
    EducationFlowViewSet,
    LocationViewSet,
    StudentViewSet,
)

router = DefaultRouter()
router.register("locations", LocationViewSet)
router.register("classes", ClassViewSet)
router.register("students", StudentViewSet)
router.register("flows", EducationFlowViewSet)
router.register("blocks", ContentBlockViewSet)

urlpatterns = [
    path("", include(router.urls)),
]
