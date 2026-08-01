"""
CLI tool to compress and optimize all existing product images to WebP format.
Resizes images to max 1200px and updates SQLite database paths.
"""
import os
from app.database import SessionLocal
from app.models import Product, ProductImage
from app.services.image import process_and_save_image

processed_cache: dict[str, str] = {}


def optimize_file(filepath: str, uploads_dir: str) -> str | None:
    """Optimize image file to WebP. Returns new filename or None."""
    if not os.path.exists(filepath):
        return None
    if filepath.endswith(".webp"):
        return os.path.basename(filepath)
    if filepath in processed_cache:
        return processed_cache[filepath]

    try:
        ext = os.path.splitext(filepath)[1].lower()
        with open(filepath, "rb") as f:
            content = f.read()
        new_filename = process_and_save_image(content, ext, uploads_dir)
        processed_cache[filepath] = new_filename
        print(f"Optimized: {os.path.basename(filepath)} -> {new_filename}")
        return new_filename
    except Exception as err:
        print(f"Error optimizing {os.path.basename(filepath)}: {err}")
        return None


def main():
    db = SessionLocal()
    uploads_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "uploads"))

    # 1. Update ProductImage URLs
    images = db.query(ProductImage).all()
    updated_imgs = 0
    for img in images:
        if img.image_url and not img.image_url.endswith(".webp"):
            rel_filename = os.path.basename(img.image_url)
            full_path = os.path.join(uploads_dir, rel_filename)
            new_fname = optimize_file(full_path, uploads_dir)
            if new_fname:
                img.image_url = f"/uploads/{new_fname}"
                updated_imgs += 1

    # 2. Update Product main image_url
    products = db.query(Product).all()
    updated_prods = 0
    for p in products:
        if p.image_url and not p.image_url.endswith(".webp"):
            rel_filename = os.path.basename(p.image_url)
            full_path = os.path.join(uploads_dir, rel_filename)
            new_fname = optimize_file(full_path, uploads_dir)
            if new_fname:
                p.image_url = f"/uploads/{new_fname}"
                updated_prods += 1

    db.commit()
    print(f"Database updated: {updated_imgs} ProductImage rows, {updated_prods} Product rows.")


if __name__ == "__main__":
    main()
