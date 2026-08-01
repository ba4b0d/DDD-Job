"""
CLI tool to compress and optimize all existing product images to WebP format.
Resizes images to max 1200px and updates SQLite database paths.
"""
import os
import sys
import io
from PIL import Image

from app.database import SessionLocal
from app.models import Product, ProductImage

def optimize_file(filepath: str) -> str | None:
    """Optimize image file to WebP. Returns new filepath or None."""
    if not os.path.exists(filepath):
        return None
    if filepath.endswith(".webp"):
        return filepath

    dir_name, base_name = os.path.split(filepath)
    name_no_ext, _ = os.path.splitext(base_name)
    new_filepath = os.path.join(dir_name, f"{name_no_ext}.webp")

    try:
        with open(filepath, "rb") as f:
            content = f.read()
        im = Image.open(io.BytesIO(content))
        if im.mode in ("RGBA", "P"):
            im = im.convert("RGBA")
        else:
            im = im.convert("RGB")
        im.thumbnail((1200, 1200), Image.Resampling.LANCZOS)
        im.save(new_filepath, "WEBP", quality=82, optimize=True)
        print(f"Optimized: {base_name} ({os.path.getsize(filepath)}b) -> {os.path.basename(new_filepath)} ({os.path.getsize(new_filepath)}b)")
        return new_filepath
    except Exception as err:
        print(f"Error optimizing {base_name}: {err}")
        return None

def main():
    db = SessionLocal()
    uploads_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "uploads"))

    # 1. Update ProductImage URLs
    images = db.query(ProductImage).all()
    updated_imgs = 0
    for img in images:
        if img.image_url and not img.image_url.endswith(".webp"):
            rel_path = img.image_url.lstrip("/uploads/").lstrip("/")
            full_path = os.path.join(uploads_dir, rel_path)
            new_full = optimize_file(full_path)
            if new_full:
                new_rel = f"/uploads/{os.path.basename(new_full)}"
                img.image_url = new_rel
                updated_imgs += 1

    # 2. Update Product main image_url
    products = db.query(Product).all()
    updated_prods = 0
    for p in products:
        if p.image_url and not p.image_url.endswith(".webp"):
            rel_path = p.image_url.lstrip("/uploads/").lstrip("/")
            full_path = os.path.join(uploads_dir, rel_path)
            new_full = optimize_file(full_path)
            if new_full:
                new_rel = f"/uploads/{os.path.basename(new_full)}"
                p.image_url = new_rel
                updated_prods += 1

    db.commit()
    print(f"Database updated: {updated_imgs} ProductImage rows, {updated_prods} Product rows.")

if __name__ == "__main__":
    main()
