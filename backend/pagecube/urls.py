from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views

router = DefaultRouter()
router.register(r'pages', views.PageViewSet, basename='pagecube-pages')
router.register(r'forms', views.FormSchemaViewSet, basename='pagecube-forms')
router.register(r'submissions', views.FormSubmissionViewSet, basename='pagecube-submissions')
router.register(r'templates', views.PageTemplateViewSet, basename='pagecube-templates')
router.register(r'domains', views.CustomDomainViewSet, basename='pagecube-domains')

urlpatterns = [
    path('', include(router.urls)),
    path('submit/<slug:page_slug>/', views.public_submit, name='pagecube-public-submit'),
    path('webhook/<uuid:token>/', views.webhook_submit, name='pagecube-webhook-submit'),
]

# Public page serving routes (mounted at project-level urls.py):
# - /p/<slug>/  → views.serve_page (slug-based)
# - /           → views.serve_domain_page (custom domain, resolved via Host header)
#
# Traefik config for custom domains routes to serve_domain_page
# which looks up the page from the Host header via CustomDomain model.
