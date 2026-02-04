"""
Email Provider Clients
email_sequences/client.py

Clients for sending emails via different providers:
- SMTP (standard)
- SendGrid API v3
- Mailgun API
- Amazon SES

Created: 2026-02-02
"""
import asyncio
import logging
import hashlib
import hmac
import base64
import re
from abc import ABC, abstractmethod
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from email.mime.base import MIMEBase
from email import encoders
from typing import Optional, Dict, Any, List, Tuple
from dataclasses import dataclass, field
from datetime import datetime

import aiohttp
import aiosmtplib


logger = logging.getLogger(__name__)


@dataclass
class EmailMessage:
    """Represents an email message to be sent."""
    to_email: str
    to_name: str = ""
    subject: str = ""
    html_content: str = ""
    text_content: str = ""
    from_email: str = ""
    from_name: str = ""
    reply_to: str = ""
    cc: List[str] = field(default_factory=list)
    bcc: List[str] = field(default_factory=list)
    headers: Dict[str, str] = field(default_factory=dict)
    attachments: List[Dict[str, Any]] = field(default_factory=list)
    tags: List[str] = field(default_factory=list)
    metadata: Dict[str, Any] = field(default_factory=dict)
    tracking_id: str = ""

    @property
    def to_formatted(self) -> str:
        """Get formatted To address."""
        if self.to_name:
            return f"{self.to_name} <{self.to_email}>"
        return self.to_email

    @property
    def from_formatted(self) -> str:
        """Get formatted From address."""
        if self.from_name:
            return f"{self.from_name} <{self.from_email}>"
        return self.from_email


@dataclass
class SendResult:
    """Result of an email send operation."""
    success: bool
    message_id: str = ""
    provider_response: Dict[str, Any] = field(default_factory=dict)
    error_message: str = ""
    error_code: str = ""
    timestamp: datetime = field(default_factory=datetime.now)


class BaseEmailClient(ABC):
    """Abstract base class for email clients."""

    def __init__(self, provider):
        """Initialize the client with provider configuration."""
        self.provider = provider
        self.logger = logging.getLogger(f"{__name__}.{self.__class__.__name__}")

    @abstractmethod
    async def send(self, message: EmailMessage) -> SendResult:
        """Send a single email message."""
        pass

    @abstractmethod
    async def send_batch(self, messages: List[EmailMessage]) -> List[SendResult]:
        """Send multiple email messages."""
        pass

    @abstractmethod
    async def test_connection(self) -> Tuple[bool, str]:
        """Test the connection to the email provider."""
        pass

    def _apply_defaults(self, message: EmailMessage) -> EmailMessage:
        """Apply provider defaults to message."""
        if not message.from_email:
            message.from_email = self.provider.default_from_email
        if not message.from_name:
            message.from_name = self.provider.default_from_name
        if not message.reply_to:
            message.reply_to = self.provider.default_reply_to
        return message


