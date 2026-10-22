from typing import Annotated

from pydantic import BaseModel, EmailStr, StringConstraints


class SendInvoiceIn(BaseModel):
    to: EmailStr
    subject: Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=200)]
    message: Annotated[str, StringConstraints(strip_whitespace=True, max_length=2000)] = ""
