def like_pattern(text: str) -> str:
    """A LIKE pattern that matches `text` anywhere, with % and _ taken literally."""
    escaped = text.replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_")
    return f"%{escaped}%"
