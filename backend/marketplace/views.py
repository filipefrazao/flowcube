from django.utils import timezone
from rest_framework import viewsets, status, filters
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, IsAuthenticatedOrReadOnly
from django_filters.rest_framework import DjangoFilterBackend
from .models import TemplateCategory, Template, TemplatePurchase, TemplateReview, TemplateVersion, TemplateDownload
from .serializers import *


class TemplateCategoryViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = TemplateCategory.objects.filter(is_active=True)
    serializer_class = TemplateCategorySerializer
    lookup_field = 'slug'


class TemplateViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticatedOrReadOnly]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['category', 'pricing_type', 'is_featured']
    search_fields = ['name', 'description']
    ordering_fields = ['created_at', 'rating_avg', 'downloads_count']
    lookup_field = 'slug'

    def get_queryset(self):
        qs = Template.objects.select_related('creator', 'category')
        if self.action == 'list':
            return qs.filter(is_published=True)
        return qs

    def get_serializer_class(self):
        if self.action == 'list':
            return TemplateListSerializer
        return TemplateDetailSerializer

    def perform_create(self, serializer):
        serializer.save(creator=self.request.user)

    @action(detail=True, methods=['post'])
    def publish(self, request, slug=None):
        template = self.get_object()
        if template.creator != request.user:
            return Response({'error': 'Only creator can publish'}, status=403)
        template.is_published = True
        template.published_at = timezone.now()
        template.save()
        return Response(self.get_serializer(template).data)

    @action(detail=True, methods=['post'], permission_classes=[IsAuthenticated])
    def download(self, request, slug=None):
        template = self.get_object()
        if template.pricing_type == Template.PricingType.PAID:
            purchased = TemplatePurchase.objects.filter(
                template=template, buyer=request.user,
                status=TemplatePurchase.Status.COMPLETED
            ).exists()
            if not purchased:
                return Response({'error': 'Purchase required'}, status=402)
        download = TemplateDownload.objects.create(template=template, user=request.user)
        template.increment_downloads()
        return Response({'workflow_data': template.workflow_data, 'download_id': download.id})

    @action(detail=False, methods=['get'])
    def featured(self, request):
        templates = Template.objects.filter(is_published=True, is_featured=True)[:12]
        return Response(TemplateListSerializer(templates, many=True, context={'request': request}).data)


class TemplatePurchaseViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated]
    serializer_class = TemplatePurchaseSerializer

    def get_queryset(self):
        return TemplatePurchase.objects.filter(buyer=self.request.user)

    def perform_create(self, serializer):
        purchase = serializer.save(buyer=self.request.user)
        if purchase.amount == 0:
            purchase.status = TemplatePurchase.Status.COMPLETED
            purchase.completed_at = timezone.now()
            purchase.save()


class TemplateReviewViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticatedOrReadOnly]
    serializer_class = TemplateReviewSerializer
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ['template', 'rating']

    def get_queryset(self):
        return TemplateReview.objects.filter(is_published=True)

    def perform_create(self, serializer):
        template = serializer.validated_data['template']
        purchased = TemplatePurchase.objects.filter(
            template=template, buyer=self.request.user,
            status=TemplatePurchase.Status.COMPLETED
        ).exists()
        serializer.save(user=self.request.user, is_verified_purchase=purchased)


class TemplateVersionViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = TemplateVersion.objects.all()
    serializer_class = TemplateVersionSerializer
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ['template']
