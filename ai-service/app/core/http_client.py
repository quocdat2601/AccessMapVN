"""
core/http_client.py
-------------------
Reusable async HTTP client for calling the ASP.NET Core backend
(e.g., to push verification results back after processing).
"""
from __future__ import annotations

from typing import Any

import httpx

from app.config import settings
from app.core.logging import get_logger

logger = get_logger(__name__)


async def post_json(path: str, payload: dict[str, Any]) -> dict[str, Any]:
    """
    POST a JSON payload to the ASP.NET Core backend.

    Parameters
    ----------
    path:
        Relative URL path, e.g. ``/api/submissions/verify-callback``.
    payload:
        Dictionary that will be serialised to JSON.

    Returns
    -------
    dict
        Parsed JSON response body.
    """
    url = f"{settings.backend_base_url}{path}"
    async with httpx.AsyncClient(timeout=settings.http_timeout) as client:
        resp = await client.post(url, json=payload)
        resp.raise_for_status()
        logger.debug("POST %s → %d", url, resp.status_code)
        return resp.json()


async def get_json(path: str, params: dict[str, Any] | None = None) -> dict[str, Any]:
    """
    GET a resource from the ASP.NET Core backend.

    Parameters
    ----------
    path:
        Relative URL path.
    params:
        Optional query parameters.
    """
    url = f"{settings.backend_base_url}{path}"
    async with httpx.AsyncClient(timeout=settings.http_timeout) as client:
        resp = await client.get(url, params=params)
        resp.raise_for_status()
        return resp.json()
