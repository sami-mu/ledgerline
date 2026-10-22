"""SMTP transport behind a protocol, so tests can use a fake."""

from email.message import EmailMessage
from typing import Protocol

import aiosmtplib

from app.core.config import Settings
from app.core.errors import EmailDeliveryError


class EmailSender(Protocol):
    async def send(self, message: EmailMessage) -> None: ...


class SmtpEmailSender:
    def __init__(self, settings: Settings) -> None:
        self.settings = settings

    async def send(self, message: EmailMessage) -> None:
        s = self.settings
        try:
            await aiosmtplib.send(
                message,
                hostname=s.smtp_host,
                port=s.smtp_port,
                username=s.smtp_username or None,
                password=s.smtp_password or None,
                use_tls=s.smtp_security == "ssl",
                start_tls=s.smtp_security == "starttls",
                timeout=s.smtp_timeout_seconds,
            )
        except aiosmtplib.SMTPAuthenticationError as exc:
            raise EmailDeliveryError(
                "The email server rejected the login. Check SMTP_USERNAME and SMTP_PASSWORD."
            ) from exc
        except aiosmtplib.SMTPRecipientsRefused as exc:
            raise EmailDeliveryError("The email server refused this recipient address.") from exc
        except aiosmtplib.SMTPSenderRefused as exc:
            raise EmailDeliveryError(
                "The email server refused the sender. Check MAIL_FROM_ADDRESS is verified."
            ) from exc
        except (aiosmtplib.SMTPException, OSError, TimeoutError) as exc:
            raise EmailDeliveryError(
                "Couldn't reach the email server. Check SMTP_HOST, SMTP_PORT and SMTP_SECURITY."
            ) from exc
