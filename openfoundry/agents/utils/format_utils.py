def truncate(text: str, start_chars: int = 5000, end_chars: int = 5000) -> str:
    """Truncate text by keeping start_chars from beginning and end_chars from end.

    Args:
        text: Text to truncate
        start_chars: Characters to keep from start
        end_chars: Characters to keep from end

    """
    max_chars = start_chars + end_chars
    if len(text) <= max_chars:
        return text

    truncated_chars = len(text) - max_chars
    truncation_msg = f"\n... [TRUNCATED {truncated_chars} characters] ...\n"

    start_part = text[:start_chars]
    end_part = text[-end_chars:]

    return start_part + truncation_msg + end_part
