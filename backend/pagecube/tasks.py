from celery import shared_task
from django.utils import timezone
import logging
import json
import httpx

logger = logging.getLogger(__name__)


@shared_task(queue='pages', bind=True, max_retries=2)
def render_page(self, page_id):
    """Pre-render a page's Puck data to static HTML and cache it."""
    from .models import Page
    from .services.renderer import render_page_html
    from .services.cache import set_page_cache
    try:
        page = Page.objects.get(id=page_id)
        body_html, css = render_page_html(page)
        page.html_cache = body_html
        page.css_cache = css
        page.save(update_fields=['html_cache', 'css_cache', 'updated_at'])

        # Build full HTML document and cache in Redis
        full_html = _build_full_html(page)
        set_page_cache(page.slug, full_html)

        logger.info(f"Page {page_id} (slug={page.slug}) rendered and cached")
    except Exception as e:
        logger.error(f"Error rendering page {page_id}: {e}")
        self.retry(countdown=30)


def _build_full_html(page) -> str:
    """Assemble the complete HTML document for a rendered page."""
    from html import escape
    title = escape(page.meta_title or page.title)
    description = escape(page.meta_description or '')
    og_image = f'<meta property="og:image" content="{escape(page.og_image)}">' if page.og_image else ''
    favicon = f'<link rel="icon" href="{escape(page.favicon_url)}">' if page.favicon_url else ''
    custom_css = f'<style>{page.css_cache}</style>' if page.css_cache else ''
    custom_scripts = page.custom_scripts or ''

    return f"""<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>{title}</title>
  <meta name="description" content="{description}">
  {og_image}
  {favicon}
  <script src="https://cdn.tailwindcss.com"></script>
  {custom_css}
</head>
<body class="min-h-screen bg-white">
  {page.html_cache}
  {custom_scripts}
</body>
</html>"""


@shared_task(queue='pages', bind=True, max_retries=3)
def distribute_submission(self, submission_id):
    """Distribute a form submission to configured targets"""
    from .models import FormSubmission
    try:
        submission = FormSubmission.objects.select_related('form').get(id=submission_id)
        form = submission.form
        config = form.distribution_config or {}
        result = {}

        if form.distribution_mode == 'salescube':
            result = _distribute_salescube(submission, config)
        elif form.distribution_mode == 'webhook':
            result = _distribute_webhook(submission, config)
        elif form.distribution_mode == 'whatsapp':
            result = _distribute_whatsapp(submission, config)

        submission.distributed = True
        submission.distributed_at = timezone.now()
        submission.distribution_result = result
        submission.save(update_fields=['distributed', 'distributed_at', 'distribution_result'])

        logger.info(f"Submission {submission_id} distributed via {form.distribution_mode}")
    except Exception as e:
        logger.error(f"Error distributing submission {submission_id}: {e}")
        self.retry(countdown=60 * (2 ** self.request.retries))


def _distribute_salescube(submission, config):
    """Send lead to SalesCube CRM"""
    api_url = config.get('api_url', 'https://api.frzglobal.com.br/api/leads/')
    api_token = config.get('api_token', '')
    field_mapping = config.get('field_mapping', {})
    data = submission.data

    payload = {
        'name': data.get('name', data.get('nome', '')),
        'phone': data.get('phone', data.get('telefone', data.get('whatsapp', ''))),
        'email': data.get('email', ''),
        'column': field_mapping.get('column', 48),
        'origin': field_mapping.get('origin', 6),
        'channel': field_mapping.get('channel', 78),
        'responsibles': field_mapping.get('responsibles', [78]),
        'is_ai_enabled': field_mapping.get('is_ai_enabled', False),
    }

    with httpx.Client(timeout=30) as client:
        resp = client.post(api_url, json=payload, headers={'Authorization': f'Token {api_token}'})
        return {'status_code': resp.status_code, 'response': resp.json() if resp.status_code < 400 else resp.text}


