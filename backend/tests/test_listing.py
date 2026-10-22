from datetime import date, timedelta

import pytest
from fastapi.testclient import TestClient

from tests.conftest import invoice_payload

SEND = {"to": "a@b.example", "subject": "Invoice", "message": ""}
TODAY = date.today()


def _create(client: TestClient, number: str, **overrides: object) -> dict:
    # Due in two weeks unless a test says otherwise, so nothing is overdue by accident.
    dates = {"issue_date": TODAY.isoformat(), "due_date": (TODAY + timedelta(days=14)).isoformat()}
    payload = invoice_payload(number=number, **{**dates, **overrides})
    response = client.post("/api/invoices", json=payload)
    assert response.status_code == 201, response.json()
    return response.json()


def _price(amount: str) -> list[dict[str, str]]:
    return [{"description": "Work", "quantity": "1", "unit_price": amount}]


def _seed(client: TestClient) -> None:
    long_ago = (TODAY - timedelta(days=60)).isoformat()
    past_due = (TODAY - timedelta(days=30)).isoformat()
    _create(
        client,
        "INV-0001",
        customer_name="Alder & Pine",
        line_items=_price("100"),
        discount="0",
        tax_rate="0",
    )
    sent = _create(
        client,
        "INV-0002",
        customer_name="Harbor Light",
        line_items=_price("9.5"),
        discount="0",
        tax_rate="0",
        customer_email="ap@harbor.example",
    )
    late = _create(
        client,
        "INV-0003",
        customer_name="Northwind 50% Off",
        line_items=_price("40"),
        discount="0",
        tax_rate="0",
        issue_date=long_ago,
        due_date=past_due,
    )
    paid = _create(
        client,
        "INV-0004",
        customer_name="Juniper",
        line_items=_price("1000"),
        discount="0",
        tax_rate="0",
    )
    client.post(f"/api/invoices/{sent['id']}/send", json=SEND)
    client.post(f"/api/invoices/{late['id']}/send", json=SEND)
    client.post(f"/api/invoices/{paid['id']}/mark-paid", json={"paid_on": TODAY.isoformat()})


def _numbers(client: TestClient, **params: object) -> list[str]:
    response = client.get("/api/invoices", params=params)
    assert response.status_code == 200, response.json()
    return [item["number"] for item in response.json()["items"]]


@pytest.mark.parametrize(
    ("q", "expected"),
    [
        ("inv-0003", ["INV-0003"]),  # number, any case
        ("HARBOR", ["INV-0002"]),  # customer name
        ("ap@harbor", ["INV-0002"]),  # customer email
        ("50%", ["INV-0003"]),  # % is literal, not a wildcard
        ("_", []),
        ("nothing like this", []),
    ],
)
def test_search(client: TestClient, q: str, expected: list[str]) -> None:
    _seed(client)
    assert _numbers(client, q=q) == expected


def test_status_filters(client: TestClient) -> None:
    _seed(client)
    assert _numbers(client, status="draft") == ["INV-0001"]
    assert sorted(_numbers(client, status="outstanding")) == ["INV-0002", "INV-0003"]
    assert _numbers(client, status="overdue") == ["INV-0003"]
    assert _numbers(client, status="paid") == ["INV-0004"]


def test_sorting_by_amount_is_numeric_and_stable(client: TestClient) -> None:
    _seed(client)
    # 9.50 < 40 < 100 < 1000: as text "9.50" would sort last.
    assert _numbers(client, sort="total", direction="asc") == [
        "INV-0002",
        "INV-0003",
        "INV-0001",
        "INV-0004",
    ]
    assert _numbers(client, sort="status", direction="asc")[0] == "INV-0003"  # overdue first
    assert _numbers(client, sort="customer", direction="asc")[0] == "INV-0001"  # Alder


def test_pagination(client: TestClient) -> None:
    for n in range(1, 8):
        _create(client, f"INV-{n:04d}")
    first = client.get(
        "/api/invoices", params={"page_size": 3, "sort": "number", "direction": "asc"}
    ).json()
    assert (first["total"], first["pages"], first["page"]) == (7, 3, 1)
    assert first["total_amount"] == "693.00"  # all seven invoices, not just this page
    assert [i["number"] for i in first["items"]] == ["INV-0001", "INV-0002", "INV-0003"]
    last = client.get(
        "/api/invoices", params={"page_size": 3, "page": 3, "sort": "number", "direction": "asc"}
    ).json()
    assert [i["number"] for i in last["items"]] == ["INV-0007"]
    beyond = client.get("/api/invoices", params={"page_size": 3, "page": 9}).json()
    assert beyond["items"] == [] and beyond["total"] == 7


def test_invalid_list_parameters_are_rejected(client: TestClient) -> None:
    for params in (
        {"page": 0},
        {"page_size": 101},
        {"sort": "password"},
        {"status": "archived"},
        {"direction": "sideways"},
        {"unexpected": "1"},
    ):
        assert client.get("/api/invoices", params=params).status_code == 422, params


def test_stats_cover_every_invoice_not_just_one_page(client: TestClient) -> None:
    _seed(client)
    stats = client.get("/api/invoices/stats").json()
    assert stats["as_of"] == TODAY.isoformat()
    assert stats["outstanding"] == {"count": 2, "total": "49.50"}
    assert stats["overdue"] == {"count": 1, "total": "40.00"}
    assert stats["paid_this_month"] == {"count": 1, "total": "1000.00"}
    assert stats["drafts"] == {"count": 1, "total": "100.00"}
    assert stats["counts"] == {"all": 4, "draft": 1, "outstanding": 2, "overdue": 1, "paid": 1}


def test_stored_total_follows_edits(client: TestClient) -> None:
    invoice = _create(client, "INV-0001", line_items=_price("10"), discount="0", tax_rate="0")
    client.put(
        f"/api/invoices/{invoice['id']}",
        json=invoice_payload(line_items=_price("25"), discount="0", tax_rate="0"),
    )
    [summary] = client.get("/api/invoices").json()["items"]
    assert summary["total"] == "25.00"
