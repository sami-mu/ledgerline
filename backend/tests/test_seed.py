from fastapi.testclient import TestClient
from sqlalchemy.orm import Session, sessionmaker

from app.seed import seed_demo_data


def test_demo_data_covers_each_status_once(
    client: TestClient, session_factory: sessionmaker[Session]
) -> None:
    with session_factory() as session:
        seed_demo_data(session)
        seed_demo_data(session)  # a second run adds nothing

    items = client.get("/api/invoices", params={"sort": "number", "direction": "asc"}).json()
    statuses = [(i["number"], i["status"], i["is_overdue"]) for i in items["items"]]
    assert statuses == [
        ("INV-0001", "paid", False),
        ("INV-0002", "sent", True),
        ("INV-0003", "draft", False),
    ]
    assert len(client.get("/api/customers").json()) == 2
