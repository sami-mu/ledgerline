"""Domain errors raised by services. Routes never build HTTP errors by hand."""

from dataclasses import dataclass


class DomainError(Exception):
    status_code = 400
    code = "domain_error"

    def __init__(self, message: str) -> None:
        super().__init__(message)
        self.message = message


class NotFoundError(DomainError):
    status_code = 404
    code = "not_found"


class ConflictError(DomainError):
    status_code = 409
    code = "conflict"


class InvoiceLockedError(DomainError):
    status_code = 409
    code = "invoice_locked"


class EmailNotConfiguredError(DomainError):
    status_code = 503
    code = "email_not_configured"


class EmailDeliveryError(DomainError):
    status_code = 502
    code = "email_delivery_failed"


@dataclass(frozen=True)
class FieldIssue:
    field: tuple[str | int, ...]
    message: str


class BusinessRuleError(DomainError):
    """Cross-field rule failures, rendered like FastAPI's 422 errors."""

    status_code = 422
    code = "validation_error"

    def __init__(self, issues: list[FieldIssue]) -> None:
        super().__init__("; ".join(issue.message for issue in issues))
        self.issues = issues
