import math

from django.db.models import Count, Q
from django.utils import timezone
from datetime import timedelta

from funnelcube.models import AnalyticsEvent


class ConversionService:
    """Conversion rate analysis with confidence intervals."""

    def __init__(self, project_id):
        self.project_id = project_id

    def calculate(self, event_name, breakdown=None, days=7):
        end = timezone.now()
        start = end - timedelta(days=days)

        events_qs = AnalyticsEvent.objects.filter(
            project_id=self.project_id,
            created_at__gte=start,
            created_at__lte=end,
        )

        total_visitors = events_qs.values("device_id").distinct().count()
        conversions = (
            events_qs.filter(name=event_name)
            .values("device_id")
            .distinct()
            .count()
        )

        rate = conversions / total_visitors if total_visitors > 0 else 0
        ci = self._confidence_interval(rate, total_visitors)

        result = {
            "conversion_rate": round(rate, 4),
            "conversions": conversions,
            "total_visitors": total_visitors,
            "confidence_interval": ci,
        }

        if breakdown:
            result["breakdown"] = self._breakdown(
                events_qs, event_name, breakdown
            )

        return result

    def _breakdown(self, qs, event_name, field):
        valid_fields = {
            "utm_source", "utm_medium", "utm_campaign",
            "device", "country", "browser", "os",
            "referrer_type", "referrer_name",
        }
        if field not in valid_fields:
            return {}

        # Get per-field totals and conversions
        totals = dict(
            qs.exclude(**{field: ""})
            .values_list(field)
            .annotate(c=Count("device_id", distinct=True))
            .values_list(field, "c")
        )

        conv_counts = dict(
            qs.filter(name=event_name)
            .exclude(**{field: ""})
            .values_list(field)
            .annotate(c=Count("device_id", distinct=True))
            .values_list(field, "c")
        )

        result = {}
        for key, total in sorted(totals.items(), key=lambda x: -x[1]):
            convs = conv_counts.get(key, 0)
            rate = convs / total if total > 0 else 0
            result[str(key)] = {
                "conversion_rate": round(rate, 4),
                "conversions": convs,
                "total_visitors": total,
                "confidence_interval": self._confidence_interval(rate, total),
            }

        return result

    @staticmethod
    def _confidence_interval(rate, n, z=1.96):
        if n == 0:
            return {"lower": 0, "upper": 0}
        se = math.sqrt(rate * (1 - rate) / n)
        return {
            "lower": round(max(0, rate - z * se), 4),
            "upper": round(min(1, rate + z * se), 4),
        }
