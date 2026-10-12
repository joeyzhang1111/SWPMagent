from __future__ import annotations

import re
import unicodedata
from collections.abc import Iterable
from typing import Any

# Bump when the rules change so derived caches are rebuilt.
NORMALIZER_VERSION = 1

_INVISIBLE = {ord(char): None for char in "\u200b\u200c\u200d\u2060\ufeff\u00ad"}
_WHITESPACE = re.compile(r"\s+")


def normalize_baseline(value: Any) -> str:
    """Format-only cleaning of a baseline label; never merges differently spelled names."""
    if value is None or (isinstance(value, float) and value != value):
        return ""
    text = unicodedata.normalize("NFKC", str(value)).translate(_INVISIBLE)
    return _WHITESPACE.sub(" ", text).strip()


def normalize_baselines(values: Iterable[Any]) -> list[str]:
    """Normalize a selection list, dropping blanks and duplicates while keeping order."""
    return list(dict.fromkeys(item for item in map(normalize_baseline, values) if item))