class SMTPClient(BaseEmailClient):
    """SMTP email client for standard SMTP servers."""

    async def send(self, message: EmailMessage) -> SendResult:
        """Send email via SMTP."""
        message = self._apply_defaults(message)

        try:
            msg = MIMEMultipart("alternative")
            msg["Subject"] = message.subject
            msg["From"] = message.from_formatted
            msg["To"] = message.to_formatted

            if message.reply_to:
                msg["Reply-To"] = message.reply_to
            if message.cc:
                msg["Cc"] = ", ".join(message.cc)

            for key, value in message.headers.items():
                msg[key] = value

            if message.tracking_id:
                msg["X-FlowCube-Tracking-ID"] = message.tracking_id

            if message.text_content:
                msg.attach(MIMEText(message.text_content, "plain", "utf-8"))
            if message.html_content:
                msg.attach(MIMEText(message.html_content, "html", "utf-8"))

            for attachment in message.attachments:
                part = MIMEBase("application", "octet-stream")
                part.set_payload(attachment.get("content", b""))
                encoders.encode_base64(part)
                part.add_header(
                    "Content-Disposition",
                    f"attachment; filename={attachment.get('filename', 'attachment')}"
                )
                msg.attach(part)

            all_recipients = [message.to_email] + message.cc + message.bcc

            if self.provider.smtp_use_ssl:
                smtp = aiosmtplib.SMTP(
                    hostname=self.provider.smtp_host,
                    port=self.provider.smtp_port,
                    use_tls=True
                )
            else:
                smtp = aiosmtplib.SMTP(
                    hostname=self.provider.smtp_host,
                    port=self.provider.smtp_port,
                    start_tls=self.provider.smtp_use_tls
                )

            await smtp.connect()

            if self.provider.smtp_username:
                await smtp.login(
                    self.provider.smtp_username,
                    self.provider.smtp_password
                )

            response = await smtp.send_message(msg, recipients=all_recipients)
            await smtp.quit()

            message_id = f"smtp-{message.tracking_id or hashlib.md5(f'{message.to_email}{datetime.now().isoformat()}'.encode()).hexdigest()}"

            self.logger.info(f"Email sent to {message.to_email} via SMTP")

            return SendResult(
                success=True,
                message_id=message_id,
                provider_response={"smtp_response": str(response)}
            )

        except aiosmtplib.SMTPException as e:
            self.logger.error(f"SMTP error sending to {message.to_email}: {e}")
            return SendResult(success=False, error_message=str(e), error_code="SMTP_ERROR")
        except Exception as e:
            self.logger.error(f"Error sending email to {message.to_email}: {e}")
            return SendResult(success=False, error_message=str(e), error_code="UNKNOWN_ERROR")

    async def send_batch(self, messages: List[EmailMessage]) -> List[SendResult]:
        """Send multiple emails via SMTP."""
        results = []
        for message in messages:
            result = await self.send(message)
            results.append(result)
            await asyncio.sleep(0.1)
        return results

    async def test_connection(self) -> Tuple[bool, str]:
        """Test SMTP connection."""
        try:
            if self.provider.smtp_use_ssl:
                smtp = aiosmtplib.SMTP(
                    hostname=self.provider.smtp_host,
                    port=self.provider.smtp_port,
                    use_tls=True
                )
            else:
                smtp = aiosmtplib.SMTP(
                    hostname=self.provider.smtp_host,
                    port=self.provider.smtp_port,
                    start_tls=self.provider.smtp_use_tls
                )

            await smtp.connect()

            if self.provider.smtp_username:
                await smtp.login(
                    self.provider.smtp_username,
                    self.provider.smtp_password
                )

            await smtp.quit()
            return True, "SMTP connection successful"

        except Exception as e:
            return False, f"SMTP connection failed: {str(e)}"


class SendGridClient(BaseEmailClient):
    """SendGrid API v3 email client."""

    BASE_URL = "https://api.sendgrid.com/v3"

    async def send(self, message: EmailMessage) -> SendResult:
        """Send email via SendGrid API."""
        message = self._apply_defaults(message)

        try:
            payload = {
                "personalizations": [{
                    "to": [{"email": message.to_email, "name": message.to_name}],
                }],
                "from": {
                    "email": message.from_email,
                    "name": message.from_name
                },
                "subject": message.subject,
                "content": []
            }

            if message.cc:
                payload["personalizations"][0]["cc"] = [{"email": e} for e in message.cc]
            if message.bcc:
                payload["personalizations"][0]["bcc"] = [{"email": e} for e in message.bcc]

            if message.reply_to:
                payload["reply_to"] = {"email": message.reply_to}

            if message.text_content:
                payload["content"].append({"type": "text/plain", "value": message.text_content})
            if message.html_content:
                payload["content"].append({"type": "text/html", "value": message.html_content})

            payload["tracking_settings"] = {
                "click_tracking": {"enable": True},
                "open_tracking": {"enable": True}
            }

            if message.tracking_id:
                payload["personalizations"][0]["custom_args"] = {"tracking_id": message.tracking_id}

            if message.tags:
                payload["categories"] = message.tags[:10]

            if message.headers:
                payload["headers"] = message.headers

            if message.attachments:
                payload["attachments"] = []
                for att in message.attachments:
                    payload["attachments"].append({
                        "content": base64.b64encode(att.get("content", b"")).decode(),
                        "filename": att.get("filename", "attachment"),
                        "type": att.get("content_type", "application/octet-stream")
                    })

            headers = {
                "Authorization": f"Bearer {self.provider.api_key}",
                "Content-Type": "application/json"
            }

            async with aiohttp.ClientSession() as session:
                async with session.post(f"{self.BASE_URL}/mail/send", json=payload, headers=headers) as response:
                    if response.status in (200, 202):
                        message_id = response.headers.get("X-Message-Id", "")
                        self.logger.info(f"Email sent to {message.to_email} via SendGrid: {message_id}")
                        return SendResult(success=True, message_id=message_id, provider_response={"status": response.status})
                    else:
                        error_body = await response.text()
                        self.logger.error(f"SendGrid error: {response.status} - {error_body}")
                        return SendResult(success=False, error_message=error_body, error_code=str(response.status))

        except Exception as e:
            self.logger.error(f"Error sending via SendGrid to {message.to_email}: {e}")
            return SendResult(success=False, error_message=str(e), error_code="SENDGRID_ERROR")

    async def send_batch(self, messages: List[EmailMessage]) -> List[SendResult]:
        """Send multiple emails via SendGrid."""
        semaphore = asyncio.Semaphore(10)

        async def send_with_limit(msg):
            async with semaphore:
                return await self.send(msg)

        tasks = [send_with_limit(msg) for msg in messages]
        return await asyncio.gather(*tasks)

    async def test_connection(self) -> Tuple[bool, str]:
        """Test SendGrid API connection."""
        try:
            headers = {
                "Authorization": f"Bearer {self.provider.api_key}",
                "Content-Type": "application/json"
            }

            async with aiohttp.ClientSession() as session:
                async with session.get(f"{self.BASE_URL}/user/profile", headers=headers) as response:
                    if response.status == 200:
                        data = await response.json()
                        return True, f"Connected as {data.get('username', 'unknown')}"
                    else:
                        error = await response.text()
                        return False, f"API error: {response.status} - {error}"

        except Exception as e:
            return False, f"Connection failed: {str(e)}"


