from collections.abc import Iterator

import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session, sessionmaker
from sqlalchemy.pool import StaticPool

from app.core.database import Base, build_engine, get_db
from app.main import create_app


@pytest.fixture
def session_factory() -> Iterator[sessionmaker[Session]]:
    engine = build_engine("sqlite://", poolclass=StaticPool)
    Base.metadata.create_all(engine)
    yield sessionmaker(bind=engine, autoflush=False, expire_on_commit=False)
    engine.dispose()


@pytest.fixture
def client(session_factory: sessionmaker[Session]) -> TestClient:
    app = create_app()

    def _db() -> Iterator[Session]:
        with session_factory() as session:
            yield session

    app.dependency_overrides[get_db] = _db
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
