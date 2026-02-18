import os
from typing import Any, Dict, Optional, Union

import requests


class EngineClientError(RuntimeError):
    pass


class EngineClient:
    """
    Minimal HTTP client for chatcube-engine.
    """

    def __init__(self, base_url: Optional[str] = None, timeout: int = 15):
        self.base_url = (base_url or os.getenv("CHATCUBE_ENGINE_URL", "http://chatcube-engine:3100")).rstrip("/")
        self.api_key = os.getenv("CHATCUBE_ENGINE_API_KEY", "chatcube-internal-key-2026")
        self.timeout = timeout
        self.session = requests.Session()
        self.session.headers.update({"X-Engine-Key": self.api_key})

    def _request(
        self,
        method: str,
        path: str,
        *,
        json: Optional[Dict[str, Any]] = None,
        params: Optional[Dict[str, Any]] = None,
    ) -> Dict[str, Any]:
        url = f"{self.base_url}{path}"
        try:
            resp = self.session.request(method, url, json=json, params=params, timeout=self.timeout)
        except requests.RequestException as e:
            raise EngineClientError(f"Engine request error ({method} {url}): {e}") from e

        try:
            data: Union[Dict[str, Any], Any] = resp.json()
        except ValueError:
            data = {"detail": resp.text}

        if resp.status_code >= 400:
            raise EngineClientError(f"Engine request failed ({resp.status_code}) {method} {url}: {data}")

        if isinstance(data, dict):
            return data
        return {"data": data}

    def create_instance(self, payload: Dict[str, Any]) -> Dict[str, Any]:
        # Engine expects "id" and "name" as top-level fields
        engine_payload: Dict[str, Any] = {
            "id": payload.get("instance_id") or payload.get("id"),
            "name": payload.get("name"),
            "engine": payload.get("engine", "baileys"),
        }
        # Pass Cloud API credentials via config
        config: Dict[str, Any] = {}
        if payload.get("phone_number_id"):
            config["phoneNumberId"] = payload["phone_number_id"]
        if payload.get("access_token"):
            config["accessToken"] = payload["access_token"]
        if payload.get("waba_id"):
            config["wabaId"] = payload["waba_id"]
        if config:
            engine_payload["config"] = config
        return self._request("POST", "/api/instances", json=engine_payload)

    def delete_instance(self, engine_instance_id: str) -> Dict[str, Any]:
        return self._request("DELETE", f"/api/instances/{engine_instance_id}")

    def get_qr_code(self, engine_instance_id: str) -> Dict[str, Any]:
        return self._request("GET", f"/api/instances/{engine_instance_id}/qr-code")

    def get_pairing_code(self, engine_instance_id: str, *, phone_number: Optional[str] = None) -> Dict[str, Any]:
        payload: Dict[str, Any] = {}
        if phone_number:
            payload["phone"] = phone_number
        return self._request("POST", f"/api/instances/{engine_instance_id}/pairing-code", json=payload)

    def send_message(
        self,
        engine_instance_id: str,
        *,
        to: str,
        message_type: str = "text",
        content: str = "",
        media_url: Optional[str] = None,
        metadata: Optional[Dict[str, Any]] = None,
    ) -> Dict[str, Any]:
        payload: Dict[str, Any] = {
            "to": to,
            "type": message_type,
            "content": content,
        }
        if media_url:
            payload["mediaUrl"] = media_url
        if metadata:
            payload["metadata"] = metadata
        return self._request("POST", f"/api/messages/{engine_instance_id}/send", json=payload)

    def disconnect(self, engine_instance_id: str) -> Dict[str, Any]:
        return self._request("POST", f"/api/instances/{engine_instance_id}/disconnect")

    def reconnect(self, engine_instance_id: str) -> Dict[str, Any]:
        return self._request("POST", f"/api/instances/{engine_instance_id}/reconnect")

    def get_status(self, engine_instance_id: str) -> Dict[str, Any]:
        # Engine returns status as part of GET /api/instances/:id
        return self._request("GET", f"/api/instances/{engine_instance_id}")

    def get_contacts(self, engine_instance_id: str) -> Dict[str, Any]:
        return self._request("GET", f"/api/instances/{engine_instance_id}/contacts")

    def get_groups(self, engine_instance_id: str) -> Dict[str, Any]:
        return self._request("GET", f"/api/instances/{engine_instance_id}/groups")

    def group_create(self, engine_instance_id: str, subject: str, participants: list) -> Dict[str, Any]:
        return self._request("POST", f"/api/instances/{engine_instance_id}/groups/create", json={"subject": subject, "participants": participants})

    def group_update_subject(self, engine_instance_id: str, jid: str, subject: str) -> Dict[str, Any]:
        return self._request("PATCH", f"/api/instances/{engine_instance_id}/groups/{jid}/subject", json={"subject": subject})

    def group_update_description(self, engine_instance_id: str, jid: str, description: str) -> Dict[str, Any]:
        return self._request("PATCH", f"/api/instances/{engine_instance_id}/groups/{jid}/description", json={"description": description})

    def group_participants_update(self, engine_instance_id: str, jid: str, participants: list, action: str) -> Dict[str, Any]:
        return self._request("POST", f"/api/instances/{engine_instance_id}/groups/{jid}/participants", json={"participants": participants, "action": action})

    def group_metadata(self, engine_instance_id: str, jid: str) -> Dict[str, Any]:
        return self._request("GET", f"/api/instances/{engine_instance_id}/groups/{jid}/metadata")

    def group_invite_code(self, engine_instance_id: str, jid: str) -> Dict[str, Any]:
        return self._request("GET", f"/api/instances/{engine_instance_id}/groups/{jid}/invite-code")

    def group_leave(self, engine_instance_id: str, jid: str) -> Dict[str, Any]:
        return self._request("POST", f"/api/instances/{engine_instance_id}/groups/{jid}/leave")

    def fetch_history(self, engine_instance_id: str, jid: str, count: int = 50) -> Dict[str, Any]:
        return self._request("POST", f"/api/instances/{engine_instance_id}/fetch-history", json={"jid": jid, "count": count})

