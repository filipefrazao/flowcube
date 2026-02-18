from rest_framework import viewsets, status, permissions
from rest_framework.decorators import action, api_view, authentication_classes, permission_classes, throttle_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from django.db import models
from django.db.models import Count, Sum, Q
from django.shortcuts import get_object_or_404
from django.utils import timezone
from django.http import HttpResponse
import json

from .models import Page, FormSchema, FormSubmission, CustomDomain, PageTemplate, PageAnalytics
from .serializers import (
    PageListSerializer,
    PageDetailSerializer,
    FormSchemaSerializer,
    FormSubmissionSerializer,
    PublicSubmissionSerializer,
    CustomDomainSerializer,
    PageTemplateSerializer,
    PageAnalyticsSerializer,
)


class PageViewSet(viewsets.ModelViewSet):
    """CRUD for pages"""
    permission_classes = [IsAuthenticated]

    def get_serializer_class(self):
        if self.action == 'list':
            return PageListSerializer
        return PageDetailSerializer

    def get_queryset(self):
        qs = Page.objects.filter(user=self.request.user)
        if self.action == 'list':
            qs = qs.annotate(
                forms_count=Count('forms'),
                total_submissions=Sum('forms__submissions_count')
            )
        return qs

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)

    @action(detail=True, methods=['post'])
    def publish(self, request, pk=None):
        """Publish a page - triggers pre-rendering"""
        page = self.get_object()
        # Import here to avoid circular imports
        from .tasks import render_page
        render_page.delay(page.id)
        page.status = 'published'
        page.published_at = timezone.now()
        page.save(update_fields=['status', 'published_at', 'updated_at'])
        return Response({'status': 'publishing', 'message': 'Page is being rendered'})

    @action(detail=True, methods=['post'])
    def unpublish(self, request, pk=None):
        """Unpublish a page and invalidate cache"""
        page = self.get_object()
        from .services.cache import invalidate_page_cache
        invalidate_page_cache(page.slug)
        page.status = 'draft'
        page.published_at = None
        page.html_cache = ''
        page.css_cache = ''
        page.save(update_fields=['status', 'published_at', 'html_cache', 'css_cache', 'updated_at'])
        return Response({'status': 'unpublished'})

    @action(detail=True, methods=['post'])
    def duplicate(self, request, pk=None):
        """Duplicate a page"""
        original = self.get_object()
        new_page = Page.objects.create(
            user=request.user,
            title=f"{original.title} (Copy)",
            slug=f"{original.slug}-copy-{timezone.now().strftime('%Y%m%d%H%M%S')}",
            puck_data=original.puck_data,
            meta_title=original.meta_title,
            meta_description=original.meta_description,
        )
        # Duplicate forms too
        for form in original.forms.all():
            FormSchema.objects.create(
                page=new_page,
                name=form.name,
                schema=form.schema,
                ui_schema=form.ui_schema,
                conditional_logic=form.conditional_logic,
                distribution_mode=form.distribution_mode,
                distribution_config=form.distribution_config,
            )
        return Response(PageDetailSerializer(new_page).data, status=status.HTTP_201_CREATED)


class FormSchemaViewSet(viewsets.ModelViewSet):
    """CRUD for form schemas"""
    serializer_class = FormSchemaSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return FormSchema.objects.filter(page__user=self.request.user)

    @action(detail=True, methods=['post'])
    def connect_sheets(self, request, pk=None):
        """Connect or update Google Sheets URL for this form."""
        form = self.get_object()
        sheets_url = request.data.get('url', '').strip()
        form.google_sheets_url = sheets_url
        form.save(update_fields=['google_sheets_url', 'updated_at'])
        return Response({'status': 'connected', 'url': sheets_url})

    @action(detail=True, methods=['post'])
    def sync_sheets(self, request, pk=None):
        """Trigger async sync of all submissions to Google Sheets."""
        form = self.get_object()
        if not form.google_sheets_url:
            return Response({'error': 'Nenhuma planilha conectada'}, status=status.HTTP_400_BAD_REQUEST)
        from .tasks import sync_to_google_sheets
        sync_to_google_sheets.delay(form.id)
        return Response({'status': 'syncing'})


