"""Shared bounded-reader helpers for untrusted uploads."""

from fastapi import HTTPException, UploadFile


async def read_upload_limited(
    file: UploadFile,
    *,
    max_bytes: int,
    detail: str = "حجم فایل بیشتر از حد مجاز است",
    chunk_size: int = 1024 * 1024,
) -> bytes:
    """Read an upload incrementally and abort as soon as it exceeds max_bytes."""
    chunks: list[bytes] = []
    total = 0
    while chunk := await file.read(chunk_size):
        total += len(chunk)
        if total > max_bytes:
            raise HTTPException(status_code=413, detail=detail)
        chunks.append(chunk)
    return b"".join(chunks)
