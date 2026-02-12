import logging
from datetime import timedelta

from django.utils import timezone
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response

from socialcube.models import SocialAccount, PostInsight, PlatformAnalytics, PostPlatform
from socialcube.serializers import PostInsightSerializer, PlatformAnalyticsSerializer

logger = logging.getLogger(__name__)


class AnalyticsViewSet(viewsets.ViewSet):

    @action(detail=False, methods=["get"])
    def overview(self, request):
        accounts = SocialAccount.objects.filter(user=request.user, is_active=True)
        days = int(request.query_params.get("days", 30))
        since = timezone.now() - timedelta(days=days)

        total_followers = 0
        total_impressions = 0
        total_reach = 0
        total_engagement = 0
        platforms = []

        for account in accounts:
            latest = PlatformAnalytics.objects.filter(
                account=account, date__gte=since.date()
            ).order_by("-date").first()

            if latest:
                total_followers += latest.followers or 0
                total_impressions += latest.impressions or 0
                total_reach += latest.reach or 0

            analytics_qs = PlatformAnalytics.objects.filter(
                account=account, date__gte=since.date()
            ).order_by("date")

            platforms.append({
                "account_id": account.id,
                "platform": account.platform,
                "username": account.username,
                "followers": latest.followers if latest else 0,
                "engagement_rate": latest.engagement_rate if latest else 0,
                "history": PlatformAnalyticsSerializer(analytics_qs, many=True).data,
            })

        return Response({
            "total_followers": total_followers,
            "total_impressions": total_impressions,
            "total_reach": total_reach,
            "days": days,
            "platforms": platforms,
        })

    @action(detail=False, methods=["get"], url_path="posts")
    def post_insights(self, request):
        account_id = request.query_params.get("account_id")
        days = int(request.query_params.get("days", 30))
        since = timezone.now() - timedelta(days=days)

        qs = PostInsight.objects.filter(
            post_platform__account__user=request.user,
            post_platform__published_at__gte=since,
        ).select_related("post_platform__post", "post_platform__account")

        if account_id:
            qs = qs.filter(post_platform__account_id=account_id)

        qs = qs.order_by("-post_platform__published_at")
        return Response(PostInsightSerializer(qs[:50], many=True).data)

    @action(detail=False, methods=["get"], url_path="best-times")
    def best_times(self, request):
        account_id = request.query_params.get("account_id")
        if not account_id:
            return Response({"error": "account_id required"}, status=status.HTTP_400_BAD_REQUEST)

        latest = PlatformAnalytics.objects.filter(
            account_id=account_id, account__user=request.user
        ).order_by("-date").first()

        if latest and latest.best_posting_hour:
            return Response({"best_hour": latest.best_posting_hour, "date": latest.date})
        return Response({"best_hour": None, "message": "Not enough data"})

    @action(detail=False, methods=["post"], url_path="pull")
    def pull_analytics(self, request):
        account_id = request.data.get("account_id")
        if not account_id:
            return Response({"error": "account_id required"}, status=status.HTTP_400_BAD_REQUEST)

        from socialcube.tasks import pull_account_analytics_task
        pull_account_analytics_task.delay(account_id)
        return Response({"status": "queued", "message": "Analytics pull queued"})
