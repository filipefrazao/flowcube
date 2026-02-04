from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views

app_name = 'marketplace'

router = DefaultRouter()
router.register(r'categories', views.TemplateCategoryViewSet, basename='category')
router.register(r'templates', views.TemplateViewSet, basename='template')
router.register(r'purchases', views.TemplatePurchaseViewSet, basename='purchase')
router.register(r'reviews', views.TemplateReviewViewSet, basename='review')
router.register(r'versions', views.TemplateVersionViewSet, basename='version')

urlpatterns = [
    path('', include(router.urls)),
]
