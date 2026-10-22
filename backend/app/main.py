from collections.abc import AsyncIterator
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.routes import health, invoices
from app.core.config import get_settings
from app.core.database import Base, SessionLocal, engine
from app.core.handlers import register_exception_handlers
from app.seed import seed_demo_invoice


@asynccontextmanager
async def lifespan(_app: FastAPI) -> AsyncIterator[None]:
    Base.metadata.create_all(engine)
    if get_settings().seed_demo_data:
        with SessionLocal() as session:
            seed_demo_invoice(session)
    yield


def create_app() -> FastAPI:
    settings = get_settings()
    app = FastAPI(title="Ledgerline Invoices API", version="0.1.0", lifespan=lifespan)
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origins,
        allow_methods=["*"],
        allow_headers=["*"],
    )
    register_exception_handlers(app)
    app.include_router(health.router)
    app.include_router(invoices.router)
    return app


app = create_app()
