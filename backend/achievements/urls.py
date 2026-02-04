from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import AchievementViewSet, UserProgressViewSet

router = DefaultRouter()
router.register(r'achievements', AchievementViewSet, basename='achievement')
router.register(r'progress', UserProgressViewSet, basename='progress')

urlpatterns = [
    path('', include(router.urls)),
]
