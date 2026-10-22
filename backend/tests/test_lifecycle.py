from datetime import date, timedelta

from fastapi.testclient import TestClient
from sqlalchemy import inspect, text

from app.core.database import build_engine, init_schema
from tests.conftest import invoice_payload

SEND = {"to": "accounts@alderpine.example", "subject": "Invoice", "message": ""}


def _create(client: TestClient, **overrides: object) -> dict:
    return client.post("/api/invoices", json=invoice_payload(**overrides)).json()


def _kinds(invoice: dict) -> list[str]:
    return [event["kind"] for event in invoice["events"]]


def test_new_invoice_logs_creation(client: TestClient) -> None:
    invoice = _create(client)
    assert invoice["status"] == "draft"
    assert _kinds(invoice) == ["created"]
    assert invoice["changed_since_sent"] is False


def test_editing_a_sent_invoice_flags_it_until_resent(client: TestClient) -> None:
    invoice = _create(client)
    client.post(f"/api/invoices/{invoice['id']}/send", json=SEND)

    edited = client.put(
        f"/api/invoices/{invoice['id']}", json=invoice_payload(notes="Updated terms")
    ).json()
    assert edited["status"] == "sent"
    assert edited["changed_since_sent"] is True
    # A second edit doesn't log the same warning twice.
    again = client.put(f"/api/invoices/{invoice['id']}", json=invoice_payload(notes="x")).json()
    assert _kinds(again).count("edited_after_sent") == 1

    resent = client.post(f"/api/invoices/{invoice['id']}/send", json=SEND).json()
    assert resent["changed_since_sent"] is False
    assert _kinds(resent)[:3] == ["resent", "edited_after_sent", "sent"]


def test_paid_invoices_are_locked_until_marked_unpaid(client: TestClient) -> None:
    invoice = _create(client)
    client.post(f"/api/invoices/{invoice['id']}/send", json=SEND)
    paid = client.post(
        f"/api/invoices/{invoice['id']}/mark-paid", json={"paid_on": "2026-10-05"}
    ).json()
    assert paid["status"] == "paid"
    assert paid["paid_on"] == "2026-10-05"
    assert paid["is_overdue"] is False

    locked = client.put(f"/api/invoices/{invoice['id']}", json=invoice_payload(notes="x"))
    assert locked.status_code == 409
    assert locked.json()["code"] == "invoice_locked"

    reopened = client.post(f"/api/invoices/{invoice['id']}/mark-unpaid").json()
    assert reopened["status"] == "sent"  # it had been sent, so it goes back to sent
    assert reopened["paid_on"] is None
    assert _kinds(reopened)[0] == "reopened"
    assert client.put(f"/api/invoices/{invoice['id']}", json=invoice_payload()).status_code == 200


def test_unsent_invoice_reopens_as_draft(client: TestClient) -> None:
    invoice = _create(client)
    client.post(f"/api/invoices/{invoice['id']}/mark-paid", json={"paid_on": "2026-10-05"})
    assert client.post(f"/api/invoices/{invoice['id']}/mark-unpaid").json()["status"] == "draft"


def test_payment_date_rules(client: TestClient) -> None:
    invoice = _create(client)
    future = (date.today() + timedelta(days=1)).isoformat()
    response = client.post(f"/api/invoices/{invoice['id']}/mark-paid", json={"paid_on": future})
    assert response.status_code == 422
    before_issue = client.post(
        f"/api/invoices/{invoice['id']}/mark-paid", json={"paid_on": "2026-09-01"}
    )
    assert before_issue.status_code == 422
    assert before_issue.json()["detail"][0]["loc"] == ["body", "paid_on"]


def test_mark_paid_twice_and_unpaid_when_not_paid_are_conflicts(client: TestClient) -> None:
    invoice = _create(client)
    assert client.post(f"/api/invoices/{invoice['id']}/mark-unpaid").status_code == 409
    client.post(f"/api/invoices/{invoice['id']}/mark-paid", json={"paid_on": "2026-10-05"})
    twice = client.post(f"/api/invoices/{invoice['id']}/mark-paid", json={"paid_on": "2026-10-05"})
    assert twice.status_code == 409


def test_sent_invoice_past_due_is_overdue(client: TestClient) -> None:
    invoice = _create(client, issue_date="2026-01-01", due_date="2026-01-15")
    assert invoice["is_overdue"] is False  # drafts are never overdue
    sent = client.post(f"/api/invoices/{invoice['id']}/send", json=SEND).json()
    assert sent["is_overdue"] is True
    [summary] = client.get("/api/invoices").json()["items"]
    assert summary["is_overdue"] is True


def test_payment_terms_set_the_due_date(client: TestClient) -> None:
    invoice = _create(client, issue_date="2026-10-01", due_date="2026-10-01", payment_terms_days=30)
    assert invoice["payment_terms_days"] == 30
    assert invoice["due_date"] == "2026-10-31"
    custom = _create(client, number="INV-0002", due_date="2026-10-20", payment_terms_days=None)
    assert custom["due_date"] == "2026-10-20"


def test_schema_upgrade_adds_new_columns_to_an_old_database() -> None:
    engine = build_engine("sqlite://")
    with engine.begin() as connection:
        # An invoices table as the first version created it, without the newer columns.
        connection.execute(
            text(
                "CREATE TABLE invoices (id INTEGER PRIMARY KEY, number VARCHAR(32), "
                "status VARCHAR(16), business_name VARCHAR(120), business_email VARCHAR(254), "
                "business_address TEXT, customer_name VARCHAR(120), customer_email VARCHAR(254),"
                " customer_address TEXT, issue_date DATE, due_date DATE, notes TEXT, "
                "discount VARCHAR(32), tax_rate VARCHAR(32), sent_at DATETIME, "
                "last_sent_to VARCHAR(254), created_at DATETIME, updated_at DATETIME)"
            )
        )
    init_schema(engine)
    columns = {c["name"] for c in inspect(engine).get_columns("invoices")}
    assert {"payment_terms_days", "changed_since_sent", "paid_on"} <= columns
    assert "invoice_events" in inspect(engine).get_table_names()
