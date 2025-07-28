import base64
import datetime
import json
from typing import Any

import numpy as np
import pandas as pd
from openfoundry_types import TailCellsResult


def _is_tail_cells_result(data: Any) -> bool:
    """Check if data matches the TailCellsResult structure using Pydantic validation."""
    try:
        TailCellsResult.model_validate(data)
        return True
    except Exception:
        return False


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
            item_inner = _dict_to_xml_standard(
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
    # Special handling for notebook tail_cells output
    if _is_tail_cells_result(data):
        return _format_notebook_tail_cells(data, indent)

    return _dict_to_xml_standard(data, indent, max_depth, current_depth)


def _format_output_for_xml(output: dict, output_indent: str) -> list[str]:
    """Format a single notebook cell output as XML fragments.

    Args:
        output: The output dictionary from a notebook cell
        output_indent: The indentation string for this output level

    Returns:
        List of XML string fragments for this output

    """
    fragments = []
    output_type = output.get("output_type", "")

    if output_type == "stream":
        name = output.get("name", "stdout")
        text = output.get("text", "")
        fragments.append(f"{output_indent}<{name}>{_escape_xml(text)}</{name}>")

    elif output_type in ["display_data", "execute_result"]:
        # Handle images with compact format
        if "image" in output:
            img_format = output.get("image_format", "png")
            description = output.get("description", f"Image ({img_format})")
            fragments.append(
                f'{output_indent}<image format="{img_format}" description="{_escape_xml(description)}">'
            )
            fragments.append(f"{output_indent}    {output['image']}")
            fragments.append(f"{output_indent}</image>")

        # Handle text results
        if "text" in output:
            fragments.append(
                f"{output_indent}<result>{_escape_xml(output['text'])}</result>"
            )

        # Handle HTML
        if "text_html" in output:
            fragments.append(
                f"{output_indent}<html>{_escape_xml(output['text_html'])}</html>"
            )

    elif output_type == "error":
        fragments.append(f"{output_indent}<error>")
        fragments.append(
            f"{output_indent}    <name>{_escape_xml(output.get('ename', ''))}</name>"
        )
        fragments.append(
            f"{output_indent}    <value>{_escape_xml(output.get('evalue', ''))}</value>"
        )
        if output.get("traceback"):
            tb_text = "\n".join(output["traceback"])
            fragments.append(
                f"{output_indent}    <traceback>{_escape_xml(tb_text)}</traceback>"
            )
        fragments.append(f"{output_indent}</error>")

    return fragments


def _format_notebook_tail_cells(data: dict, indent: int = 0) -> str:
    """Optimized formatter for notebook tail_cells output."""
    space = "    "
    indent_str = space * indent

    fragments = [
        _format_xml_tag("total_cells", str(data["total_cells"]), indent_str),
        _format_xml_tag("returned_cells", str(data["returned_cells"]), indent_str),
        _format_xml_tag("start_index", str(data["start_index"]), indent_str),
        f"{indent_str}<cells>",
    ]

    for cell in data.get("cells", []):
        cell_indent = space * (indent + 1)

        # Streamlined cell header
        cell_attrs = (
            f'index="{cell.get("cell_index", "")}" type="{cell.get("cell_type", "")}"'
        )
        if cell.get("execution_count") is not None:
            cell_attrs += f' exec_count="{cell["execution_count"]}"'

        fragments.append(f"{cell_indent}<cell {cell_attrs}>")

        # Source code
        source = cell.get("source", "")
        if source:
            fragments.append(f"{cell_indent}    <source>{_escape_xml(source)}</source>")

        # Optimized outputs
        outputs = cell.get("outputs", [])
        for output in outputs:
            output_indent = space * (indent + 2)
            fragments.extend(_format_output_for_xml(output, output_indent))

        fragments.append(f"{cell_indent}</cell>")

    fragments.append(f"{indent_str}</cells>")
    return "\n".join(fragments)


def _escape_xml(text: str) -> str:
    """Escape special XML characters."""
    return (
        text.replace("&", "&amp;")
        .replace("<", "&lt;")
        .replace(">", "&gt;")
        .replace('"', "&quot;")
        .replace("'", "&#x27;")
    )


def _dict_to_xml_standard(
    data: Any, indent: int = 0, max_depth: int = 5, current_depth: int = 0
) -> str:
    """Standard XML formatter for non-notebook data."""
    space = "    "
    indent_str = space * indent

    # Depth limiting
    if max_depth is not None and current_depth >= max_depth:
        return indent_str + _format_primitive(data)

    # Handle pandas DataFrame
    if isinstance(data, pd.DataFrame):
        fragments = [f"{indent_str}<DataFrame>"]
        for _, row in data.iterrows():
            row_content = _dict_to_xml_standard(
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
        return _dict_to_xml_standard(
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
                inner = _dict_to_xml_standard(
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
