import logging
import requests
from requests.auth import HTTPBasicAuth
from django.conf import settings

logger = logging.getLogger(__name__)


class AsteriskARIClient:
    """Client for Asterisk REST Interface (ARI)."""

    def __init__(self):
        self.base_url = getattr(settings, "ASTERISK_ARI_URL", "http://freepbx:8088/ari")
        self.auth = HTTPBasicAuth(
            getattr(settings, "ASTERISK_ARI_USER", "crm_user"),
            getattr(settings, "ASTERISK_ARI_PASSWORD", ""),
        )

    def originate_call(self, from_extension, to_number, caller_id=None):
        """
        Click-to-call: Originate a call from an agent's extension
        to an external number.

        Flow:
        1. Asterisk calls the agent's extension first
        2. When agent picks up, Asterisk dials the external number
        3. Both legs are bridged together
        """
        payload = {
            "endpoint": f"PJSIP/{from_extension}",
            "extension": to_number,
            "context": "from-internal",
            "priority": 1,
            "callerId": caller_id or f'"CRM Call" <{from_extension}>',
            "timeout": 30,
            "app": "crm-telephony",
        }

        try:
            response = requests.post(
                f"{self.base_url}/channels",
                json=payload,
                auth=self.auth,
                timeout=10,
            )
            response.raise_for_status()
            channel_data = response.json()
            logger.info(
                f"Call originated: {from_extension} -> {to_number}, "
                f"Channel: {channel_data.get('id')}"
            )
            return True, channel_data.get("id")
        except requests.exceptions.RequestException as e:
            logger.error(f"ARI originate failed: {e}")
            return False, str(e)

    def get_channel_info(self, channel_id):
        """Get information about an active channel."""
        try:
            response = requests.get(
                f"{self.base_url}/channels/{channel_id}",
                auth=self.auth,
                timeout=5,
            )
            response.raise_for_status()
            return response.json()
        except requests.exceptions.RequestException as e:
            logger.error(f"ARI get channel failed: {e}")
            return None

    def hangup_channel(self, channel_id, reason="normal"):
        """Hang up an active channel."""
        try:
            response = requests.delete(
                f"{self.base_url}/channels/{channel_id}",
                params={"reason": reason},
                auth=self.auth,
                timeout=5,
            )
            response.raise_for_status()
            logger.info(f"Channel {channel_id} hung up")
            return True
        except requests.exceptions.RequestException as e:
            logger.error(f"ARI hangup failed: {e}")
            return False

    def start_recording(self, channel_id, filename):
        """Start recording a channel."""
        payload = {
            "name": filename,
            "format": "wav",
            "ifExists": "overwrite",
            "beep": False,
        }
        try:
            response = requests.post(
                f"{self.base_url}/channels/{channel_id}/record",
                json=payload,
                auth=self.auth,
                timeout=5,
            )
            response.raise_for_status()
            logger.info(f"Recording started for channel {channel_id}")
            return True
        except requests.exceptions.RequestException as e:
            logger.error(f"ARI recording start failed: {e}")
            return False

    def get_active_channels(self):
        """List all active channels."""
        try:
            response = requests.get(
                f"{self.base_url}/channels",
                auth=self.auth,
                timeout=5,
            )
            response.raise_for_status()
            return response.json()
        except requests.exceptions.RequestException as e:
            logger.error(f"ARI list channels failed: {e}")
            return []
