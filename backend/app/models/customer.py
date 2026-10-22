from datetime import datetime

from sqlalchemy import DateTime, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base
from app.models.invoice import utc_now


class Customer(Base):
    """Someone you bill. Kept up to date from the invoices you save."""

    __tablename__ = "customers"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    # Email when known, otherwise the name, lower-cased. One customer per key.
    match_key: Mapped[str] = mapped_column(String(260), unique=True)
    name: Mapped[str] = mapped_column(String(120))
    email: Mapped[str] = mapped_column(String(254), default="")
    address: Mapped[str] = mapped_column(Text, default="")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now)
    last_used_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utc_now, index=True
    )

    @staticmethod
    def key_for(name: str, email: str) -> str:
        email = email.strip().lower()
        return f"email:{email}" if email else f"name:{' '.join(name.lower().split())}"
