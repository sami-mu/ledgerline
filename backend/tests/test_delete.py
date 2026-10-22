from fastapi.testclient import TestClient

from tests.conftest import invoice_payload


def test_delete_hides_the_invoice_and_restore_brings_it_back(client: TestClient) -> None:
    invoice = client.post("/api/invoices", json=invoice_payload()).json()
    url = f"/api/invoices/{invoice['id']}"

    assert client.delete(url).status_code == 204
    assert client.get(url).status_code == 404
    assert client.get("/api/invoices").json()["total"] == 0
    assert client.get("/api/invoices/stats").json()["counts"]["all"] == 0
    assert client.get("/api/customers").json()[0]["invoice_count"] == 0

    restored = client.post(f"{url}/restore")
    assert restored.status_code == 200
    assert client.get(url).json()["number"] == invoice["number"]
    assert client.get("/api/invoices").json()["total"] == 1


def test_deleted_number_stays_reserved(client: TestClient) -> None:
    invoice = client.post("/api/invoices", json=invoice_payload()).json()
    client.delete(f"/api/invoices/{invoice['id']}")
    assert client.post("/api/invoices", json=invoice_payload()).status_code == 409


def test_paid_invoices_cannot_be_deleted(client: TestClient) -> None:
    invoice = client.post("/api/invoices", json=invoice_payload()).json()
    client.post(f"/api/invoices/{invoice['id']}/mark-paid", json={"paid_on": "2026-10-05"})
    response = client.delete(f"/api/invoices/{invoice['id']}")
    assert response.status_code == 409
    assert response.json()["code"] == "invoice_locked"


def test_restore_requires_a_deleted_invoice(client: TestClient) -> None:
    invoice = client.post("/api/invoices", json=invoice_payload()).json()
    assert client.post(f"/api/invoices/{invoice['id']}/restore").status_code == 409
    assert client.post("/api/invoices/999/restore").status_code == 404
