import logging
from datetime import timedelta

from celery import shared_task
from django.utils import timezone

logger = logging.getLogger(__name__)


@shared_task(queue="social", name="socialcube.publish_post")
def publish_post_task(post_id):
    from socialcube.models import ScheduledPost
    from socialcube.services.publisher import PublishDispatcher

    try:
        post = ScheduledPost.objects.get(id=post_id)
        dispatcher = PublishDispatcher()
        dispatcher.publish_post_to_platforms(post)
        logger.info(f"Published post {post_id}: {post.title}")
    except ScheduledPost.DoesNotExist:
        logger.error(f"Post {post_id} not found")
    except Exception as e:
        logger.exception(f"Failed to publish post {post_id}: {e}")


@shared_task(queue="social", name="socialcube.publish_scheduled")
def publish_scheduled_posts():
    from socialcube.models import ScheduledPost

    now = timezone.now()
    window = now + timedelta(minutes=2)
    posts = ScheduledPost.objects.filter(
        status="scheduled",
        scheduled_at__lte=window,
        scheduled_at__gte=now - timedelta(minutes=5),
    )

    count = 0
    for post in posts:
        publish_post_task.delay(post.id)
        post.status = "publishing"
        post.save(update_fields=["status"])
        count += 1

    if count:
        logger.info(f"Queued {count} scheduled posts for publishing")
    return count


@shared_task(queue="social", name="socialcube.pull_account_analytics")
def pull_account_analytics_task(account_id):
    from socialcube.models import SocialAccount, PlatformAnalytics, PostPlatform, PostInsight
    from socialcube.services.publisher import PublishDispatcher

    try:
        account = SocialAccount.objects.get(id=account_id)
        dispatcher = PublishDispatcher()
        svc = dispatcher.get_platform_service(account.platform)

        if not svc:
            logger.warning(f"No service for platform {account.platform}")
            return

        token = account.access_token
        if account.metadata.get("page_access_token"):
            token = account.metadata["page_access_token"]

        insights = svc.get_account_insights(token, account.platform_user_id)

        PlatformAnalytics.objects.update_or_create(
            account=account,
            date=timezone.now().date(),
            defaults={
                "followers": insights.get("followers_count", 0),
                "following": insights.get("follows_count", 0),
                "posts_count": insights.get("media_count", 0),
                "impressions": insights.get("impressions", 0),
                "reach": insights.get("reach", 0),
                "profile_views": insights.get("profile_views", 0),
                "website_clicks": insights.get("website_clicks", 0),
            }
        )

        recent_posts = PostPlatform.objects.filter(
            account=account,
            published_at__gte=timezone.now() - timedelta(days=7),
            platform_post_id__isnull=False,
        ).exclude(platform_post_id="")

        for pp in recent_posts:
            try:
                post_insights = svc.get_post_insights(token, pp.platform_post_id)
                PostInsight.objects.update_or_create(
                    post_platform=pp,
                    defaults={
                        "impressions": post_insights.get("impressions", 0),
                        "reach": post_insights.get("reach", 0),
                        "likes": post_insights.get("likes", 0),
                        "comments": post_insights.get("comments", 0),
                        "shares": post_insights.get("shares", 0),
                        "saves": post_insights.get("saves", 0),
                        "clicks": post_insights.get("clicks", 0),
                    }
                )
            except Exception as e:
                logger.warning(f"Failed to pull insights for post {pp.platform_post_id}: {e}")

        account.last_synced_at = timezone.now()
        account.save(update_fields=["last_synced_at"])
        logger.info(f"Analytics pulled for account {account.username} ({account.platform})")

    except SocialAccount.DoesNotExist:
        logger.error(f"Account {account_id} not found")
    except Exception as e:
        logger.exception(f"Failed to pull analytics for account {account_id}: {e}")


@shared_task(queue="social", name="socialcube.pull_all_analytics")
def pull_all_analytics():
    from socialcube.models import SocialAccount

    accounts = SocialAccount.objects.filter(is_active=True)
    count = 0
    for account in accounts:
        pull_account_analytics_task.delay(account.id)
        count += 1

    logger.info(f"Queued analytics pull for {count} accounts")
    return count