def _distribute_webhook(submission, config):
    """Send data to external webhook"""
    url = config.get('url', '')
    method = config.get('method', 'POST').upper()
    headers = config.get('headers', {'Content-Type': 'application/json'})

    payload = {
        'submission_id': submission.id,
        'form_name': submission.form.name,
        'data': submission.data,
        'submitted_at': submission.created_at.isoformat(),
        'utm': {
            'source': submission.utm_source,
            'medium': submission.utm_medium,
            'campaign': submission.utm_campaign,
        }
    }

    with httpx.Client(timeout=30) as client:
        resp = client.request(method, url, json=payload, headers=headers)
        return {'status_code': resp.status_code, 'response': resp.text[:500]}


def _distribute_whatsapp(submission, config):
    """Send WhatsApp message via Evolution API"""
    instance_name = config.get('instance_name', 'API Oficial - Suporte FRZ')
    phone = submission.data.get('phone', submission.data.get('telefone', submission.data.get('whatsapp', '')))
    message_template = config.get('message_template', 'Olá {name}! Recebemos seu cadastro. Em breve entraremos em contato.')

    if not phone:
        return {'error': 'No phone number in submission data'}

    # Format message
    message = message_template
    for key, value in submission.data.items():
        message = message.replace(f'{{{key}}}', str(value))

    # Clean phone number
    phone = ''.join(filter(str.isdigit, phone))
    if len(phone) == 11:
        phone = f'55{phone}'

    evolution_url = 'https://evolution.frzgroup.com.br'
    api_key = '429683C4C977415CAAFCCE10F7D57E11'

    with httpx.Client(timeout=30) as client:
        resp = client.post(
            f'{evolution_url}/message/sendText/{instance_name}',
            json={'number': phone, 'text': message},
            headers={'apikey': api_key}
        )
        return {'status_code': resp.status_code, 'response': resp.json() if resp.status_code < 400 else resp.text}


@shared_task(queue='pages')
def verify_domain(domain_id):
    """Verify DNS for a custom domain"""
    from .models import CustomDomain
    import socket

    try:
        domain_obj = CustomDomain.objects.get(id=domain_id)

        # Check CNAME/A record
        try:
            answers = socket.getaddrinfo(domain_obj.domain, 443)
            # If we get here, DNS resolves
            domain_obj.verified = True
            domain_obj.verified_at = timezone.now()
            domain_obj.ssl_status = 'active'  # Traefik handles SSL
            domain_obj.save(update_fields=['verified', 'verified_at', 'ssl_status', 'updated_at'])

            # Generate Traefik config
            _generate_traefik_config(domain_obj)

            logger.info(f"Domain {domain_obj.domain} verified successfully")
        except socket.gaierror:
            domain_obj.verified = False
            domain_obj.ssl_status = 'failed'
            domain_obj.save(update_fields=['verified', 'ssl_status', 'updated_at'])
            logger.warning(f"Domain {domain_obj.domain} DNS verification failed")
    except Exception as e:
        logger.error(f"Error verifying domain {domain_id}: {e}")


def _generate_traefik_config(domain_obj):
    """Generate and write Traefik dynamic config YAML for custom domain.

    Traefik watches /data/coolify/proxy/dynamic/ for changes and
    auto-reloads - no restart needed.
    """
    import os
    safe_domain = domain_obj.domain.replace('.', '-')
    config_path = f'/data/coolify/proxy/dynamic/pagecube-{safe_domain}.yaml'

    yaml_content = f"""http:
  routers:
    pagecube-{safe_domain}:
      rule: "Host(`{domain_obj.domain}`)"
      service: pagecube-{safe_domain}-svc
      entryPoints:
        - https
      tls:
        certResolver: letsencrypt
  services:
    pagecube-{safe_domain}-svc:
      loadBalancer:
        servers:
          - url: "http://flowcube-backend:8000"
"""

    # Write config file - Traefik auto-detects changes in dynamic dir
    try:
        os.makedirs(os.path.dirname(config_path), exist_ok=True)
        with open(config_path, 'w') as f:
            f.write(yaml_content)
        logger.info(f"Traefik config written for {domain_obj.domain} at {config_path}")
    except OSError as e:
        logger.error(f"Failed to write Traefik config for {domain_obj.domain}: {e}")

    domain_obj.traefik_config_path = config_path
    domain_obj.save(update_fields=['traefik_config_path'])


