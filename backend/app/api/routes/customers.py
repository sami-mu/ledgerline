from typing import Annotated

from fastapi import APIRouter, Query

from app.api.deps import CustomerServiceDep
from app.schemas.customer import CustomerOut, CustomerQuery

router = APIRouter(prefix="/api/customers", tags=["customers"])


@router.get("", response_model=list[CustomerOut])
def search_customers(
    query: Annotated[CustomerQuery, Query()], service: CustomerServiceDep
) -> list[CustomerOut]:
    """Customers you've billed, most recent first, for autocomplete."""
    return service.search(query)
