from fastapi.testclient import TestClient

from tests.conftest import invoice_payload


def _errors(response) -> dict[str, str]:  # type: ignore[no-untyped-def]
    return {".".join(str(p) for p in e["loc"][1:]): e["msg"] for e in response.json()["detail"]}


def test_create_returns_server_computed_totals(client: TestClient) -> None:
    response = client.post("/api/invoices", json=invoice_payload(totals={"total": "1"}))
    assert response.status_code == 201
    body = response.json()
    assert body["status"] == "draft"
    assert body["totals"] == {
        "subtotal": "100.00",
        "discount": "10.00",
        "tax": "9.00",
        "total": "99.00",
    }
    assert body["line_items"][0]["line_total"] == "100.00"
    assert [f["label"] for f in body["custom_fields"]] == ["PO number", "Internal"]
    assert body["created_at"].endswith("+00:00")


def test_saved_invoice_can_be_retrieved_and_listed(client: TestClient) -> None:
    created = client.post("/api/invoices", json=invoice_payload()).json()
    fetched = client.get(f"/api/invoices/{created['id']}")
    assert fetched.status_code == 200
    assert fetched.json()["number"] == "INV-0001"

    listing = client.get("/api/invoices").json()
    assert listing[0]["id"] == created["id"]
    assert listing[0]["total"] == "99.00"


def test_update_replaces_line_items_and_custom_fields(client: TestClient) -> None:
    created = client.post("/api/invoices", json=invoice_payload()).json()
    payload = invoice_payload(
        discount="0",
        line_items=[
            {"description": "A", "quantity": "1", "unit_price": "10"},
            {"description": "B", "quantity": "1.5", "unit_price": "20"},
        ],
        custom_fields=[],
    )
    updated = client.put(f"/api/invoices/{created['id']}", json=payload).json()
    assert [i["description"] for i in updated["line_items"]] == ["A", "B"]
    assert updated["custom_fields"] == []
    assert updated["totals"]["total"] == "44.00"


def test_delete(client: TestClient) -> None:
    created = client.post("/api/invoices", json=invoice_payload()).json()
    assert client.delete(f"/api/invoices/{created['id']}").status_code == 204
    assert client.get(f"/api/invoices/{created['id']}").status_code == 404


def test_rejects_negative_values(client: TestClient) -> None:
    payload = invoice_payload(
        discount="-1",
        tax_rate="-5",
        line_items=[{"description": "A", "quantity": "-1", "unit_price": "-2"}],
    )
    response = client.post("/api/invoices", json=payload)
    assert response.status_code == 422
    assert {"discount", "tax_rate", "line_items.0.quantity", "line_items.0.unit_price"} <= set(
        _errors(response)
    )


def test_rejects_tax_rate_over_100_and_too_many_decimals(client: TestClient) -> None:
    response = client.post(
        "/api/invoices",
        json=invoice_payload(
            tax_rate="101",
            line_items=[{"description": "A", "quantity": "1", "unit_price": "1.005"}],
        ),
    )
    assert response.status_code == 422
    assert {"tax_rate", "line_items.0.unit_price"} <= set(_errors(response))


def test_rejects_discount_above_subtotal_with_field_location(client: TestClient) -> None:
    response = client.post("/api/invoices", json=invoice_payload(discount="100.01"))
    assert response.status_code == 422
    assert _errors(response) == {"discount": "Discount can't exceed the $100.00 subtotal."}


def test_rejects_due_date_before_issue_date(client: TestClient) -> None:
    response = client.post("/api/invoices", json=invoice_payload(due_date="2026-09-30"))
    assert response.status_code == 422
    assert "due_date" in _errors(response)


def test_rejects_invalid_customer_email_but_allows_empty(client: TestClient) -> None:
    bad = client.post("/api/invoices", json=invoice_payload(customer_email="not-an-email"))
    assert bad.status_code == 422
    ok = client.post("/api/invoices", json=invoice_payload(customer_email=""))
    assert ok.status_code == 201


def test_duplicate_number_is_a_conflict(client: TestClient) -> None:
    client.post("/api/invoices", json=invoice_payload())
    response = client.post("/api/invoices", json=invoice_payload())
    assert response.status_code == 409
    assert response.json()["code"] == "conflict"


def test_next_number_follows_highest_suffix(client: TestClient) -> None:
    assert client.get("/api/invoices/next-number").json() == {"number": "INV-0001"}
    client.post("/api/invoices", json=invoice_payload(number="INV-0009"))
    client.post("/api/invoices", json=invoice_payload(number="INV-0003"))
    assert client.get("/api/invoices/next-number").json() == {"number": "INV-0010"}


def test_missing_invoice_is_404(client: TestClient) -> None:
    response = client.get("/api/invoices/999")
    assert response.status_code == 404
    assert response.json()["code"] == "not_found"
