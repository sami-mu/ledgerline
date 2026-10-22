from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse

from app.core.errors import BusinessRuleError, DomainError


def register_exception_handlers(app: FastAPI) -> None:
    @app.exception_handler(DomainError)
    async def _domain_error(_request: Request, exc: DomainError) -> JSONResponse:
        if isinstance(exc, BusinessRuleError):
            # Same shape as FastAPI's request validation errors, so the client has one parser.
            detail = [
                {"loc": ["body", *issue.field], "msg": issue.message, "type": exc.code}
                for issue in exc.issues
            ]
            return JSONResponse(status_code=exc.status_code, content={"detail": detail})
        return JSONResponse(
            status_code=exc.status_code, content={"detail": exc.message, "code": exc.code}
        )
