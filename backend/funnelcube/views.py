import secrets
from datetime import timedelta
from urllib.parse import urlparse

from django.db.models import Avg, Count, Sum, Q
from django.utils import timezone
from rest_framework import viewsets, status
from rest_framework.decorators import api_view, permission_classes, authentication_classes, throttle_classes, action
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.response import Response

from .models import (
    AnalyticsClient,
    AnalyticsDashboard,
    AnalyticsEvent,
    AnalyticsEventMeta,
    AnalyticsNotificationRule,
    AnalyticsProfile,
    AnalyticsProject,
    AnalyticsReference,
    AnalyticsReport,
    AnalyticsSession,
)
from .serializers import (
    AnalyticsClientSerializer,
    AnalyticsDashboardSerializer,
    AnalyticsEventMetaSerializer,
    AnalyticsEventSerializer,
    AnalyticsNotificationRuleSerializer,
    AnalyticsProfileSerializer,
    AnalyticsProjectSerializer,
    AnalyticsReferenceSerializer,
    AnalyticsReportSerializer,
    IdentifySerializer,
    TrackEventSerializer,
)
from .services.device_id import generate_device_id, get_daily_salt
from .services.event_buffer import push_event
from .services.session_manager import get_or_create_session


# ============================================================================
# Project Management + Analytics Queries
# ============================================================================