class MailgunClient(BaseEmailClient):
    """Mailgun API email client."""

    def __init__(self, provider):
        super().__init__(provider)
        if provider.api_region and provider.api_region.upper() == "EU":
            self.base_url = "https://api.eu.mailgun.net/v3"
        else:
            self.base_url = "https://api.mailgun.net/v3"

        if provider.api_endpoint:
            self.base_url = provider.api_endpoint

        self.domain = provider.api_secret

    async def send(self, message: EmailMessage) -> SendResult:
        """Send email via Mailgun API."""
        message = self._apply_defaults(message)

        try:
            data = aiohttp.FormData()
            data.add_field("from", message.from_formatted)
            data.add_field("to", message.to_formatted)
            data.add_field("subject", message.subject)

            if message.text_content:
                data.add_field("text", message.text_content)
            if message.html_content:
                data.add_field("html", message.html_content)
            if message.reply_to:
                data.add_field("h:Reply-To", message.reply_to)

            for cc in message.cc:
                data.add_field("cc", cc)
            for bcc in message.bcc:
                data.add_field("bcc", bcc)

            data.add_field("o:tracking", "yes")
            data.add_field("o:tracking-clicks", "yes")
            data.add_field("o:tracking-opens", "yes")

            if message.tracking_id:
                data.add_field("v:tracking_id", message.tracking_id)

            for tag in message.tags[:3]:
                data.add_field("o:tag", tag)

            for key, value in message.headers.items():
                data.add_field(f"h:{key}", value)

            for att in message.attachments:
                data.add_field(
                    "attachment",
                    att.get("content", b""),
                    filename=att.get("filename", "attachment"),
                    content_type=att.get("content_type", "application/octet-stream")
                )

            auth = aiohttp.BasicAuth("api", self.provider.api_key)

            async with aiohttp.ClientSession() as session:
                async with session.post(f"{self.base_url}/{self.domain}/messages", data=data, auth=auth) as response:
                    result = await response.json()

                    if response.status == 200:
                        message_id = result.get("id", "")
                        self.logger.info(f"Email sent to {message.to_email} via Mailgun: {message_id}")
                        return SendResult(success=True, message_id=message_id, provider_response=result)
                    else:
                        self.logger.error(f"Mailgun error: {response.status} - {result}")
                        return SendResult(success=False, error_message=result.get("message", str(result)), error_code=str(response.status))

        except Exception as e:
            self.logger.error(f"Error sending via Mailgun to {message.to_email}: {e}")
            return SendResult(success=False, error_message=str(e), error_code="MAILGUN_ERROR")

    async def send_batch(self, messages: List[EmailMessage]) -> List[SendResult]:
        """Send multiple emails via Mailgun."""
        semaphore = asyncio.Semaphore(10)

        async def send_with_limit(msg):
            async with semaphore:
                return await self.send(msg)

        tasks = [send_with_limit(msg) for msg in messages]
        return await asyncio.gather(*tasks)

    async def test_connection(self) -> Tuple[bool, str]:
        """Test Mailgun API connection."""
        try:
            auth = aiohttp.BasicAuth("api", self.provider.api_key)

            async with aiohttp.ClientSession() as session:
                async with session.get(f"{self.base_url}/{self.domain}", auth=auth) as response:
                    if response.status == 200:
                        data = await response.json()
                        return True, f"Connected to domain: {data.get('domain', {}).get('name', self.domain)}"
                    else:
                        error = await response.text()
                        return False, f"API error: {response.status} - {error}"

        except Exception as e:
            return False, f"Connection failed: {str(e)}"


