from fastapi import APIRouter
from pydantic import BaseModel

from app.api.deps import SettingsDep

router = APIRouter(prefix="/api", tags=["health"])


class HealthOut(BaseModel):
    status: str
    email_configured: bool


@router.get("/health", response_model=HealthOut)
def health(settings: SettingsDep) -> HealthOut:
    return HealthOut(status="ok", email_configured=settings.smtp_configured)
