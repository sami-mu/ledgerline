from fastapi.testclient import TestClient
from sqlalchemy import update
from sqlalchemy.orm import Session, sessionmaker

from app.models import Invoice
from app.seed import invoice_service
from tests.conftest import invoice_payload


def _save(client: TestClient, number: str, **customer: str) -> dict:
    response = client.post("/api/invoices", json=invoice_payload(number=number, **customer))
    assert response.status_code == 201, response.json()
    return response.json()


def test_saving_invoices_builds_the_customer_list(client: TestClient) -> None:
    _save(
        client,
        "INV-0001",
        customer_name="Alder & Pine",
        customer_email="ap@alder.example",
        customer_address="18 Market Lane",
    )
    _save(client, "INV-0002", customer_name="Harbor Light", customer_email="")
    # Same email, new name and address: the same customer, with the latest details.
    _save(
        client,
        "INV-0003",
        customer_name="Alder & Pine Coffee",
        customer_email="AP@alder.example",
        customer_address="20 Market Lane",
    )

    customers = client.get("/api/customers").json()
    assert [c["name"] for c in customers] == ["Alder & Pine Coffee", "Harbor Light"]
    alder = customers[0]
    assert alder["address"] == "20 Market Lane"
    assert alder["invoice_count"] == 2


def test_customers_without_email_are_matched_by_name(client: TestClient) -> None:
    _save(client, "INV-0001", customer_name="Harbor  Light", customer_email="")
    _save(client, "INV-0002", customer_name="harbor light", customer_email="")
    assert len(client.get("/api/customers").json()) == 1


def test_customer_search(client: TestClient) -> None:
    _save(client, "INV-0001", customer_name="Alder & Pine", customer_email="ap@alder.example")
    _save(client, "INV-0002", customer_name="Harbor Light", customer_email="ap@harbor.example")
    assert [c["name"] for c in client.get("/api/customers", params={"q": "harb"}).json()] == [
        "Harbor Light"
    ]
    assert len(client.get("/api/customers", params={"q": "ap@"}).json()) == 2
    assert client.get("/api/customers", params={"limit": 50}).status_code == 422


def test_invoice_keeps_its_own_copy_of_customer_details(client: TestClient) -> None:
    first = _save(
        client,
        "INV-0001",
        customer_name="Alder",
        customer_email="ap@alder.example",
        customer_address="Old address",
    )
    _save(
        client,
        "INV-0002",
        customer_name="Alder",
        customer_email="ap@alder.example",
        customer_address="New address",
    )
    assert client.get(f"/api/invoices/{first['id']}").json()["customer_address"] == "Old address"


def test_backfill_links_invoices_from_older_versions(
    client: TestClient, session_factory: sessionmaker[Session]
) -> None:
    invoice = _save(client, "INV-0001", customer_name="Legacy Co", customer_email="")
    with session_factory() as session:
        session.execute(
            update(Invoice)
            .where(Invoice.id == invoice["id"])
            .values(customer_id=None, total_cents=None)
        )
        session.commit()
        assert invoice_service(session).backfill() == 1
        refreshed = session.get(Invoice, invoice["id"])
        assert refreshed is not None
        assert refreshed.customer_id is not None
        assert refreshed.total_cents == 9900
        assert invoice_service(session).backfill() == 0  # nothing left to do


def test_adding_an_email_later_upgrades_the_same_customer(client: TestClient) -> None:
    _save(client, "INV-0001", customer_name="Harbor Light", customer_email="")
    _save(client, "INV-0002", customer_name="Harbor Light", customer_email="ap@harbor.example")
    [customer] = client.get("/api/customers").json()
    assert customer["email"] == "ap@harbor.example"
    assert customer["invoice_count"] == 2