@shared_task(queue="social", name="socialcube.track_single_competitor")
def track_single_competitor_task(competitor_id):
    from socialcube.models import Competitor, CompetitorSnapshot
    import requests

    try:
        competitor = Competitor.objects.get(id=competitor_id)

        if competitor.platform == "instagram":
            pass

        logger.info(f"Tracked competitor {competitor.username}")
    except Competitor.DoesNotExist:
        logger.error(f"Competitor {competitor_id} not found")
    except Exception as e:
        logger.exception(f"Failed to track competitor {competitor_id}: {e}")


@shared_task(queue="social", name="socialcube.refresh_tokens")
def refresh_expiring_tokens():
    from socialcube.models import SocialAccount
    from socialcube.services.publisher import PublishDispatcher

    threshold = timezone.now() + timedelta(days=7)
    accounts = SocialAccount.objects.filter(
        is_active=True,
        token_expires_at__lte=threshold,
        token_expires_at__isnull=False,
    )

    dispatcher = PublishDispatcher()
    count = 0
    for account in accounts:
        try:
            svc = dispatcher.get_platform_service(account.platform)
            if svc:
                new_token = svc.refresh_access_token(account.access_token)
                account.access_token = new_token
                account.token_expires_at = timezone.now() + timedelta(days=60)
                account.save(update_fields=["_access_token", "token_expires_at"])
                count += 1
                logger.info(f"Refreshed token for {account.username}")
        except Exception as e:
            logger.warning(f"Failed to refresh token for {account.username}: {e}")

    return count


# ── Lead Ads Tasks ──────────────────────────────────────────────────────────

@shared_task(queue="social", name="socialcube.process_leadgen_event", bind=True, max_retries=3)
def process_leadgen_event(self, page_id, form_id, leadgen_id):
    """Process a single leadgen event from Facebook webhook."""
    from socialcube.models import LeadAdsAppConfig, LeadAdsConnection, LeadAdsForm, LeadEntry
    from socialcube.services.leadads import fetch_lead_data, parse_lead_fields, get_page_name

    # 1. Find or auto-create connection
    access_token = None
    try:
        connection = LeadAdsConnection.objects.get(page_id=page_id)
        access_token = connection.page_access_token
    except LeadAdsConnection.DoesNotExist:
        # Fallback: use system user token and auto-create connection
        config = LeadAdsAppConfig.get_config()
        if config and config.system_user_token:
            access_token = config.system_user_token
            page_name = get_page_name(page_id, access_token) or f"Page {page_id}"
            connection = LeadAdsConnection.objects.create(
                page_id=page_id,
                page_name=page_name,
                is_subscribed=True,
            )
            connection.page_access_token = access_token
            connection.save(update_fields=["_page_access_token"])
            logger.info(f"Auto-created LeadAds connection for page {page_id} ({page_name})")
        else:
            logger.warning(f"No LeadAds connection for page {page_id} and no system_user_token")
            return

    if not access_token:
        # Try system user token as last resort
        config = LeadAdsAppConfig.get_config()
        if config and config.system_user_token:
            access_token = config.system_user_token

    # 2. Auto-discover form if not yet known
    form_obj, _ = LeadAdsForm.objects.get_or_create(
        form_id=form_id,
        defaults={"connection": connection, "form_name": f"Form {form_id}"},
    )

    # 3. Dedup check
    if LeadEntry.objects.filter(leadgen_id=leadgen_id).exists():
        logger.info(f"Lead {leadgen_id} already exists, skipping")
        return

    # 4. Fetch lead data from Graph API
    try:
        lead_data = fetch_lead_data(leadgen_id, access_token)
    except Exception as exc:
        logger.error(f"Failed to fetch lead {leadgen_id}: {exc}")
        raise self.retry(exc=exc, countdown=30)

    parsed = parse_lead_fields(lead_data)

    # 5. Create lead entry
    entry = LeadEntry.objects.create(
        form=form_obj,
        leadgen_id=leadgen_id,
        data=lead_data,
        name=parsed["name"],
        email=parsed["email"],
        phone=parsed["phone"],
    )

    # 6. Update counters
    from django.db.models import F
    LeadAdsForm.objects.filter(id=form_obj.id).update(
        leads_count=F("leads_count") + 1,
        last_lead_at=timezone.now(),
    )

    # 7. Distribute if configured
    if form_obj.distribution_mode != "none":
        distribute_lead.delay(entry.id)

    logger.info(f"Processed lead {leadgen_id} for page {page_id} form {form_id}")