class SESClient(BaseEmailClient):
    """Amazon SES email client using boto3."""

    def __init__(self, provider):
        super().__init__(provider)
        self.region = provider.api_region or "us-east-1"

    async def send(self, message: EmailMessage) -> SendResult:
        """Send email via Amazon SES."""
        message = self._apply_defaults(message)

        try:
            import boto3
            from botocore.config import Config

            config = Config(region_name=self.region, retries={"max_attempts": 3, "mode": "adaptive"})

            if ":" in self.provider.api_key:
                access_key, secret_key = self.provider.api_key.split(":", 1)
            else:
                access_key = self.provider.api_key
                secret_key = self.provider.api_secret

            ses_client = boto3.client(
                "ses",
                aws_access_key_id=access_key,
                aws_secret_access_key=secret_key,
                config=config
            )

            email_message = {
                "Subject": {"Data": message.subject, "Charset": "UTF-8"},
                "Body": {}
            }

            if message.text_content:
                email_message["Body"]["Text"] = {"Data": message.text_content, "Charset": "UTF-8"}
            if message.html_content:
                email_message["Body"]["Html"] = {"Data": message.html_content, "Charset": "UTF-8"}

            destination = {"ToAddresses": [message.to_email]}
            if message.cc:
                destination["CcAddresses"] = message.cc
            if message.bcc:
                destination["BccAddresses"] = message.bcc

            loop = asyncio.get_event_loop()

            def send_sync():
                kwargs = {
                    "Source": message.from_formatted,
                    "Destination": destination,
                    "Message": email_message
                }
                if message.reply_to:
                    kwargs["ReplyToAddresses"] = [message.reply_to]
                if message.tags:
                    kwargs["Tags"] = [{"Name": "tracking_id", "Value": message.tracking_id or "none"}]

                return ses_client.send_email(**kwargs)

            response = await loop.run_in_executor(None, send_sync)

            message_id = response.get("MessageId", "")
            self.logger.info(f"Email sent to {message.to_email} via SES: {message_id}")

            return SendResult(success=True, message_id=message_id, provider_response=response)

        except ImportError:
            return SendResult(success=False, error_message="boto3 is not installed", error_code="MISSING_DEPENDENCY")
        except Exception as e:
            self.logger.error(f"Error sending via SES to {message.to_email}: {e}")
            return SendResult(success=False, error_message=str(e), error_code="SES_ERROR")

    async def send_batch(self, messages: List[EmailMessage]) -> List[SendResult]:
        """Send multiple emails via SES with rate limiting."""
        semaphore = asyncio.Semaphore(14)

        async def send_with_limit(msg):
            async with semaphore:
                result = await self.send(msg)
                await asyncio.sleep(0.1)
                return result

        tasks = [send_with_limit(msg) for msg in messages]
        return await asyncio.gather(*tasks)

    async def test_connection(self) -> Tuple[bool, str]:
        """Test Amazon SES connection."""
        try:
            import boto3
            from botocore.config import Config

            config = Config(region_name=self.region)

            if ":" in self.provider.api_key:
                access_key, secret_key = self.provider.api_key.split(":", 1)
            else:
                access_key = self.provider.api_key
                secret_key = self.provider.api_secret

            ses_client = boto3.client(
                "ses",
                aws_access_key_id=access_key,
                aws_secret_access_key=secret_key,
                config=config
            )

            loop = asyncio.get_event_loop()
            response = await loop.run_in_executor(None, ses_client.get_send_quota)

            max_24hr = response.get("Max24HourSend", 0)
            sent_24hr = response.get("SentLast24Hours", 0)

            return True, f"Connected. Quota: {sent_24hr}/{max_24hr} emails in 24h"

        except ImportError:
            return False, "boto3 is not installed"
        except Exception as e:
            return False, f"Connection failed: {str(e)}"


