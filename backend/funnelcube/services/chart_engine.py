from zoneinfo import ZoneInfo
from datetime import datetime, timedelta

from django.db.models import Count, Sum, Avg, Q
from django.db.models.functions import TruncDate, TruncHour, TruncWeek, TruncMonth

from funnelcube.models import AnalyticsEvent, AnalyticsSession


TRUNC_MAP = {
    "hour": TruncHour,
    "day": TruncDate,
    "week": TruncWeek,
    "month": TruncMonth,
}


class ChartEngine:
    def __init__(self, project_id, timezone="America/Sao_Paulo"):
        self.project_id = project_id
        self.tz = ZoneInfo(timezone)

    def _date_range(self, days):
        end = datetime.now(tz=self.tz)
        start = end - timedelta(days=days)
        return start, end

    def query_time_series(self, events, interval="day", range_days=7, metric="count", breakdown=None):
        start, end = self._date_range(range_days)
        trunc_fn = TRUNC_MAP.get(interval, TruncDate)

        series = []
        for event_name in events:
            qs = AnalyticsEvent.objects.filter(
                project_id=self.project_id,
                name=event_name,
                created_at__gte=start,
                created_at__lte=end,
            )

            if breakdown:
                qs = qs.values(breakdown)

            data = (
                qs.annotate(period=trunc_fn("created_at"))
                .values("period")
                .annotate(value=Count("id"))
                .order_by("period")
            )

            if metric == "sum":
                data = (
                    qs.annotate(period=trunc_fn("created_at"))
                    .values("period")
                    .annotate(value=Sum("revenue"))
                    .order_by("period")
                )

            series.append(
                {
                    "name": event_name,
                    "data": [
                        {"timestamp": str(row["period"]), "value": row["value"] or 0}
                        for row in data
                    ],
                }
            )

        return {"series": series}

    def get_top_sources(self, days=7, limit=10):
        start, end = self._date_range(days)
        return list(
            AnalyticsEvent.objects.filter(
                project_id=self.project_id,
                created_at__gte=start,
                referrer_name__gt="",
            )
            .values("referrer_name", "referrer_type")
            .annotate(count=Count("id"))
            .order_by("-count")[:limit]
        )

    def get_top_pages(self, days=7, limit=10):
        start, end = self._date_range(days)
        return list(
            AnalyticsEvent.objects.filter(
                project_id=self.project_id,
                created_at__gte=start,
                path__gt="",
            )
            .values("path")
            .annotate(count=Count("id"))
            .order_by("-count")[:limit]
        )

    def get_top_geo(self, days=7, limit=10):
        start, end = self._date_range(days)
        return list(
            AnalyticsEvent.objects.filter(
                project_id=self.project_id,
                created_at__gte=start,
                country__gt="",
            )
            .values("country", "city")
            .annotate(count=Count("id"))
            .order_by("-count")[:limit]
        )

    def get_devices(self, days=7):
        start, end = self._date_range(days)
        qs = AnalyticsSession.objects.filter(
            project_id=self.project_id,
            created_at__gte=start,
        )
        browsers = list(
            qs.values("browser")
            .annotate(count=Count("id"))
            .order_by("-count")[:10]
        )
        os_list = list(
            qs.values("os").annotate(count=Count("id")).order_by("-count")[:10]
        )
        devices = list(
            qs.values("device")
            .annotate(count=Count("id"))
            .order_by("-count")[:10]
        )
        return {"browsers": browsers, "os": os_list, "devices": devices}

    def get_events_list(self, days=7, limit=20):
        start, end = self._date_range(days)
        return list(
            AnalyticsEvent.objects.filter(
                project_id=self.project_id,
                created_at__gte=start,
            )
            .values("name")
            .annotate(count=Count("id"))
            .order_by("-count")[:limit]
        )
