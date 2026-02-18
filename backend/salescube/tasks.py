"""Celery tasks for incremental SalesCube PROD sync."""
import logging
from decimal import Decimal

import requests
from celery import shared_task
from django.contrib.auth import get_user_model
from django.core.cache import cache
from django.utils import timezone
from django.utils.dateparse import parse_datetime

from .models import Lead, Origin, PipelineStage, Product, Sale

logger = logging.getLogger(__name__)
User = get_user_model()

PROD_BASE = "https://api.frzglobal.com.br/api"
PROD_TOKEN = "Token c3e1d02d51b6acb16488a16c6b0d0938b470e71d"
SYNC_LOCK_KEY = "salescube:sync:lock"
LAST_SYNC_KEY = "salescube:sync:last_ts"

STATUS_MAP = {
    "negotiating": "negotiation",
    "closed": "won",
    "cancelled": "lost",
    "rejected": "lost",
}


def _fetch_page(session, endpoint, params=None):
    """Fetch a single page, return (results, next_url)."""
    resp = session.get(f"{PROD_BASE}/{endpoint}/", params=params, timeout=30)
    resp.raise_for_status()
    data = resp.json()
    return data.get("results", []), data.get("next")


MAX_PAGES = 300  # Safety limit (~30,000 records per endpoint per sync)


def _fetch_incremental(session, endpoint, updated_after=None):
    """Paginate through endpoint, optionally filtered by updated_after."""
    params = {"page_size": 100}
    if updated_after:
        params["updated_after"] = updated_after
    results, next_url = _fetch_page(session, endpoint, params)
    all_results = list(results)
    page = 1
    while next_url and page < MAX_PAGES:
        try:
            resp = session.get(next_url, timeout=30)
            resp.raise_for_status()
        except Exception as exc:
            logger.warning("salescube sync: page %d fetch error for %s: %s", page, endpoint, exc)
            break
        data = resp.json()
        all_results.extend(data.get("results", []))
        next_url = data.get("next")
        page += 1
    if page >= MAX_PAGES:
        logger.warning("salescube sync: hit MAX_PAGES limit for %s (fetched %d records)", endpoint, len(all_results))
    return all_results


@shared_task(bind=True, max_retries=3, name="salescube.tasks.sync_from_prod")
def sync_from_prod(self, force_full=False):
    """
    Incremental sync: fetch only records updated since last run.
    Falls back to full sync on first run or force_full=True.
    """
    # Distributed lock (prevent concurrent syncs)
    if not cache.add(SYNC_LOCK_KEY, "1", timeout=300):
        logger.info("salescube sync already running, skipping")
        return {"status": "skipped", "reason": "lock_active"}

    try:
        last_sync = None if force_full else cache.get(LAST_SYNC_KEY)
        sync_start = timezone.now()

        session = requests.Session()
        session.headers.update({"Authorization": PROD_TOKEN, "Accept": "application/json"})

        stats = {"products": 0, "leads": 0, "sales": 0}

        # 1. Sync Products (match by legacy_id; fallback: sku or name)
        try:
            products = _fetch_incremental(session, "products", updated_after=last_sync)
        except Exception as exc:
            logger.warning("salescube sync: products fetch failed: %s", exc)
            products = []
        for p in products:
            prod_id = p.get("id")
            defaults = {
                "name": (p.get("name") or "")[:200],
                "sku": p.get("code") or p.get("sku") or "",
                "price": Decimal(str(p.get("price") or 0)),
                "active": p.get("is_active", True),
            }
            if prod_id:
                Product.objects.update_or_create(legacy_id=prod_id, defaults=defaults)
            else:
                name = defaults["name"]
                if name:
                    Product.objects.update_or_create(name=name, defaults=defaults)
        stats["products"] = len(products)

        # 2. Sync Leads
        admin = User.objects.filter(is_superuser=True).first()
        try:
            leads = _fetch_incremental(session, "leads", updated_after=last_sync)
        except Exception as exc:
            logger.warning("salescube sync: leads fetch failed: %s", exc)
            leads = []
        for ld in leads:
            lead_id = ld.get("id")
            if not lead_id:
                continue
            stage = PipelineStage.objects.filter(legacy_id=ld.get("column")).first()
            origin = Origin.objects.filter(legacy_id=ld.get("origin")).first()
            Lead.objects.update_or_create(
                legacy_id=lead_id,
                defaults={
                    "name": (ld.get("name") or f"Lead #{lead_id}")[:200],
                    "email": ld.get("email") or "",
                    "phone": ld.get("main_phone") or "",
                    "stage": stage,
                    "origin": origin,
                    "assigned_to": admin,
                },
            )
        stats["leads"] = len(leads)

        # 3. Sync Sales
        try:
            sales = _fetch_incremental(session, "sales", updated_after=last_sync)
        except Exception as exc:
            logger.warning("salescube sync: sales fetch failed: %s", exc)
            sales = []
        for s in sales:
            sale_id = s.get("id")
            if not sale_id:
                continue
            stage = STATUS_MAP.get(s.get("status", ""), "negotiation")
            total = Decimal(str(s.get("total_amount") or 0))
            close_date = s.get("close_date")
            closed_at = None
            if close_date:
                try:
                    closed_at = parse_datetime(close_date + "T00:00:00-03:00")
                except Exception:
                    pass
            Sale.objects.update_or_create(
                legacy_id=sale_id,
                defaults={
                    "total_value": total,
                    "stage": stage,
                    "notes": s.get("short_description") or "",
                    "closed_at": closed_at,
                },
            )
        stats["sales"] = len(sales)

        # Persist last sync timestamp
        cache.set(LAST_SYNC_KEY, sync_start.isoformat(), timeout=None)

        logger.info("salescube sync OK: %s", stats)
        return {"status": "ok", "stats": stats, "synced_at": sync_start.isoformat()}

    except Exception as exc:
        logger.exception("salescube sync failed")
        raise self.retry(exc=exc, countdown=60)
    finally:
        cache.delete(SYNC_LOCK_KEY)