# ─── GOOGLE SHEETS INTEGRATION ─────────────────────────────────────────────

def _get_gspread_client():
    """Build gspread client from GOOGLE_SHEETS_SERVICE_ACCOUNT env variable (JSON string)."""
    import os
    import json
    import gspread
    from google.oauth2.service_account import Credentials

    sa_json = os.environ.get('GOOGLE_SHEETS_SERVICE_ACCOUNT', '')
    if not sa_json:
        raise ValueError("GOOGLE_SHEETS_SERVICE_ACCOUNT env var not set")

    creds_dict = json.loads(sa_json)
    scopes = [
        'https://spreadsheets.google.com/feeds',
        'https://www.googleapis.com/auth/drive',
    ]
    creds = Credentials.from_service_account_info(creds_dict, scopes=scopes)
    return gspread.authorize(creds)


def _extract_sheet_id(url: str) -> str:
    """Extract spreadsheet ID from a Google Sheets URL."""
    import re
    match = re.search(r'/spreadsheets/d/([a-zA-Z0-9-_]+)', url)
    if not match:
        raise ValueError(f"Could not extract sheet ID from URL: {url}")
    return match.group(1)


@shared_task(queue='default', bind=True, max_retries=3)
def append_submission_to_sheets(self, submission_id: int):
    """Append a single submission to its form's connected Google Sheet."""
    from .models import FormSubmission
    try:
        submission = FormSubmission.objects.select_related('form').get(id=submission_id)
        form = submission.form

        if not form.google_sheets_url:
            return

        gc = _get_gspread_client()
        sheet_id = _extract_sheet_id(form.google_sheets_url)
        sh = gc.open_by_key(sheet_id)
        ws = sh.sheet1

        existing = ws.get_all_values()
        if not existing:
            # Create header row from submission data keys
            headers = ['ID', 'Data', 'IP'] + list(submission.data.keys())
            ws.append_row(headers)

        row = [
            str(submission.id),
            submission.created_at.strftime('%d/%m/%Y %H:%M'),
            submission.ip_address or '',
        ] + [str(v) for v in submission.data.values()]

        ws.append_row(row)
        logger.info(f"Submission {submission_id} appended to sheet {sheet_id}")

    except Exception as e:
        logger.error(f"Error appending submission {submission_id} to sheets: {e}")
        self.retry(countdown=60, exc=e)


@shared_task(queue='default', bind=True, max_retries=2)
def sync_to_google_sheets(self, form_id: int):
    """Sync ALL submissions of a form to Google Sheets (full overwrite after header)."""
    from .models import FormSchema, FormSubmission
    try:
        form = FormSchema.objects.get(id=form_id)
        if not form.google_sheets_url:
            return

        submissions = FormSubmission.objects.filter(form=form).order_by('created_at')
        if not submissions.exists():
            return

        gc = _get_gspread_client()
        sheet_id = _extract_sheet_id(form.google_sheets_url)
        sh = gc.open_by_key(sheet_id)
        ws = sh.sheet1

        # Build all keys from all submissions
        all_keys: list[str] = []
        for sub in submissions:
            for k in sub.data.keys():
                if k not in all_keys:
                    all_keys.append(k)

        headers = ['ID', 'Data', 'IP'] + all_keys
        rows = [headers]
        for sub in submissions:
            row = [
                str(sub.id),
                sub.created_at.strftime('%d/%m/%Y %H:%M'),
                sub.ip_address or '',
            ] + [str(sub.data.get(k, '')) for k in all_keys]
            rows.append(row)

        ws.clear()
        ws.update('A1', rows)

        synced = len(rows) - 1
        FormSchema.objects.filter(pk=form_id).update(google_sheets_synced_count=synced)
        logger.info(f"Synced {synced} submissions for form {form_id} to sheet {sheet_id}")

    except Exception as e:
        logger.error(f"Error syncing form {form_id} to sheets: {e}")
        self.retry(countdown=120, exc=e)