class ProjectViewSet(viewsets.ModelViewSet):
    serializer_class = AnalyticsProjectSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return AnalyticsProject.objects.filter(owner=self.request.user)

    def perform_create(self, serializer):
        serializer.save(owner=self.request.user)

    # --- Helper ---

    def _parse_range(self, request):
        days = int(request.query_params.get("days", 7))
        end = timezone.now()
        start = end - timedelta(days=days)
        return start, end, days

    # --- Overview KPIs ---

    @action(detail=True, methods=["get"])
    def overview(self, request, pk=None):
        """GET /projects/{id}/overview/?days=7"""
        project = self.get_object()
        start, end, _ = self._parse_range(request)

        events = AnalyticsEvent.objects.filter(
            project=project, created_at__gte=start, created_at__lte=end
        )
        sessions = AnalyticsSession.objects.filter(
            project=project, created_at__gte=start, created_at__lte=end
        )

        total_events = events.count()
        total_sessions = sessions.count()
        unique_visitors = sessions.values("device_id").distinct().count()
        total_pageviews = events.filter(name="screen_view").count()
        bounce_count = sessions.filter(is_bounce=True).count()
        bounce_rate = (bounce_count / total_sessions * 100) if total_sessions > 0 else 0
        avg_duration = 0
        if total_sessions > 0:
            duration_sum = sessions.aggregate(total=Sum("duration"))["total"] or 0
            avg_duration = duration_sum / total_sessions
        total_revenue = events.aggregate(total=Sum("revenue"))["total"] or 0

        return Response({
            "visitors": unique_visitors,
            "sessions": total_sessions,
            "pageviews": total_pageviews,
            "events": total_events,
            "bounce_rate": round(bounce_rate, 1),
            "avg_duration": round(avg_duration),
            "revenue": total_revenue,
        })

    # --- Time-Series Charts ---

    @action(detail=True, methods=["get"], url_path="chart")
    def chart(self, request, pk=None):
        """GET /projects/{id}/chart/?events=screen_view,signup&interval=day&days=7"""
        project = self.get_object()
        from .services.chart_engine import ChartEngine

        events_param = request.query_params.get("events", "screen_view")
        events_list = [e.strip() for e in events_param.split(",") if e.strip()]
        interval = request.query_params.get("interval", "day")
        days = int(request.query_params.get("days", 7))
        metric = request.query_params.get("metric", "count")
        breakdown = request.query_params.get("breakdown")

        engine = ChartEngine(str(project.id), project.timezone)
        data = engine.query_time_series(
            events=events_list,
            interval=interval,
            range_days=days,
            metric=metric,
            breakdown=breakdown,
        )
        return Response(data)

    # --- Top Sources ---

    @action(detail=True, methods=["get"], url_path="top-sources")
    def top_sources(self, request, pk=None):
        """GET /projects/{id}/top-sources/?days=7&limit=10"""
        project = self.get_object()
        from .services.chart_engine import ChartEngine

        days = int(request.query_params.get("days", 7))
        limit = int(request.query_params.get("limit", 10))

        engine = ChartEngine(str(project.id), project.timezone)
        return Response(engine.get_top_sources(days=days, limit=limit))

    # --- Top Pages ---

    @action(detail=True, methods=["get"], url_path="top-pages")
    def top_pages(self, request, pk=None):
        """GET /projects/{id}/top-pages/?days=7&limit=10"""
        project = self.get_object()
        from .services.chart_engine import ChartEngine

        days = int(request.query_params.get("days", 7))
        limit = int(request.query_params.get("limit", 10))

        engine = ChartEngine(str(project.id), project.timezone)
        return Response(engine.get_top_pages(days=days, limit=limit))

    # --- Top Geo ---

    @action(detail=True, methods=["get"], url_path="top-geo")
    def top_geo(self, request, pk=None):
        """GET /projects/{id}/top-geo/?days=7&limit=10"""
        project = self.get_object()
        from .services.chart_engine import ChartEngine

        days = int(request.query_params.get("days", 7))
        limit = int(request.query_params.get("limit", 10))

        engine = ChartEngine(str(project.id), project.timezone)
        return Response(engine.get_top_geo(days=days, limit=limit))

    # --- Devices ---

    @action(detail=True, methods=["get"], url_path="devices")
    def devices(self, request, pk=None):
        """GET /projects/{id}/devices/?days=7"""
        project = self.get_object()
        from .services.chart_engine import ChartEngine

        days = int(request.query_params.get("days", 7))

        engine = ChartEngine(str(project.id), project.timezone)
        return Response(engine.get_devices(days=days))

    # --- Events List ---

    @action(detail=True, methods=["get"], url_path="events-list")
    def events_list(self, request, pk=None):
        """GET /projects/{id}/events-list/?days=7&limit=20"""
        project = self.get_object()
        from .services.chart_engine import ChartEngine

        days = int(request.query_params.get("days", 7))
        limit = int(request.query_params.get("limit", 20))

        engine = ChartEngine(str(project.id), project.timezone)
        return Response(engine.get_events_list(days=days, limit=limit))

    # --- Funnel ---

    @action(detail=True, methods=["post"], url_path="funnel")
    def funnel(self, request, pk=None):
        """POST /projects/{id}/funnel/
        Body: {"steps": ["screen_view", "signup", "purchase"], "window_hours": 24}
        """
        project = self.get_object()
        from .services.funnel_service import FunnelService

        data = request.data
        steps = data.get("steps", [])
        window_hours = data.get("window_hours", 24)

        start, end, _ = self._parse_range(request)

        service = FunnelService(str(project.id))
        result = service.calculate_funnel(
            steps=steps,
            window_hours=window_hours,
            start_date=start,
            end_date=end,
        )
        return Response(result)

    # --- Retention ---

    @action(detail=True, methods=["get"], url_path="retention")
    def retention(self, request, pk=None):
        """GET /projects/{id}/retention/?event=screen_view&interval=day&days=30"""
        project = self.get_object()
        from .services.retention_service import RetentionService

        event = request.query_params.get("event", "screen_view")
        interval = request.query_params.get("interval", "day")
        days = int(request.query_params.get("days", 30))

        service = RetentionService()
        result = service.calculate_retention(
            project_id=str(project.id),
            event_name=event,
            cohort_interval=interval,
            lookback_days=days,
        )
        return Response(result)

    # --- Conversion ---

    @action(detail=True, methods=["get"], url_path="conversion")
    def conversion(self, request, pk=None):
        """GET /projects/{id}/conversion/?event=purchase&breakdown=utm_source&days=7"""
        project = self.get_object()
        from .services.conversion_service import ConversionService

        event = request.query_params.get("event", "purchase")
        breakdown = request.query_params.get("breakdown")
        days = int(request.query_params.get("days", 7))

        service = ConversionService(str(project.id))
        result = service.calculate(
            event_name=event,
            breakdown=breakdown,
            days=days,
        )
        return Response(result)

    # --- Sankey / User Flow ---

    @action(detail=True, methods=["get"], url_path="flow")
    def flow(self, request, pk=None):
        """GET /projects/{id}/flow/?max_steps=5&min_freq=3&days=7"""
        project = self.get_object()
        from .services.sankey_service import SankeyService

        max_steps = int(request.query_params.get("max_steps", 5))
        min_freq = int(request.query_params.get("min_freq", 3))
        days = int(request.query_params.get("days", 7))

        service = SankeyService(str(project.id))
        result = service.generate_flow(
            max_steps=max_steps,
            min_frequency=min_freq,
            days=days,
        )
        return Response(result)


# ============================================================================
# API Keys
# ============================================================================


class ClientViewSet(viewsets.ModelViewSet):
    serializer_class = AnalyticsClientSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return AnalyticsClient.objects.filter(project__owner=self.request.user)

    def perform_create(self, serializer):
        serializer.save(
            client_id=f"fc_{secrets.token_hex(16)}",
            client_secret=f"fcs_{secrets.token_hex(24)}",
        )


# ============================================================================
# Event Ingestion (public endpoint, auth via client_id/client_secret)
# ============================================================================