class FormSubmissionViewSet(viewsets.ReadOnlyModelViewSet):
    """Read-only for submissions (created via public endpoint)"""
    serializer_class = FormSubmissionSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        qs = FormSubmission.objects.filter(form__page__user=self.request.user).select_related('form', 'form__page')
        # Filter by form
        form_id = self.request.query_params.get('form_id')
        if form_id:
            qs = qs.filter(form_id=form_id)
        # Filter by page
        page_id = self.request.query_params.get('page_id')
        if page_id:
            qs = qs.filter(form__page_id=page_id)
        # Filter by distributed status
        distributed = self.request.query_params.get('distributed')
        if distributed is not None:
            qs = qs.filter(distributed=distributed.lower() == 'true')
        return qs

    @action(detail=True, methods=['post'])
    def redistribute(self, request, pk=None):
        """Retry distribution for a failed submission"""
        submission = self.get_object()
        from .tasks import distribute_submission
        distribute_submission.delay(submission.id)
        return Response({'status': 'redistributing'})


class PageTemplateViewSet(viewsets.ReadOnlyModelViewSet):
    """Read-only templates (admin creates via Django admin)"""
    serializer_class = PageTemplateSerializer
    permission_classes = [IsAuthenticated]
    queryset = PageTemplate.objects.filter(is_public=True)


class CustomDomainViewSet(viewsets.ModelViewSet):
    """CRUD for custom domains"""
    serializer_class = CustomDomainSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return CustomDomain.objects.filter(page__user=self.request.user)

    def perform_destroy(self, instance):
        """Clean up Traefik config and cache when domain is deleted."""
        import os
        if instance.traefik_config_path:
            try:
                os.remove(instance.traefik_config_path)
            except OSError:
                pass
        from .services.cache import invalidate_page_cache
        invalidate_page_cache(f'domain:{instance.domain}')
        instance.delete()

    @action(detail=True, methods=['post'])
    def verify(self, request, pk=None):
        """Check DNS and verify domain"""
        domain_obj = self.get_object()
        from .tasks import verify_domain
        verify_domain.delay(domain_obj.id)
        return Response({'status': 'verifying'})


# PUBLIC ENDPOINTS (no auth)

@api_view(['POST'])
@authentication_classes([])
@permission_classes([AllowAny])
@throttle_classes([])  # We handle our own rate limiting
def public_submit(request, page_slug):
    """
    Public form submission endpoint.
    POST /api/v1/pagecube/submit/{page_slug}/
    """
    # Find the page
    page = get_object_or_404(Page, slug=page_slug, status='published')

    # Validate submission
    serializer = PublicSubmissionSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)

    form_id = serializer.validated_data['form_id']
    data = serializer.validated_data['data']

    # Find the form (must belong to this page and be active)
    form = get_object_or_404(FormSchema, id=form_id, page=page, is_active=True)

    # Extract tracking params
    submission = FormSubmission.objects.create(
        form=form,
        data=data,
        ip_address=get_client_ip(request),
        user_agent=request.META.get('HTTP_USER_AGENT', '')[:500],
        referrer=request.META.get('HTTP_REFERER', '')[:500],
        utm_source=request.query_params.get('utm_source', '')[:255],
        utm_medium=request.query_params.get('utm_medium', '')[:255],
        utm_campaign=request.query_params.get('utm_campaign', '')[:255],
        utm_content=request.query_params.get('utm_content', '')[:255],
        fbclid=request.query_params.get('fbclid', '')[:255],
        gclid=request.query_params.get('gclid', '')[:255],
    )

    # Update submission count
    FormSchema.objects.filter(id=form.id).update(submissions_count=models.F('submissions_count') + 1)

    # Trigger async distribution
    if form.distribution_mode != 'none':
        from .tasks import distribute_submission
        distribute_submission.delay(submission.id)

    return Response({
        'status': 'success',
        'message': form.success_message,
        'redirect_url': form.redirect_url or None,
    }, status=status.HTTP_201_CREATED)