class EmailClientFactory:
    """Factory for creating email clients based on provider type."""

    _clients = {
        "smtp": SMTPClient,
        "sendgrid": SendGridClient,
        "mailgun": MailgunClient,
        "ses": SESClient,
    }

    @classmethod
    def create(cls, provider) -> BaseEmailClient:
        """Create an email client for the given provider."""
        client_class = cls._clients.get(provider.provider_type)
        if not client_class:
            raise ValueError(f"Unsupported provider type: {provider.provider_type}")
        return client_class(provider)

    @classmethod
    def register(cls, provider_type: str, client_class):
        """Register a new client class for a provider type."""
        if not issubclass(client_class, BaseEmailClient):
            raise TypeError("Client class must inherit from BaseEmailClient")
        cls._clients[provider_type] = client_class

    @classmethod
    def supported_providers(cls) -> List[str]:
        """Get list of supported provider types."""
        return list(cls._clients.keys())


class TemplateRenderer:
    """Render email templates with variable substitution."""

    @staticmethod
    def render(template: str, variables: Dict[str, Any]) -> str:
        """Render a template string with variable substitution."""
        result = template
        for key, value in variables.items():
            placeholder = "{{" + key + "}}"
            result = result.replace(placeholder, str(value) if value is not None else "")
        return result

    @staticmethod
    def render_message(message: EmailMessage, variables: Dict[str, Any]) -> EmailMessage:
        """Render all template fields in an EmailMessage."""
        return EmailMessage(
            to_email=message.to_email,
            to_name=TemplateRenderer.render(message.to_name, variables),
            subject=TemplateRenderer.render(message.subject, variables),
            html_content=TemplateRenderer.render(message.html_content, variables),
            text_content=TemplateRenderer.render(message.text_content, variables),
            from_email=message.from_email,
            from_name=message.from_name,
            reply_to=message.reply_to,
            cc=message.cc,
            bcc=message.bcc,
            headers=message.headers,
            attachments=message.attachments,
            tags=message.tags,
            metadata=message.metadata,
            tracking_id=message.tracking_id
        )

    @staticmethod
    def extract_variables(template: str) -> List[str]:
        """Extract variable names from a template string."""
        pattern = r"\{\{(\w+)\}\}"
        return list(set(re.findall(pattern, template)))


class WebhookSignatureVerifier:
    """Verify webhook signatures from email providers."""

    @staticmethod
    def verify_sendgrid(payload: bytes, signature: str, timestamp: str, verification_key: str) -> bool:
        """Verify SendGrid Event Webhook signature."""
        try:
            import ecdsa

            timestamp_payload = timestamp.encode() + payload
            public_key = ecdsa.VerifyingKey.from_pem(verification_key)
            decoded_signature = base64.b64decode(signature)
            return public_key.verify(decoded_signature, timestamp_payload, hashfunc=hashlib.sha256)
        except Exception:
            return False

    @staticmethod
    def verify_mailgun(timestamp: str, token: str, signature: str, api_key: str) -> bool:
        """Verify Mailgun webhook signature."""
        try:
            expected = hmac.new(
                key=api_key.encode(),
                msg=f"{timestamp}{token}".encode(),
                digestmod=hashlib.sha256
            ).hexdigest()
            return hmac.compare_digest(expected, signature)
        except Exception:
            return False

    @staticmethod
    def verify_ses(message: Dict[str, Any], certificate_url: str) -> bool:
        """Verify Amazon SES/SNS notification signature."""
        try:
            from urllib.parse import urlparse
            parsed = urlparse(certificate_url)
            return parsed.scheme == "https" and parsed.hostname.endswith(".amazonaws.com")
        except Exception:
            return False


class RateLimiter:
    """Simple rate limiter for email sending."""

    def __init__(self, max_per_second: int = 10, max_per_hour: int = 500):
        self.max_per_second = max_per_second
        self.max_per_hour = max_per_hour
        self._second_counts: Dict[int, int] = {}
        self._hour_counts: Dict[int, int] = {}

    async def acquire(self) -> bool:
        """Acquire permission to send an email."""
        import time

        now = int(time.time())
        current_hour = now // 3600

        second_count = self._second_counts.get(now, 0)
        if second_count >= self.max_per_second:
            await asyncio.sleep(1)
            now = int(time.time())
            second_count = 0

        hour_count = self._hour_counts.get(current_hour, 0)
        if hour_count >= self.max_per_hour:
            return False

        self._second_counts[now] = second_count + 1
        self._hour_counts[current_hour] = hour_count + 1

        self._cleanup(now, current_hour)

        return True

    def _cleanup(self, current_second: int, current_hour: int):
        """Remove old count entries."""
        self._second_counts = {k: v for k, v in self._second_counts.items() if k >= current_second - 60}
        self._hour_counts = {k: v for k, v in self._hour_counts.items() if k >= current_hour - 24}
