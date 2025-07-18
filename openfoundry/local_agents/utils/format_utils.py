import base64
import datetime
import json
from typing import Any

import numpy as np
import pandas as pd


def _format_primitive(val: Any) -> str:
    """Format primitive Python and NumPy scalar types to a safe, single-line string."""
    # Handle NumPy scalar types
    if isinstance(val, np.generic):
        try:
            return _format_primitive(val.item())
        except Exception:
            return str(val)

    # Handle bytes: base64-encode with marker
    if isinstance(val, (bytes, bytearray)):
        encoded = base64.b64encode(val).decode("ascii")
        return f"bytes_base64:{encoded}"

    # Handle strings: properly escape using JSON
    if isinstance(val, str):
        dumped = json.dumps(val)
        return (
            dumped[1:-1]
            if len(dumped) >= 2 and dumped.startswith('"') and dumped.endswith('"')
            else dumped
        )

    # Handle booleans (Python and NumPy) - must come before int/float since bool is subclass of int
    if isinstance(val, bool):
        return str(bool(val)).lower()

    # Handle numbers
    if isinstance(val, (int, float)):
        return str(val)

    # Handle date/time objects
    if isinstance(val, (datetime.date, datetime.datetime, datetime.time)):
        return val.isoformat()

    # Fallback
    return str(val)


def _is_sequence_type(obj: Any) -> bool:
    """Check if object is a sequence type that should be handled as a collection."""
    return isinstance(obj, (list, tuple, set, np.ndarray, pd.Series))


def _is_complex_type(obj: Any) -> bool:
    """Check if object is a complex type that needs recursive processing."""
    return isinstance(
        obj, (dict, list, tuple, set, np.ndarray, pd.DataFrame, pd.Series)
    )


def _convert_to_sequence(obj: Any) -> list:
    """Convert various sequence types to a standard list."""
    if isinstance(obj, np.ndarray):
        return obj.tolist()
    elif isinstance(obj, pd.DataFrame):
        return obj.values.tolist()
    elif isinstance(obj, pd.Series):
        return obj.tolist()
    else:
        return list(obj)


def _format_xml_tag(key: str, value: str, indent_str: str) -> str:
    """Format a simple XML tag."""
    return f"{indent_str}<{key}>{value}</{key}>"


def _format_nested_tag(key: str, content: str, indent_str: str) -> str:
    """Format a nested XML tag with proper indentation."""
    return f"{indent_str}<{key}>\n{content}\n{indent_str}</{key}>"


def _format_sequence_items(
    seq: list, indent: int, max_depth: int, current_depth: int
) -> list[str]:
    """Format sequence items as XML fragments."""
    space = "    "
    fragments = []

    for item in seq:
        item_open = f"{space * (indent + 1)}<item>"
        item_close = "</item>"

        if _is_complex_type(item):
            item_inner = dict_to_xml(
                item,
                indent=indent + 2,
                max_depth=max_depth,
                current_depth=current_depth + 2,
            )
            fragments.append(
                f"{item_open}\n{item_inner}\n{space * (indent + 1)}{item_close}"
            )
        else:
            fragments.append(f"{item_open}{_format_primitive(item)}{item_close}")

    return fragments


def dict_to_xml(
    data: Any, indent: int = 0, max_depth: int = 5, current_depth: int = 0
) -> str:
    """Convert nested data structures to XML-formatted string with indentation.

    Args:
        data: Data to convert (dict, list, numpy array, pandas DataFrame/Series, etc.)
        indent: Current indentation level (4 spaces per level)
        max_depth: Maximum recursion depth (None for unlimited)
        current_depth: Current recursion depth

    Returns:
        XML-formatted string representation

    """
    space = "    "
    indent_str = space * indent

    # Depth limiting
    if max_depth is not None and current_depth >= max_depth:
        return indent_str + _format_primitive(data)

    # Handle pandas DataFrame
    if isinstance(data, pd.DataFrame):
        fragments = [f"{indent_str}<DataFrame>"]
        for _, row in data.iterrows():
            row_content = dict_to_xml(
                row.to_dict(),
                indent=indent + 2,
                max_depth=max_depth,
                current_depth=current_depth + 2,
            )
            fragments.append(
                f"{space * (indent+1)}<row>\n{row_content}\n{space * (indent+1)}</row>"
            )
        fragments.append(f"{indent_str}</DataFrame>")
        return "\n".join(fragments)

    # Handle pandas Series
    if isinstance(data, pd.Series):
        return dict_to_xml(
            data.to_dict(),
            indent=indent,
            max_depth=max_depth,
            current_depth=current_depth,
        )

    # Handle dictionaries
    if isinstance(data, dict):
        fragments = []
        for key, value in data.items():
            if isinstance(value, dict):
                # Nested dictionary
                inner = dict_to_xml(
                    value,
                    indent=indent + 1,
                    max_depth=max_depth,
                    current_depth=current_depth + 1,
                )
                fragments.append(_format_nested_tag(key, inner, indent_str))
            elif _is_sequence_type(value) or isinstance(value, pd.DataFrame):
                # Sequence types
                fragments.append(f"{indent_str}<{key}>")
                seq = _convert_to_sequence(value)
                fragments.extend(
                    _format_sequence_items(seq, indent, max_depth, current_depth)
                )
                fragments.append(f"{indent_str}</{key}>")
            else:
                # Primitive values
                fragments.append(
                    _format_xml_tag(key, _format_primitive(value), indent_str)
                )
        return "\n".join(fragments)

    # Handle root-level sequences
    if _is_sequence_type(data):
        seq = _convert_to_sequence(data)
        return "\n".join(
            _format_sequence_items(seq, indent - 1, max_depth, current_depth)
        )

    # Fallback for primitives
    return indent_str + _format_primitive(data)


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
