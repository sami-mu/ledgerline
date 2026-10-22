from typing import Annotated

from pydantic import BaseModel, ConfigDict, Field, StringConstraints

from app.schemas.invoice import UtcDatetime


class CustomerQuery(BaseModel):
    model_config = ConfigDict(extra="forbid")

    q: Annotated[str, StringConstraints(strip_whitespace=True, max_length=100)] = ""
    limit: Annotated[int, Field(ge=1, le=25)] = 8


class CustomerOut(BaseModel):
    id: int
    name: str
    email: str
    address: str
    invoice_count: int
    last_used_at: UtcDatetime