def _parse_user_agent(ua_string):
    ua_string = ua_string or ""
    ua_lower = ua_string.lower()
    browser = ""
    os_name = ""
    device = "desktop"

    if "chrome" in ua_lower and "edg" not in ua_lower:
        browser = "Chrome"
    elif "firefox" in ua_lower:
        browser = "Firefox"
    elif "safari" in ua_lower and "chrome" not in ua_lower:
        browser = "Safari"
    elif "edg" in ua_lower:
        browser = "Edge"
    else:
        browser = "Other"

    if "windows" in ua_lower:
        os_name = "Windows"
    elif "mac" in ua_lower:
        os_name = "macOS"
    elif "linux" in ua_lower:
        os_name = "Linux"
    elif "android" in ua_lower:
        os_name = "Android"
        device = "mobile"
    elif "iphone" in ua_lower or "ipad" in ua_lower:
        os_name = "iOS"
        device = "mobile"

    if "mobile" in ua_lower or "android" in ua_lower:
        device = "mobile"
    elif "tablet" in ua_lower or "ipad" in ua_lower:
        device = "tablet"

    return browser, os_name, device


def _parse_referrer(referrer, origin):
    if not referrer:
        return "", "direct"
    try:
        ref_parsed = urlparse(referrer)
        origin_parsed = urlparse(origin) if origin else None
        ref_host = ref_parsed.hostname or ""
        if origin_parsed and ref_host == (origin_parsed.hostname or ""):
            return ref_host, "internal"
        if "google" in ref_host:
            return "Google", "search"
        if "facebook" in ref_host or "fb.com" in ref_host:
            return "Facebook", "social"
        if "instagram" in ref_host:
            return "Instagram", "social"
        if "twitter" in ref_host or "x.com" in ref_host:
            return "X/Twitter", "social"
        if "linkedin" in ref_host:
            return "LinkedIn", "social"
        if "youtube" in ref_host:
            return "YouTube", "social"
        if "bing" in ref_host:
            return "Bing", "search"
        return ref_host, "referral"
    except Exception:
        return referrer[:100], "referral"


@api_view(["POST"])
@authentication_classes([])
@permission_classes([AllowAny])
@throttle_classes([])
def track_event(request):
    client_id = request.headers.get("X-Client-ID", "")
    client_secret = request.headers.get("X-Client-Secret", "")

    if not client_id or not client_secret:
        return Response(
            {"error": "Missing X-Client-ID or X-Client-Secret"},
            status=status.HTTP_401_UNAUTHORIZED,
        )

    try:
        client = AnalyticsClient.objects.select_related("project").get(
            client_id=client_id, client_secret=client_secret, is_active=True
        )
    except AnalyticsClient.DoesNotExist:
        return Response(
            {"error": "Invalid credentials"},
            status=status.HTTP_401_UNAUTHORIZED,
        )

    serializer = TrackEventSerializer(data=request.data)
    if not serializer.is_valid():
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    data = serializer.validated_data
    project = client.project

    # Extract request metadata
    ip = request.META.get("HTTP_X_FORWARDED_FOR", request.META.get("REMOTE_ADDR", ""))
    if "," in ip:
        ip = ip.split(",")[0].strip()
    user_agent = request.META.get("HTTP_USER_AGENT", "")

    # Device fingerprint
    salt = get_daily_salt(project)
    device_id = generate_device_id(ip, user_agent, salt)

    # Session
    session_id = get_or_create_session(
        project_id=project.id,
        device_id=device_id,
        profile_id=data.get("profile_id", ""),
    )

    # Parse user agent
    browser, os_name, device_type = _parse_user_agent(user_agent)

    # GeoIP resolution
    from .services.geo_service import resolve_ip
    geo = resolve_ip(ip)

    # Parse referrer
    referrer = data.get("referrer", "")
    origin = data.get("origin", "")
    referrer_name, referrer_type = _parse_referrer(referrer, origin)

    # Parse URL for path
    path = data.get("path", "")
    if not path and origin:
        try:
            path = urlparse(origin).path or "/"
        except Exception:
            path = "/"

    # Parse UTMs from origin URL
    utm_source = ""
    utm_medium = ""
    utm_campaign = ""
    if origin:
        try:
            from urllib.parse import parse_qs
            qs = parse_qs(urlparse(origin).query)
            utm_source = qs.get("utm_source", [""])[0]
            utm_medium = qs.get("utm_medium", [""])[0]
            utm_campaign = qs.get("utm_campaign", [""])[0]
        except Exception:
            pass

    now = data.get("timestamp") or timezone.now()

    event_data = {
        "project_id": str(project.id),
        "name": data["name"],
        "device_id": device_id,
        "profile_id": data.get("profile_id", ""),
        "session_id": session_id,
        "path": path,
        "origin": origin,
        "referrer": referrer,
        "referrer_name": referrer_name,
        "referrer_type": referrer_type,
        "revenue": data.get("revenue", 0),
        "duration": data.get("duration", 0),
        "properties": data.get("properties", {}),
        "country": geo.get("country", ""),
        "city": geo.get("city", ""),
        "region": geo.get("region", ""),
        "longitude": geo.get("longitude"),
        "latitude": geo.get("latitude"),
        "os": os_name,
        "browser": browser,
        "device": device_type,
        "utm_source": utm_source,
        "utm_medium": utm_medium,
        "utm_campaign": utm_campaign,
        "created_at": now.isoformat() if hasattr(now, "isoformat") else str(now),
    }

    push_event(event_data)

    return Response({"status": "accepted"}, status=status.HTTP_202_ACCEPTED)