@shared_task(queue="social", name="socialcube.distribute_lead", bind=True, max_retries=3)
def distribute_lead(self, lead_entry_id):
    """Distribute a lead to SalesCube CRM or external webhook.

    SalesCube distribution_config supports:
    - field_mapping.sellers: list of {id, channel} for random assignment
    - field_mapping.tags: list of tag IDs to assign after creation
    - field_mapping.profession_field: form field name to extract profession
    - field_mapping.franchise: franchise ID
    """
    import random
    import requests as http_requests
    from socialcube.models import LeadEntry
    from socialcube.services.leadads import extract_field_from_lead, assign_tags_to_lead

    try:
        entry = LeadEntry.objects.select_related("form").get(id=lead_entry_id)
    except LeadEntry.DoesNotExist:
        logger.error(f"LeadEntry {lead_entry_id} not found")
        return

    form = entry.form
    config = form.distribution_config or {}
    mode = form.distribution_mode

    try:
        if mode == "salescube":
            api_url = config.get("api_url", "https://api.frzglobal.com.br/api/leads/")
            api_token = config.get("api_token", "")
            mapping = config.get("field_mapping", {})

            # ── Seller randomization ─────────────────────────
            sellers = mapping.get("sellers", [])
            if sellers:
                seller = random.choice(sellers)
                responsibles = [seller["id"]]
                channel = seller["channel"]
            else:
                responsibles = mapping.get("responsibles", [78])
                channel = mapping.get("channel", 78)

            payload = {
                "name": entry.name,
                "phone": entry.phone,
                "email": entry.email,
                "column": mapping.get("column", 48),
                "origin": mapping.get("origin", 6),
                "channel": channel,
                "responsibles": responsibles,
                "is_ai_enabled": mapping.get("is_ai_enabled", False),
            }

            # ── Franchise (optional) ─────────────────────────
            franchise = mapping.get("franchise")
            if franchise:
                payload["franchise"] = franchise

            # ── Profession field extraction (optional) ───────
            profession_field = mapping.get("profession_field")
            if profession_field and entry.data:
                profession = extract_field_from_lead(entry.data, profession_field)
                if profession:
                    payload["profession"] = profession

            # ── Create lead in SalesCube ─────────────────────
            resp = http_requests.post(
                api_url,
                json=payload,
                headers={
                    "Authorization": api_token,
                    "Content-Type": "application/json",
                },
                timeout=15,
            )
            resp.raise_for_status()
            result = resp.json()

            # ── Tag assignment (after lead creation) ─────────
            tags = mapping.get("tags", [])
            lead_id = result.get("id")
            if tags and lead_id:
                try:
                    assign_tags_to_lead(api_url, api_token, lead_id, tags)
                    result["tags_assigned"] = tags
                    logger.info(f"Assigned tags {tags} to lead {lead_id}")
                except Exception as tag_err:
                    logger.warning(f"Failed to assign tags to lead {lead_id}: {tag_err}")
                    result["tags_error"] = str(tag_err)

            # Store which seller was assigned
            if sellers:
                result["assigned_seller"] = seller

        elif mode == "webhook":
            url = config.get("url", "")
            method = config.get("method", "POST").upper()
            headers = config.get("headers", {"Content-Type": "application/json"})
            body_template = config.get("body_template", {})

            # Simple template substitution
            body = {}
            for key, tmpl in body_template.items():
                val = str(tmpl)
                val = val.replace("{{name}}", entry.name or "")
                val = val.replace("{{email}}", entry.email or "")
                val = val.replace("{{phone}}", entry.phone or "")
                val = val.replace("{{leadgen_id}}", entry.leadgen_id or "")
                body[key] = val

            if not body:
                body = {
                    "name": entry.name,
                    "email": entry.email,
                    "phone": entry.phone,
                    "leadgen_id": entry.leadgen_id,
                    "data": entry.data,
                }

            resp = http_requests.request(method, url, json=body, headers=headers, timeout=15)
            resp.raise_for_status()
            result = resp.json() if resp.headers.get("content-type", "").startswith("application/json") else {"status": resp.status_code}

        elif mode == "workflow":
            # ── FlowCube Workflow execution ──────────────────
            workflow_id = config.get("workflow_id")
            if not workflow_id:
                raise ValueError("workflow distribution requires workflow_id in config")

            from workflows.models import Workflow, Execution
            from workflows.tasks import execute_workflow_task

            workflow = Workflow.objects.get(
                id=workflow_id, is_published=True, is_active=True
            )

            # Build trigger_data from the parsed lead
            trigger_data = {
                "name": entry.name,
                "phone": entry.phone,
                "email": entry.email,
                "leadgen_id": entry.leadgen_id,
                "form_id": form.form_id,
                "form_name": form.form_name,
            }
            # Add connection context
            if form.connection:
                trigger_data["page_id"] = form.connection.page_id
                trigger_data["page_name"] = form.connection.page_name

            # Merge raw Facebook field_data as flat keys
            if entry.data and isinstance(entry.data, dict):
                for field in entry.data.get("field_data", []):
                    fname = field.get("name", "")
                    values = field.get("values", [])
                    if fname and values:
                        trigger_data[fname] = values[0]
                # Also pass ad/campaign metadata
                for meta_key in ("ad_id", "adgroup_id", "campaign_id", "created_time"):
                    if meta_key in entry.data:
                        trigger_data[meta_key] = entry.data[meta_key]

            execution = Execution.objects.create(
                workflow=workflow,
                status=Execution.Status.PENDING,
                trigger_data=trigger_data,
                triggered_by="leadads",
            )
            execute_workflow_task.delay(str(execution.id))
            result = {
                "execution_id": str(execution.id),
                "workflow_id": str(workflow_id),
                "workflow_name": workflow.name,
            }
            logger.info(
                f"Dispatched workflow {workflow.name} for lead {entry.leadgen_id}"
            )

        else:
            return

        entry.distributed = True
        entry.distributed_at = timezone.now()
        entry.distribution_result = result
        entry.save(update_fields=["distributed", "distributed_at", "distribution_result"])
        logger.info(f"Distributed lead {entry.leadgen_id} via {mode}")

    except Exception as exc:
        entry.distribution_result = {"error": str(exc)}
        entry.save(update_fields=["distribution_result"])
        logger.error(f"Failed to distribute lead {entry.leadgen_id}: {exc}")
        raise self.retry(exc=exc, countdown=60)


