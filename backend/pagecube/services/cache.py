"""
PageCube Redis Cache Layer

Caches pre-rendered HTML pages in Redis for fast serving.
Falls back to DB html_cache if Redis is unavailable.
"""
import logging
from django.core.cache import cache

logger = logging.getLogger(__name__)

CACHE_PREFIX = 'pagecube:page:'
CACHE_TTL = 60 * 60 * 24  # 24 hours


def get_page_cache(slug: str) -> str | None:
    """Get cached HTML for a page slug. Returns None on miss."""
    try:
        return cache.get(f'{CACHE_PREFIX}{slug}')
    except Exception as e:
        logger.warning(f"Redis cache get failed for {slug}: {e}")
        return None


def set_page_cache(slug: str, html: str, ttl: int = CACHE_TTL) -> None:
    """Store rendered HTML in Redis cache."""
    try:
        cache.set(f'{CACHE_PREFIX}{slug}', html, ttl)
    except Exception as e:
        logger.warning(f"Redis cache set failed for {slug}: {e}")


def invalidate_page_cache(slug: str) -> None:
    """Remove cached HTML for a page slug."""
    try:
        cache.delete(f'{CACHE_PREFIX}{slug}')
    except Exception as e:
        logger.warning(f"Redis cache delete failed for {slug}: {e}")
