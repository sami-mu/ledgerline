from collections.abc import Iterator
from email.message import EmailMessage

import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session, sessionmaker
from sqlalchemy.pool import StaticPool

from app.api.deps import get_email_sender
from app.core.config import Settings, get_settings
from app.core.database import Base, build_engine, get_db
from app.core.errors import EmailDeliveryError
from app.main import create_app


class FakeEmailSender:
    """Records messages instead of sending them. Set `fail` to simulate an SMTP error."""

    def __init__(self) -> None:
        self.sent: list[EmailMessage] = []
        self.fail = False

    async def send(self, message: EmailMessage) -> None:
        if self.fail:
            raise EmailDeliveryError("Couldn't reach the email server.")
        self.sent.append(message)


@pytest.fixture
def settings() -> Settings:
    return Settings(
        _env_file=None,  # type: ignore[call-arg]
        smtp_host="smtp.test",
        mail_from_address="invoices@fieldnote.example",
        mail_from_name="Fieldnote Studio",
    )


@pytest.fixture
def email_sender() -> FakeEmailSender:
    return FakeEmailSender()


@pytest.fixture
def session_factory() -> Iterator[sessionmaker[Session]]:
    engine = build_engine("sqlite://", poolclass=StaticPool)
    Base.metadata.create_all(engine)
    yield sessionmaker(bind=engine, autoflush=False, expire_on_commit=False)
    engine.dispose()


@pytest.fixture
def client(
    session_factory: sessionmaker[Session], settings: Settings, email_sender: FakeEmailSender
) -> TestClient:
    app = create_app()

    def _db() -> Iterator[Session]:
        with session_factory() as session:
            yield session

    app.dependency_overrides[get_db] = _db
    app.dependency_overrides[get_settings] = lambda: settings
    app.dependency_overrides[get_email_sender] = lambda: email_sender
    # Not used as a context manager, so the lifespan (real DB + seed) never runs.
    return TestClient(app)


def invoice_payload(**overrides: object) -> dict[str, object]:
    payload: dict[str, object] = {
        "number": "INV-0001",
        "business_name": "Fieldnote Studio",
        "customer_name": "Alder & Pine Coffee Co.",
        "customer_email": "accounts@alderpine.example",
        "issue_date": "2026-10-01",
        "due_date": "2026-10-15",
        "discount": "10",
        "tax_rate": "10",
        "line_items": [{"description": "Design work", "quantity": "2", "unit_price": "50"}],
        "custom_fields": [
            {"label": "PO number", "value": "AP-1", "visible": True},
            {"label": "Internal", "value": "x", "visible": False},
        ],
    }
    payload.update(overrides)
    return payload
