import os
import uuid
from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File
from sqlalchemy.orm import Session
from typing import List

from app.database import get_db
from app.models import BlogPost, Settings
from app.schemas import BlogPostCreate, BlogPostUpdate, BlogPostResponse
from app.routers.auth import require_any_role

router = APIRouter(prefix="/api/v1", tags=["blog"])

BLOG_UPLOAD_DIR = os.path.join(
    os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))),
    "uploads",
    "blog",
)
os.makedirs(BLOG_UPLOAD_DIR, exist_ok=True)


def is_blog_enabled(db: Session) -> bool:
    s = db.query(Settings).filter(Settings.key == "enable_blog").first()
    return s is not None and s.value > 0


# ── Public Endpoints ─────────────────────────────────────────────────────────

@router.get("/blog", response_model=List[BlogPostResponse])
def list_published_posts(db: Session = Depends(get_db)):
    """Public list of published posts, ordered by created_at desc."""
    if not is_blog_enabled(db):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="وبلاگ در حال حاضر غیرفعال است",
        )
    return (
        db.query(BlogPost)
        .filter(BlogPost.is_published == True)
        .order_by(BlogPost.created_at.desc())
        .all()
    )


@router.get("/blog/{slug}", response_model=BlogPostResponse)
def get_published_post_by_slug(slug: str, db: Session = Depends(get_db)):
    """Public single post by slug if published. Increments views by 1."""
    if not is_blog_enabled(db):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="وبلاگ در حال حاضر غیرفعال است",
        )
    post = (
        db.query(BlogPost)
        .filter(BlogPost.slug == slug, BlogPost.is_published == True)
        .first()
    )
    if not post:
        raise HTTPException(status_code=404, detail="مقاله یافت نشد")

    post.views += 1
    db.commit()
    db.refresh(post)
    return post


# ── Admin Endpoints ──────────────────────────────────────────────────────────

@router.get("/admin/posts", response_model=List[BlogPostResponse])
def admin_list_posts(
    db: Session = Depends(get_db),
    user=Depends(require_any_role),
):
    """Admin: returns all posts."""
    return db.query(BlogPost).order_by(BlogPost.created_at.desc()).all()


@router.post("/admin/posts", response_model=BlogPostResponse, status_code=status.HTTP_201_CREATED)
def admin_create_post(
    body: BlogPostCreate,
    db: Session = Depends(get_db),
    user=Depends(require_any_role),
):
    """Admin: create post. Auto-generate slug if empty and ensure uniqueness."""
    slug = (body.slug or "").strip()
    if not slug:
        slug = BlogPost.generate_slug(body.title)

    # Ensure slug uniqueness
    base_slug = slug
    counter = 1
    while db.query(BlogPost).filter(BlogPost.slug == slug).first():
        slug = f"{base_slug}-{counter}"
        counter += 1

    post = BlogPost(
        title=body.title,
        slug=slug,
        summary=body.summary or "",
        content=body.content or "",
        cover_image=body.cover_image,
        is_published=body.is_published,
    )
    db.add(post)
    db.commit()
    db.refresh(post)
    return post


@router.put("/admin/posts/{id}", response_model=BlogPostResponse)
def admin_update_post(
    id: int,
    body: BlogPostUpdate,
    db: Session = Depends(get_db),
    user=Depends(require_any_role),
):
    """Admin: update post."""
    post = db.query(BlogPost).filter(BlogPost.id == id).first()
    if not post:
        raise HTTPException(status_code=404, detail="مقاله یافت نشد")

    update_data = body.model_dump(exclude_unset=True)

    if "slug" in update_data and update_data["slug"] is not None:
        new_slug = update_data["slug"].strip()
        if not new_slug:
            title = update_data.get("title", post.title)
            new_slug = BlogPost.generate_slug(title)

        if new_slug != post.slug:
            base_slug = new_slug
            counter = 1
            while db.query(BlogPost).filter(BlogPost.slug == new_slug, BlogPost.id != id).first():
                new_slug = f"{base_slug}-{counter}"
                counter += 1
            update_data["slug"] = new_slug

    for field, val in update_data.items():
        setattr(post, field, val)

    db.commit()
    db.refresh(post)
    return post


@router.delete("/admin/posts/{id}")
def admin_delete_post(
    id: int,
    db: Session = Depends(get_db),
    user=Depends(require_any_role),
):
    """Admin: delete post."""
    post = db.query(BlogPost).filter(BlogPost.id == id).first()
    if not post:
        raise HTTPException(status_code=404, detail="مقاله یافت نشد")

    db.delete(post)
    db.commit()
    return {"message": "مقاله با موفقیت حذف شد"}


IMAGE_MAGIC_BYTES = [
    (b"\xff\xd8\xff", ".jpg"),
    (b"\x89PNG\r\n\x1a\n", ".png"),
    (b"GIF87a", ".gif"),
    (b"GIF89a", ".gif"),
    (b"RIFF", ".webp"),
]


def validate_image_magic_bytes(contents: bytes) -> str:
    """Validate magic bytes of uploaded image. Returns normalized extension or raises HTTPException 400."""
    if len(contents) < 12:
        raise HTTPException(status_code=400, detail="فایل تصویر نامعتبر یا خالی است")
    for magic, ext in IMAGE_MAGIC_BYTES:
        if contents.startswith(magic):
            if ext == ".webp" and contents[8:12] != b"WEBP":
                continue
            return ext
    raise HTTPException(
        status_code=400,
        detail="محتوای فایل با پسوند تصویر مطابقت ندارد. فقط فایل‌های تصویر واقعی مجاز هستند",
    )


@router.post("/admin/posts/upload-cover")
async def upload_blog_cover(
    file: UploadFile = File(...),
    user=Depends(require_any_role),
):
    """Upload a cover image for a blog post and return its public URL."""
    allowed_ext = {".png", ".jpg", ".jpeg", ".webp", ".gif"}
    ext = os.path.splitext(file.filename or "")[1].lower()
    if ext not in allowed_ext:
        raise HTTPException(
            status_code=400,
            detail=f"فرمت فایل مجاز نیست. پسوندهای مجاز: {', '.join(allowed_ext)}",
        )

    contents = await file.read()
    if len(contents) > 10 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="حجم تصویر نباید بیشتر از ۱۰ مگابایت باشد")

    real_ext = validate_image_magic_bytes(contents)
    filename = f"{uuid.uuid4().hex}{real_ext}"
    filepath = os.path.join(BLOG_UPLOAD_DIR, filename)
    with open(filepath, "wb") as f:
        f.write(contents)

    return {"url": f"/uploads/blog/{filename}"}
