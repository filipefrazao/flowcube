import logging
from django.utils import timezone
from ..models import PostPlatform, PostStatus

logger = logging.getLogger(__name__)

PLATFORM_SERVICES = {}


def get_platform_service(platform_name: str):
    if not PLATFORM_SERVICES:
        from .platforms.instagram import InstagramService
        from .platforms.facebook import FacebookService
        PLATFORM_SERVICES["instagram"] = InstagramService()
        PLATFORM_SERVICES["facebook"] = FacebookService()
    return PLATFORM_SERVICES.get(platform_name)


def publish_post_to_platforms(post):
    """Publish a ScheduledPost to all selected platforms."""
    post_platforms = post.platforms.all()
    results = []

    for pp in post_platforms:
        account = pp.account
        service = get_platform_service(account.platform)
        if not service:
            pp.status = PostStatus.FAILED
            pp.error_message = f"No service for platform: {account.platform}"
            pp.save(update_fields=["status", "error_message"])
            results.append({"account": account.id, "status": "failed", "error": pp.error_message})
            continue

        try:
            pp.status = PostStatus.PUBLISHING
            pp.save(update_fields=["status"])

            media_data = []
            for m in post.media.all().order_by("order"):
                media_data.append({
                    "url": m.file.url if m.file else "",
                    "media_type": m.media_type,
                    "is_reel": m.media_type == "video" and m.duration_seconds and m.duration_seconds <= 90,
                })

            post_data = {
                "caption": post.caption,
                "media": media_data,
            }

            # Platform-specific fields
            metadata = account.metadata or {}
            if account.platform == "instagram":
                post_data["ig_user_id"] = account.platform_user_id
                token = metadata.get("page_access_token", account.access_token)
            elif account.platform == "facebook":
                post_data["page_id"] = account.platform_user_id
                token = metadata.get("page_access_token", account.access_token)
            else:
                token = account.access_token

            result = service.publish_post(token, post_data)

            pp.platform_post_id = result.get("platform_post_id", "")
            pp.permalink = result.get("permalink", "")
            pp.status = PostStatus.PUBLISHED
            pp.published_at = timezone.now()
            pp.save(update_fields=["platform_post_id", "permalink", "status", "published_at"])
            results.append({"account": account.id, "status": "published", "permalink": pp.permalink})

        except Exception as e:
            logger.exception(f"Failed to publish to {account.platform} @{account.username}")
            pp.status = PostStatus.FAILED
            pp.error_message = str(e)[:500]
            pp.save(update_fields=["status", "error_message"])
            results.append({"account": account.id, "status": "failed", "error": str(e)[:200]})

    # Update overall post status
    statuses = list(post.platforms.values_list("status", flat=True))
    if all(s == PostStatus.PUBLISHED for s in statuses):
        post.status = PostStatus.PUBLISHED
    elif any(s == PostStatus.PUBLISHED for s in statuses):
        post.status = PostStatus.PUBLISHED  # partial success
    else:
        post.status = PostStatus.FAILED
    post.save(update_fields=["status"])

    return results
