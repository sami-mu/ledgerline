from collections.abc import AsyncIterator
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.routes import customers, health, invoices
from app.core.config import get_settings
from app.core.database import SessionLocal, engine, init_schema
from app.core.handlers import register_exception_handlers
from app.seed import invoice_service, seed_demo_invoice


@asynccontextmanager
async def lifespan(_app: FastAPI) -> AsyncIterator[None]:
    init_schema(engine)
    with SessionLocal() as session:
        invoice_service(session).backfill()
        if get_settings().seed_demo_data:
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
    app.include_router(customers.router)
    return app


app = create_app()
