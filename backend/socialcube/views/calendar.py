import logging
from datetime import datetime

from django.utils import timezone
from rest_framework.decorators import api_view
from rest_framework.response import Response
from rest_framework import status

from socialcube.models import ScheduledPost
from socialcube.serializers import ScheduledPostListSerializer

logger = logging.getLogger(__name__)


@api_view(["GET"])
def calendar_view(request):
    year = int(request.query_params.get("year", timezone.now().year))
    month = int(request.query_params.get("month", timezone.now().month))

    posts = ScheduledPost.objects.filter(
        user=request.user,
        scheduled_at__year=year,
        scheduled_at__month=month,
    ).select_related("user").prefetch_related(
        "media_items", "platforms__account"
    ).order_by("scheduled_at")

    serializer = ScheduledPostListSerializer(posts, many=True)

    events = []
    for post_data in serializer.data:
        events.append({
            **post_data,
            "date": post_data.get("scheduled_at"),
        })

    return Response({
        "year": year,
        "month": month,
        "events": events,
        "total": len(events),
    })


class CalendarView:
    pass
