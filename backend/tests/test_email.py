from io import BytesIO

from fastapi.testclient import TestClient
from pypdf import PdfReader

from app.core.config import Settings
from tests.conftest import FakeEmailSender, invoice_payload

SEND = {"to": "accounts@alderpine.example", "subject": "Invoice INV-0001", "message": "Hi there"}


def _create(client: TestClient) -> int:
    return client.post("/api/invoices", json=invoice_payload()).json()["id"]


def test_send_delivers_email_and_marks_invoice_sent(
    client: TestClient, email_sender: FakeEmailSender
) -> None:
    invoice_id = _create(client)
    response = client.post(f"/api/invoices/{invoice_id}/send", json=SEND)

    assert response.status_code == 200
    body = response.json()
    assert body["status"] == "sent"
    assert body["last_sent_to"] == SEND["to"]
    assert body["sent_at"] is not None

    [message] = email_sender.sent
    assert message["To"] == SEND["to"]
    assert message["Subject"] == "Invoice INV-0001"
    assert message["From"] == "Fieldnote Studio <invoices@fieldnote.example>"
    html = message.get_body(preferencelist=("html",)).get_content()
    text = message.get_body(preferencelist=("plain",)).get_content()
    for part in (html, text):
        assert "$99.00" in part
        assert "Hi there" in part
        assert "INV-0001.pdf" in part

    [attachment] = list(message.iter_attachments())
    assert attachment.get_content_type() == "application/pdf"
    assert attachment.get_filename() == "INV-0001.pdf"
    pdf = attachment.get_content()
    assert pdf.startswith(b"%PDF")
    pdf_text = "\n".join(page.extract_text() for page in PdfReader(BytesIO(pdf)).pages)
    assert "$99.00" in pdf_text
    assert "PO number" in pdf_text
    assert "Internal" not in pdf_text  # hidden custom field never leaves the app


def test_send_escapes_user_content_in_html_and_pdf(
    client: TestClient, email_sender: FakeEmailSender
) -> None:
    payload = invoice_payload(
        customer_name="<script>alert(1)</script>", business_name='Quote " & Co </style>'
    )
    invoice_id = client.post("/api/invoices", json=payload).json()["id"]
    assert client.post(f"/api/invoices/{invoice_id}/send", json=SEND).status_code == 200
    message = email_sender.sent[0]
    html = message.get_body(preferencelist=("html",)).get_content()
    assert "<script>" not in html
    assert "&lt;script&gt;" in html
    pdf = next(message.iter_attachments()).get_content()
    pdf_text = "\n".join(page.extract_text() for page in PdfReader(BytesIO(pdf)).pages)
    assert "<script>alert(1)</script>" in pdf_text  # shown as text, not executed
    assert 'Quote " & Co </style>' in pdf_text  # survives the CSS page footer escaping


def test_send_reports_missing_smtp_configuration(
    client: TestClient, settings: Settings, email_sender: FakeEmailSender
) -> None:
    settings.smtp_host = ""
    invoice_id = _create(client)
    response = client.post(f"/api/invoices/{invoice_id}/send", json=SEND)
    assert response.status_code == 503
    assert response.json()["code"] == "email_not_configured"
    assert email_sender.sent == []


def test_send_failure_keeps_invoice_as_draft(
    client: TestClient, email_sender: FakeEmailSender
) -> None:
    email_sender.fail = True
    invoice_id = _create(client)
    response = client.post(f"/api/invoices/{invoice_id}/send", json=SEND)
    assert response.status_code == 502
    assert response.json()["code"] == "email_delivery_failed"
    assert client.get(f"/api/invoices/{invoice_id}").json()["status"] == "draft"


def test_send_validates_recipient(client: TestClient) -> None:
    invoice_id = _create(client)
    response = client.post(
        f"/api/invoices/{invoice_id}/send", json={**SEND, "to": "not-an-address"}
    )
    assert response.status_code == 422


def test_send_unknown_invoice_is_404(client: TestClient) -> None:
    assert client.post("/api/invoices/999/send", json=SEND).status_code == 404
