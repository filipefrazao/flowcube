"""Lead Ads management API: connections, forms, leads, config."""

import logging

from django.db.models import Q

from rest_framework import status, viewsets
from rest_framework.decorators import action, api_view
from rest_framework.pagination import PageNumberPagination
from rest_framework.response import Response

from socialcube.models import (
    LeadAdsAppConfig, LeadAdsConnection, LeadAdsForm, LeadEntry, SocialAccount,
)
from socialcube.serializers import (
    LeadAdsAppConfigSerializer, LeadAdsConnectionSerializer,
    LeadAdsConnectionCreateSerializer, LeadAdsFormSerializer,
    LeadEntrySerializer, LeadEntryListSerializer,
)
from socialcube.services.leadads import (
    subscribe_page_to_leadgen, unsubscribe_page_from_leadgen,
    get_page_access_token, get_user_pages, get_page_leadgen_forms,
)

logger = logging.getLogger(__name__)


class LeadsPagination(PageNumberPagination):
    page_size = 25
    page_size_query_param = "page_size"
    max_page_size = 100


class LeadAdsConnectionViewSet(viewsets.ModelViewSet):
    serializer_class = LeadAdsConnectionSerializer
    http_method_names = ["get", "post", "delete"]

    def get_queryset(self):
        return LeadAdsConnection.objects.filter(
            Q(social_account__user=self.request.user) | Q(social_account__isnull=True)
        ).select_related("social_account")

    def create(self, request):
        """Connect a Facebook page to lead ads."""
        ser = LeadAdsConnectionCreateSerializer(data=request.data)
        ser.is_valid(raise_exception=True)

        account_id = ser.validated_data["social_account_id"]
        page_id = ser.validated_data["page_id"]

        try:
            account = SocialAccount.objects.get(id=account_id, user=request.user)
        except SocialAccount.DoesNotExist:
            return Response({"error": "Account not found"}, status=status.HTTP_404_NOT_FOUND)

        # Get page access token
        user_token = account.access_token
        try:
            page_token = get_page_access_token(page_id, user_token)
        except Exception as e:
            return Response({"error": f"Failed to get page token: {e}"}, status=status.HTTP_400_BAD_REQUEST)

        # Get page name from user's pages
        page_name = page_id
        try:
            pages = get_user_pages(user_token)
            for p in pages:
                if p["id"] == page_id:
                    page_name = p["name"]
                    break
        except Exception:
            pass

        # Subscribe to leadgen
        try:
            subscribe_page_to_leadgen(page_id, page_token)
        except Exception as e:
            return Response({"error": f"Failed to subscribe: {e}"}, status=status.HTTP_400_BAD_REQUEST)

        # Create or update connection
        conn, created = LeadAdsConnection.objects.update_or_create(
            page_id=page_id,
            defaults={
                "social_account": account,
                "page_name": page_name,
                "is_subscribed": True,
            },
        )
        conn.page_access_token = page_token
        conn.save(update_fields=["_page_access_token"])

        # Auto-discover forms
        try:
            forms = get_page_leadgen_forms(page_id, page_token)
            for f in forms:
                LeadAdsForm.objects.get_or_create(
                    form_id=f["id"],
                    defaults={
                        "connection": conn,
                        "form_name": f.get("name", ""),
                        "form_status": f.get("status", "active").lower(),
                    },
                )
        except Exception as e:
            logger.warning(f"Failed to discover forms for page {page_id}: {e}")

        return Response(
            LeadAdsConnectionSerializer(conn).data,
            status=status.HTTP_201_CREATED if created else status.HTTP_200_OK,
        )

    def destroy(self, request, pk=None):
        """Disconnect a page from lead ads."""
        conn = self.get_object()
        try:
            unsubscribe_page_from_leadgen(conn.page_id, conn.page_access_token)
        except Exception as e:
            logger.warning(f"Failed to unsubscribe page {conn.page_id}: {e}")

        conn.is_subscribed = False
        conn.save(update_fields=["is_subscribed"])
        return Response(status=status.HTTP_204_NO_CONTENT)

    @action(detail=True, methods=["get"])
    def forms(self, request, pk=None):
        """List forms for a connection."""
        conn = self.get_object()
        forms = LeadAdsForm.objects.filter(connection=conn)
        return Response(LeadAdsFormSerializer(forms, many=True).data)

    @action(detail=True, methods=["post"])
    def sync_forms(self, request, pk=None):
        """Re-fetch forms from Facebook."""
        conn = self.get_object()
        try:
            forms = get_page_leadgen_forms(conn.page_id, conn.page_access_token)
            created_count = 0
            for f in forms:
                _, created = LeadAdsForm.objects.update_or_create(
                    form_id=f["id"],
                    defaults={
                        "connection": conn,
                        "form_name": f.get("name", ""),
                        "form_status": f.get("status", "active").lower(),
                    },
                )
                if created:
                    created_count += 1
            return Response({"synced": len(forms), "new": created_count})
        except Exception as e:
            return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)


