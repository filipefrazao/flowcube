"""Graph API client for Facebook Lead Ads."""

import hashlib
import hmac
import logging

import requests

logger = logging.getLogger(__name__)

GRAPH_API_BASE = "https://graph.facebook.com/v24.0"


def verify_webhook_signature(payload_bytes: bytes, signature: str, app_secret: str) -> bool:
    """Verify HMAC SHA-256 signature from Facebook webhook."""
    if not signature or not signature.startswith("sha256="):
        return False
    expected = hmac.new(
        app_secret.encode(), payload_bytes, hashlib.sha256
    ).hexdigest()
    return hmac.compare_digest(expected, signature[7:])


def fetch_lead_data(leadgen_id: str, access_token: str) -> dict:
    """Fetch lead field data from Graph API."""
    url = f"{GRAPH_API_BASE}/{leadgen_id}"
    resp = requests.get(url, params={"access_token": access_token}, timeout=15)
    resp.raise_for_status()
    return resp.json()


def parse_lead_fields(lead_data: dict) -> dict:
    """Extract name, email, phone from field_data array."""
    result = {"name": "", "email": "", "phone": ""}
    for field in lead_data.get("field_data", []):
        fname = field.get("name", "").lower().strip()
        values = field.get("values", [])
        value = values[0] if values else ""
        if fname in ("full_name", "nome_completo", "nome"):
            result["name"] = value
        elif fname in ("email", "e-mail"):
            result["email"] = value
        elif fname in ("phone_number", "telefone", "phone", "whatsapp", "celular_(ddd+número)"):
            result["phone"] = value
    # Fallback: try created_time for debugging
    if not any(result.values()):
        result["name"] = lead_data.get("id", "")
    return result


def extract_field_from_lead(lead_data: dict, field_name: str) -> str:
    """Extract a specific field value from lead field_data."""
    if not lead_data or not field_name:
        return ""
    for field in lead_data.get("field_data", []):
        fname = field.get("name", "").lower().strip()
        if fname == field_name.lower().strip():
            values = field.get("values", [])
            return values[0] if values else ""
    return ""


def assign_tags_to_lead(api_url: str, api_token: str, lead_id: int, tags: list) -> dict:
    """Assign tags to a lead in SalesCube CRM via tagged-items endpoint."""
    # Derive base from api_url (e.g. https://api.frzglobal.com.br/api/leads/ -> .../api/)
    base = api_url.rstrip("/")
    base = base.rsplit("/leads", 1)[0]  # Remove /leads suffix
    url = f"{base}/tagged-items/"
    results = []
    for tag_id in tags:
        resp = requests.post(
            url,
            json={"tag": tag_id, "object_id": lead_id, "content_type": 8},
            headers={
                "Authorization": api_token,
                "Content-Type": "application/json",
            },
            timeout=15,
        )
        resp.raise_for_status()
        results.append(resp.json())
    return results[0] if len(results) == 1 else results


def subscribe_page_to_leadgen(page_id: str, page_access_token: str) -> dict:
    """Subscribe a Facebook page to leadgen webhook field."""
    url = f"{GRAPH_API_BASE}/{page_id}/subscribed_apps"
    resp = requests.post(
        url,
        params={
            "access_token": page_access_token,
            "subscribed_fields": "leadgen",
        },
        timeout=15,
    )
    resp.raise_for_status()
    return resp.json()


def unsubscribe_page_from_leadgen(page_id: str, page_access_token: str) -> dict:
    """Unsubscribe a page from leadgen."""
    url = f"{GRAPH_API_BASE}/{page_id}/subscribed_apps"
    resp = requests.delete(
        url,
        params={"access_token": page_access_token},
        timeout=15,
    )
    resp.raise_for_status()
    return resp.json()


def get_page_access_token(page_id: str, user_access_token: str) -> str:
    """Get a page access token from the user's long-lived token."""
    url = f"{GRAPH_API_BASE}/{page_id}"
    resp = requests.get(
        url,
        params={
            "fields": "access_token,name",
            "access_token": user_access_token,
        },
        timeout=15,
    )
    resp.raise_for_status()
    data = resp.json()
    return data.get("access_token", "")


def get_page_name(page_id: str, access_token: str) -> str:
    """Get page name from Graph API."""
    url = f"{GRAPH_API_BASE}/{page_id}"
    try:
        resp = requests.get(
            url,
            params={"fields": "name", "access_token": access_token},
            timeout=10,
        )
        resp.raise_for_status()
        return resp.json().get("name", "")
    except Exception:
        return ""


def get_user_pages(user_access_token: str) -> list:
    """List all Facebook pages the user manages."""
    url = f"{GRAPH_API_BASE}/me/accounts"
    pages = []
    params = {"access_token": user_access_token, "limit": 100}
    while url:
        resp = requests.get(url, params=params, timeout=15)
        resp.raise_for_status()
        data = resp.json()
        for page in data.get("data", []):
            pages.append({
                "id": page["id"],
                "name": page.get("name", ""),
                "access_token": page.get("access_token", ""),
            })
        url = data.get("paging", {}).get("next")
        params = {}  # next URL includes params
    return pages


def get_page_leadgen_forms(page_id: str, page_access_token: str) -> list:
    """List all leadgen forms for a page."""
    url = f"{GRAPH_API_BASE}/{page_id}/leadgen_forms"
    resp = requests.get(
        url,
        params={
            "access_token": page_access_token,
            "fields": "id,name,status,leads_count",
        },
        timeout=15,
    )
    resp.raise_for_status()
    return resp.json().get("data", [])


def get_form_leads(form_id: str, access_token: str, since: int = 0) -> list:
    """Fetch recent leads for a form (for polling fallback)."""
    url = f"{GRAPH_API_BASE}/{form_id}/leads"
    params = {"access_token": access_token, "limit": 50}
    if since:
        params["filtering"] = f'[{{"field":"time_created","operator":"GREATER_THAN","value":{since}}}]'
    resp = requests.get(url, params=params, timeout=15)
    resp.raise_for_status()
    return resp.json().get("data", [])