@api_view(['POST'])
@authentication_classes([])
@permission_classes([AllowAny])
@throttle_classes([])
def webhook_submit(request, token):
    """
    External form webhook endpoint.
    POST /api/v1/pagecube/webhook/{token}/
    Receives submissions from external forms (e.g. forms.frzgroup.com.br).
    """
    form = get_object_or_404(FormSchema, webhook_token=token, is_active=True)

    data = request.data
    if not isinstance(data, dict):
        return Response({'error': 'Dados inválidos'}, status=status.HTTP_400_BAD_REQUEST)
    if len(str(data)) > 100000:
        return Response({'error': 'Dados muito grandes'}, status=status.HTTP_400_BAD_REQUEST)

    submission = FormSubmission.objects.create(
        form=form,
        data=data,
        ip_address=get_client_ip(request),
        user_agent=request.META.get('HTTP_USER_AGENT', '')[:500],
        referrer=request.META.get('HTTP_REFERER', '')[:500],
    )

    FormSchema.objects.filter(pk=form.pk).update(submissions_count=models.F('submissions_count') + 1)

    # Trigger distribution if configured
    if form.distribution_mode != 'none':
        from .tasks import distribute_submission
        distribute_submission.delay(submission.id)

    # Trigger Google Sheets append if connected
    if form.google_sheets_url:
        from .tasks import append_submission_to_sheets
        append_submission_to_sheets.delay(submission.id)

    return Response({'success': True, 'id': submission.id}, status=status.HTTP_201_CREATED)


def get_client_ip(request):
    """Extract real client IP (behind Traefik proxy)"""
    x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
    if x_forwarded_for:
        return x_forwarded_for.split(',')[0].strip()
    return request.META.get('REMOTE_ADDR')


@api_view(['GET'])
@authentication_classes([])
@permission_classes([AllowAny])
def serve_page(request, slug):
    """
    Serve a pre-rendered landing page.
    GET /p/{slug}/

    Checks Redis cache first, falls back to DB html_cache,
    rebuilds full HTML from body if needed.
    """
    from .services.cache import get_page_cache, set_page_cache

    # Try Redis cache first
    cached = get_page_cache(slug)
    if cached:
        return HttpResponse(cached, content_type='text/html')

    # Fall back to DB
    page = get_object_or_404(Page, slug=slug, status='published')

    if not page.html_cache:
        return HttpResponse('<h1>Page is being prepared</h1>', status=503)

    # Rebuild full HTML from DB body cache
    from .tasks import _build_full_html
    html = _build_full_html(page)

    # Re-populate Redis cache
    set_page_cache(slug, html)

    return HttpResponse(html, content_type='text/html')


@api_view(['GET'])
@authentication_classes([])
@permission_classes([AllowAny])
def serve_domain_page(request):
    """
    Serve a page via custom domain.
    Traefik routes the custom domain to this view.
    The page is resolved from the Host header.
    """
    host = request.get_host().split(':')[0]  # strip port
    from .services.cache import get_page_cache, set_page_cache

    # Try Redis cache with domain key
    cache_key = f'domain:{host}'
    cached = get_page_cache(cache_key)
    if cached:
        return HttpResponse(cached, content_type='text/html')

    # Look up domain → page
    domain_obj = get_object_or_404(CustomDomain, domain=host, verified=True)
    page = domain_obj.page
    if page.status != 'published' or not page.html_cache:
        return HttpResponse('<h1>Page not available</h1>', status=404)

    from .tasks import _build_full_html
    html = _build_full_html(page)
    set_page_cache(cache_key, html)

    return HttpResponse(html, content_type='text/html')