@shared_task(queue="social", name="socialcube.poll_leads_fallback")
def poll_leads_fallback():
    """Periodic polling fallback: fetch leads that may have been missed by webhooks."""
    from socialcube.models import LeadAdsAppConfig, LeadAdsConnection, LeadAdsForm, LeadEntry
    from socialcube.services.leadads import get_form_leads, parse_lead_fields

    config = LeadAdsAppConfig.get_config()
    connections = LeadAdsConnection.objects.filter(is_subscribed=True)
    total_new = 0

    for conn in connections:
        # Use page token or system user token
        token = conn.page_access_token
        if not token and config and config.system_user_token:
            token = config.system_user_token
        if not token:
            continue

        forms = LeadAdsForm.objects.filter(connection=conn, form_status="active")
        for form_obj in forms:
            try:
                # Get leads from last 30 minutes
                since = int((timezone.now() - timedelta(minutes=30)).timestamp())
                leads = get_form_leads(form_obj.form_id, token, since=since)

                for lead in leads:
                    lid = lead.get("id", "")
                    if not lid or LeadEntry.objects.filter(leadgen_id=lid).exists():
                        continue

                    parsed = parse_lead_fields(lead)
                    entry = LeadEntry.objects.create(
                        form=form_obj,
                        leadgen_id=lid,
                        data=lead,
                        name=parsed["name"],
                        email=parsed["email"],
                        phone=parsed["phone"],
                    )
                    total_new += 1

                    if form_obj.distribution_mode != "none":
                        distribute_lead.delay(entry.id)

            except Exception as e:
                logger.warning(f"Poll fallback failed for form {form_obj.form_id}: {e}")

    if total_new:
        logger.info(f"Poll fallback: found {total_new} new leads")
    return total_new