@api_view(["POST"])
@authentication_classes([])
@permission_classes([AllowAny])
@throttle_classes([])
def identify_profile(request):
    client_id = request.headers.get("X-Client-ID", "")
    client_secret = request.headers.get("X-Client-Secret", "")

    if not client_id or not client_secret:
        return Response(
            {"error": "Missing X-Client-ID or X-Client-Secret"},
            status=status.HTTP_401_UNAUTHORIZED,
        )

    try:
        client = AnalyticsClient.objects.select_related("project").get(
            client_id=client_id, client_secret=client_secret, is_active=True
        )
    except AnalyticsClient.DoesNotExist:
        return Response(
            {"error": "Invalid credentials"},
            status=status.HTTP_401_UNAUTHORIZED,
        )

    serializer = IdentifySerializer(data=request.data)
    if not serializer.is_valid():
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    data = serializer.validated_data
    project = client.project

    profile, created = AnalyticsProfile.objects.update_or_create(
        external_id=data["profile_id"],
        project=project,
        defaults={
            "first_name": data.get("first_name", ""),
            "last_name": data.get("last_name", ""),
            "email": data.get("email", ""),
            "avatar": data.get("avatar", ""),
            "properties": data.get("properties", {}),
            "is_external": True,
        },
    )

    return Response(
        {"status": "identified", "created": created},
        status=status.HTTP_200_OK,
    )


# ============================================================================
# Legacy Overview (kept for backwards compatibility)
# ============================================================================


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def project_overview(request, project_id):
    try:
        project = AnalyticsProject.objects.get(id=project_id, owner=request.user)
    except AnalyticsProject.DoesNotExist:
        return Response({"error": "Not found"}, status=status.HTTP_404_NOT_FOUND)

    range_param = request.query_params.get("range", "7d")
    days = int(range_param.replace("d", "")) if range_param.endswith("d") else 7
    start = timezone.now() - timedelta(days=days)

    events = AnalyticsEvent.objects.filter(project=project, created_at__gte=start)
    sessions = AnalyticsSession.objects.filter(project=project, created_at__gte=start)

    total_events = events.count()
    total_sessions = sessions.count()
    unique_visitors = sessions.values("device_id").distinct().count()
    total_pageviews = events.filter(name="screen_view").count()
    bounce_count = sessions.filter(is_bounce=True).count()
    bounce_rate = (bounce_count / total_sessions * 100) if total_sessions > 0 else 0
    avg_duration = 0
    if total_sessions > 0:
        duration_sum = sessions.aggregate(total=Sum("duration"))["total"] or 0
        avg_duration = duration_sum / total_sessions
    total_revenue = events.aggregate(total=Sum("revenue"))["total"] or 0

    return Response(
        {
            "visitors": unique_visitors,
            "sessions": total_sessions,
            "pageviews": total_pageviews,
            "events": total_events,
            "bounce_rate": round(bounce_rate, 1),
            "avg_duration": round(avg_duration),
            "revenue": total_revenue,
        }
    )


# ============================================================================
# CRUD ViewSets
# ============================================================================


class DashboardViewSet(viewsets.ModelViewSet):
    serializer_class = AnalyticsDashboardSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return AnalyticsDashboard.objects.filter(project__owner=self.request.user)

    def perform_create(self, serializer):
        serializer.save(owner=self.request.user)


class ReportViewSet(viewsets.ModelViewSet):
    serializer_class = AnalyticsReportSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return AnalyticsReport.objects.filter(project__owner=self.request.user)


class EventMetaViewSet(viewsets.ModelViewSet):
    serializer_class = AnalyticsEventMetaSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return AnalyticsEventMeta.objects.filter(project__owner=self.request.user)


class ProfileViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = AnalyticsProfileSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return AnalyticsProfile.objects.filter(project__owner=self.request.user)


class ReferenceViewSet(viewsets.ModelViewSet):
    serializer_class = AnalyticsReferenceSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return AnalyticsReference.objects.filter(project__owner=self.request.user)


class NotificationRuleViewSet(viewsets.ModelViewSet):
    serializer_class = AnalyticsNotificationRuleSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return AnalyticsNotificationRule.objects.filter(
            project__owner=self.request.user
        )
