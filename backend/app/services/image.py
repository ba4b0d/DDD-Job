"""
Image service utilities: Magic-byte validation, thumbnail resizing, and WebP compression.
"""
import io
import os
import uuid
import logging
from PIL import Image
from fastapi import HTTPException

logger = logging.getLogger(__name__)

# Magic byte signatures for image validation
IMAGE_MAGIC_BYTES = {
    ".jpg": [(b"\xff\xd8\xff", "image/jpeg")],
    ".jpeg": [(b"\xff\xd8\xff", "image/jpeg")],
    ".png": [(b"\x89PNG\r\n\x1a\n", "image/png")],
    ".gif": [(b"GIF87a", "image/gif"), (b"GIF89a", "image/gif")],
    ".webp": [(b"RIFF", "image/webp")],
}


def validate_image_bytes(content: bytes, content_type: str = "") -> str | None:
    """Validate image by magic bytes. Returns extension or None."""
    if len(content) < 12:
        return None
    for ext, signatures in IMAGE_MAGIC_BYTES.items():
        for magic, _ in signatures:
            if content.startswith(magic):
                # Special check for WEBP: RIFF header + WEBP fourcc
                if ext == ".webp":
                    if content[8:12] == b"WEBP":
                        return ext
                    break
                return ext
    return None


def process_and_save_image(content: bytes, orig_ext: str, upload_dir: str, max_size: tuple[int, int] = (1200, 1200)) -> str:
    """Save image as optimized WebP (or GIF) resized to max_size. Returns filename."""
    if orig_ext == ".gif":
        filename = f"{uuid.uuid4().hex}.gif"
        filepath = os.path.join(upload_dir, filename)
        with open(filepath, "wb") as f:
            f.write(content)
        return filename

    try:
        im = Image.open(io.BytesIO(content))
        if im.mode in ("RGBA", "P"):
            im = im.convert("RGBA")
        else:
            im = im.convert("RGB")
        im.thumbnail(max_size, Image.Resampling.LANCZOS)
        filename = f"{uuid.uuid4().hex}.webp"
        filepath = os.path.join(upload_dir, filename)
        im.save(filepath, "WEBP", quality=82, optimize=True)
        return filename
    except Exception as err:
        logger.warning("Pillow WebP conversion failed, falling back to original: %s", err)
        filename = f"{uuid.uuid4().hex}{orig_ext}"
        filepath = os.path.join(upload_dir, filename)
        with open(filepath, "wb") as f:
            f.write(content)
        return filename
