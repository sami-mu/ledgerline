from fastapi import APIRouter
from pydantic import BaseModel

from app.core.config import get_settings

router = APIRouter(prefix="/api", tags=["health"])


class HealthOut(BaseModel):
    status: str
    email_configured: bool


@router.get("/health", response_model=HealthOut)
def health() -> HealthOut:
    return HealthOut(status="ok", email_configured=get_settings().smtp_configured)
