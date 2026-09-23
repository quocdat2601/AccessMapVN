"""
api/blur.py
-----------
POST /api/v1/ai/blur
Detects faces in an uploaded image and returns the blurred version.
If S3 credentials are configured the blurred image is uploaded and a URL
is returned; otherwise the raw bytes are streamed back.
"""
from __future__ import annotations

from fastapi import APIRouter, File, HTTPException, UploadFile, status
from fastapi.responses import Response

from app.config import settings
from app.core.logging import get_logger
from app.core.s3_client import upload_bytes
from app.schemas import BlurResponse
from app.services.privacy.blurring import FaceBlurrer

logger = get_logger(__name__)
router = APIRouter(tags=["privacy"])

_blurrer = FaceBlurrer(blur_kernel=settings.face_blur_kernel)


@router.post(
    "/blur",
    summary="Detect faces and return a privacy-blurred image",
    responses={
        200: {
            "content": {
                "image/jpeg": {},
                "application/json": {},
            }
        }
    },
)
async def blur_image(
    image: UploadFile = File(..., description="Image file to blur (jpg/png)"),
) -> Response:
    """
    Detect all faces in *image* using MTCNN and apply Gaussian blurring.

    - If S3 is configured the blurred JPEG is uploaded and a JSON response
      with ``blurred_image_url`` is returned.
    - Otherwise the blurred JPEG bytes are returned directly as
      ``image/jpeg``.
    """
    raw = await image.read()
    if not raw:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Empty image.")

    blurred_bytes, face_count = _blurrer.blur(raw)
    logger.info("blur: detected %d face(s) in %s", face_count, image.filename)

    # Try to upload to S3 if credentials are available
    if settings.s3_access_key:
        try:
            import uuid
            key = f"blurred/{uuid.uuid4().hex}.jpg"
            url = await upload_bytes(blurred_bytes, key, content_type="image/jpeg")
            return Response(
                content=BlurResponse(faces_detected=face_count, blurred_image_url=url).model_dump_json(),
                media_type="application/json",
            )
        except Exception as exc:
            logger.warning("S3 upload failed, falling back to streaming: %s", exc)

    # Fallback: stream bytes
    return Response(content=blurred_bytes, media_type="image/jpeg")
