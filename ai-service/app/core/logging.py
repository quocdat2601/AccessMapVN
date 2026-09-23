"""
core/logging.py
---------------
Structured JSON logging configuration for the AI service.
All modules should call ``get_logger(__name__)`` rather than
using ``logging.getLogger`` directly.
"""
from __future__ import annotations

import logging
import sys
from functools import lru_cache

from app.config import settings


class _JsonFormatter(logging.Formatter):
    """Very lightweight JSON log formatter (no extra dependencies)."""

    def format(self, record: logging.LogRecord) -> str:
        import json, traceback

        payload: dict = {
            "ts":      self.formatTime(record, self.datefmt),
            "level":   record.levelname,
            "logger":  record.name,
            "message": record.getMessage(),
        }
        if record.exc_info:
            payload["exc"] = "".join(traceback.format_exception(*record.exc_info))
        return json.dumps(payload, ensure_ascii=False)


@lru_cache(maxsize=None)
def _configure_root() -> None:
    """Configure the root logger once (idempotent)."""
    level = getattr(logging, settings.log_level.upper(), logging.INFO)
    handler = logging.StreamHandler(sys.stdout)
    handler.setFormatter(_JsonFormatter())
    root = logging.getLogger()
    root.setLevel(level)
    # Avoid adding duplicate handlers if already configured (e.g., uvicorn)
    if not root.handlers:
        root.addHandler(handler)
    else:
        for h in root.handlers:
            h.setFormatter(_JsonFormatter())


def get_logger(name: str) -> logging.Logger:
    """
    Return a module-level logger with the shared JSON formatter applied.

    Usage::

        from app.core.logging import get_logger
        logger = get_logger(__name__)
    """
    _configure_root()
    return logging.getLogger(name)
