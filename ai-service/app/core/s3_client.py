"""
core/s3_client.py
-----------------
Thin wrapper around boto3 / MinIO for downloading media via signed URLs
and uploading processed results.

All heavy I/O is done synchronously here (run via executor in async callers).
"""
from __future__ import annotations

import io
from typing import BinaryIO

import httpx

from app.config import settings
from app.core.logging import get_logger

logger = get_logger(__name__)


async def download_url(url: str) -> bytes:
    """
    Download raw bytes from a signed S3/MinIO URL using an async HTTP client.

    Parameters
    ----------
    url:
        A pre-signed HTTPS URL pointing to an image or video object.

    Returns
    -------
    bytes
        Raw content bytes.

    Raises
    ------
    httpx.HTTPStatusError
        If the server responds with a non-2xx status.
    """
    async with httpx.AsyncClient(timeout=settings.http_timeout, follow_redirects=True) as client:
        resp = await client.get(url)
        resp.raise_for_status()
        logger.debug("Downloaded %d bytes from %s", len(resp.content), url[:80])
        return resp.content


async def upload_bytes(data: bytes, key: str, content_type: str = "image/jpeg") -> str:
    """
    Upload *data* to the configured S3/MinIO bucket under *key*.

    Returns a public or pre-signed URL depending on bucket policy.
    """
    import boto3
    from botocore.exceptions import ClientError

    kwargs: dict = dict(
        aws_access_key_id=settings.s3_access_key,
        aws_secret_access_key=settings.s3_secret_key,
        region_name=settings.s3_region,
    )
    if settings.s3_endpoint_url:
        kwargs["endpoint_url"] = settings.s3_endpoint_url

    s3 = boto3.client("s3", **kwargs)  # type: ignore[arg-type]
    try:
        s3.put_object(
            Bucket=settings.s3_bucket,
            Key=key,
            Body=data,
            ContentType=content_type,
        )
        # Generate a 7-day pre-signed URL
        url: str = s3.generate_presigned_url(
            "get_object",
            Params={"Bucket": settings.s3_bucket, "Key": key},
            ExpiresIn=604800,
        )
        logger.info("Uploaded %d bytes to s3://%s/%s", len(data), settings.s3_bucket, key)
        return url
    except ClientError as exc:
        logger.exception("S3 upload failed for key=%s", key)
        raise