class LeadAdsFormViewSet(viewsets.ModelViewSet):
    serializer_class = LeadAdsFormSerializer
    http_method_names = ["get", "put", "patch"]

    def get_queryset(self):
        return LeadAdsForm.objects.filter(
            Q(connection__social_account__user=self.request.user)
            | Q(connection__social_account__isnull=True)
        ).select_related("connection")


class LeadEntryViewSet(viewsets.ReadOnlyModelViewSet):
    pagination_class = LeadsPagination

    def get_serializer_class(self):
        if self.action == "list":
            return LeadEntryListSerializer
        return LeadEntrySerializer

    def get_queryset(self):
        qs = LeadEntry.objects.filter(
            Q(form__connection__social_account__user=self.request.user)
            | Q(form__connection__social_account__isnull=True)
        ).select_related("form")

        # Filters
        form_id = self.request.query_params.get("form")
        if form_id:
            qs = qs.filter(form_id=form_id)

        distributed = self.request.query_params.get("distributed")
        if distributed is not None:
            qs = qs.filter(distributed=distributed.lower() in ("true", "1"))

        return qs

    @action(detail=True, methods=["post"])
    def redistribute(self, request, pk=None):
        """Retry distribution for a lead."""
        from socialcube.tasks import distribute_lead

        entry = self.get_object()
        if entry.form.distribution_mode == "none":
            return Response({"error": "No distribution configured"}, status=status.HTTP_400_BAD_REQUEST)

        distribute_lead.delay(entry.id)
        return Response({"status": "queued"})


@api_view(["GET"])
def available_pages(request):
    """List Facebook pages available for connection."""
    accounts = SocialAccount.objects.filter(
        user=request.user,
        platform__in=["facebook", "instagram"],
        is_active=True,
    )

    all_pages = []
    existing_page_ids = set(
        LeadAdsConnection.objects.filter(is_subscribed=True).values_list("page_id", flat=True)
    )

    for account in accounts:
        try:
            pages = get_user_pages(account.access_token)
            for p in pages:
                p["account_id"] = account.id
                p["account_username"] = account.username
                p["already_connected"] = p["id"] in existing_page_ids
            all_pages.extend(pages)
        except Exception as e:
            logger.warning(f"Failed to get pages for account {account.id}: {e}")

    # Deduplicate by page_id
    seen = set()
    unique_pages = []
    for p in all_pages:
        if p["id"] not in seen:
            seen.add(p["id"])
            unique_pages.append({
                "id": p["id"],
                "name": p["name"],
                "account_id": p["account_id"],
                "account_username": p["account_username"],
                "already_connected": p["already_connected"],
            })

    return Response(unique_pages)


@api_view(["GET", "POST"])
def leadads_config(request):
    """Get or save Lead Ads app configuration."""
    if request.method == "GET":
        config = LeadAdsAppConfig.get_config()
        if not config:
            return Response({
                "app_id": "",
                "verify_token": "",
                "webhook_url": "",
                "has_secret": False,
            })
        return Response(LeadAdsAppConfigSerializer(config).data)

    # POST: save config
    config = LeadAdsAppConfig.get_config()
    if config:
        ser = LeadAdsAppConfigSerializer(config, data=request.data, partial=True)
    else:
        ser = LeadAdsAppConfigSerializer(data=request.data)
    ser.is_valid(raise_exception=True)
    ser.save()
    return Response(ser.data, status=status.HTTP_200_OK)
