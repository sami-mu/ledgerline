"""Jinja environment shared by the email and PDF templates."""

from datetime import date
from decimal import Decimal
from functools import lru_cache
from pathlib import Path

from jinja2 import Environment, FileSystemLoader, select_autoescape
from markupsafe import Markup

TEMPLATES = Path(__file__).resolve().parent.parent / "templates"


def _usd(value: Decimal) -> str:
    return f"${value:,.2f}"


def _plain_decimal(value: Decimal) -> str:
    # 6.500 -> 6.5, 2 -> 2, never scientific notation.
    text = format(value, "f")
    return text.rstrip("0").rstrip(".") if "." in text else text


def _long_date(value: date) -> str:
    return f"{value:%b} {value.day}, {value.year}"


def _css_string(value: str) -> Markup:
    """Escape text for a CSS string literal, e.g. @page footer `content: "..."`."""
    escaped = "".join(f"\\{ord(ch):x} " if ch in '"\\<>&\n\r' else ch for ch in value)
    return Markup(escaped)


@lru_cache
def environment() -> Environment:
    env = Environment(
        loader=FileSystemLoader(TEMPLATES),
        autoescape=select_autoescape(["html"]),
        trim_blocks=True,
        lstrip_blocks=True,
    )
    env.filters.update(usd=_usd, plain=_plain_decimal, long_date=_long_date, css_string=_css_string)
    return env
