#!/usr/bin/env python3
"""replace_product_images.py — Replace live-site product images from local folders.

For every product folder under --base whose code is NOT in --exceptions:
  1. delete ALL images currently on the live site for that product
  2. upload the image files found in the local folder
     (max 5, newest-first so the most recently added file becomes primary)

Exceptions are matched by product code (first whitespace-token of the folder
name). A code in --exceptions is only skipped when it actually exists in the
folder, so one global exception list can be passed to every category run.

Usage:
  # dry-run — shows the plan, touches nothing
  python scripts/replace_product_images.py \
      --base "E:\\our 3d job\\final proudocts\\چارم" \
      --exceptions "KE003,KE077-KE081"

  # execute (password via arg or $SPAGHETTI_PASS)
  SPAGHETTI_PASS=... python scripts/replace_product_images.py \
      --base "E:\\our 3d job\\final proudocts\\چارم" \
      --exceptions "KE003,KE077-KE081" --apply

Notes:
  - Uses POST /auth/login (cookie session), GET /products/all,
    DELETE /products/{pid}/images/{img_id}, POST /products/{pid}/images.
  - Products with no live match (code absent from /products/all) are reported
    and left untouched — this tool replaces images only, never creates products.
"""
import argparse
import os
import re
import sys
from pathlib import Path

import requests

IMAGE_EXTS = {".jpg", ".jpeg", ".png", ".webp", ".gif", ".bmp"}
MIME = {".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".png": "image/png",
        ".webp": "image/webp", ".gif": "image/gif", ".bmp": "image/bmp"}
CODE_RE = re.compile(r"^[A-Za-z]{1,5}\d+$")
RANGE_RE = re.compile(r"^([A-Za-z]+)(\d+)-([A-Za-z]+)(\d+)$")

_session = requests.Session()


def expand_exceptions(spec: str) -> set:
    """Expand a comma-separated exception spec, incl. ranges (KE077-KE081)."""
    out = set()
    for part in (p.strip() for p in spec.split(",") if p.strip()):
        m = RANGE_RE.match(part)
        if m:
            pre1, n1, pre2, n2 = m.groups()
            if pre1.upper() != pre2.upper():
                sys.exit(f"✗ Range prefixes differ: {part}")
            width = len(n1)
            for n in range(int(n1), int(n2) + 1):
                out.add(f"{pre1.upper()}{n:0{width}d}")
        else:
            out.add(part.upper())
    return out


def login(api: str, user: str, pw: str):
    r = _session.post(f"{api}/api/v1/auth/login",
                      json={"username": user, "password": pw}, timeout=30)
    r.raise_for_status()
    print("login OK")


def get_products(api: str):
    r = _session.get(f"{api}/api/v1/products/all", timeout=60)
    r.raise_for_status()
    return r.json()


def folder_code(folder: Path):
    tok = folder.name.split(" ", 1)[0]
    return tok.upper() if CODE_RE.match(tok) else None


def folder_images(folder: Path, limit: int = 5):
    imgs = [f for f in folder.iterdir() if f.suffix.lower() in IMAGE_EXTS]
    imgs.sort(key=lambda f: f.stat().st_mtime, reverse=True)  # newest -> primary
    return imgs[:limit]


def plan_folders(base: Path):
    """Scan base dir -> {code: folder} for subfolders with a code-like name."""
    found = {}
    for d in sorted(base.iterdir()):
        if not d.is_dir():
            continue
        code = folder_code(d)
        if code:
            found[code] = d
    return found


def run(args, apply: bool):
    base = Path(args.base)
    if not base.is_dir():
        sys.exit(f"✗ Not a directory: {base}")

    exceptions = expand_exceptions(args.exceptions) if args.exceptions else set()
    folders = plan_folders(base)
    print(f"folder: {base}")
    print(f"subfolders with codes: {len(folders)} | exceptions applied: {len(exceptions & set(folders))}")
    print(f"mode: {'APPLY' if apply else 'DRY-RUN'}\n")

    login(args.api, args.user, args.password)
    products = get_products(args.api)
    by_code = {}
    for p in products:
        c = p.get("product_id")
        if c and c not in by_code:
            by_code[c.upper()] = p
    print(f"live products fetched: {len(products)}\n")

    skipped_exc, not_live, todo = [], [], []
    for code, folder in folders.items():
        if code in exceptions:
            skipped_exc.append(code)
        elif code not in by_code:
            not_live.append(code)
        else:
            imgs = folder_images(folder)
            live_imgs = by_code[code].get("images", [])
            todo.append((code, by_code[code], folder, imgs, live_imgs))

    for code in sorted(skipped_exc):
        print(f"SKIP (exception) {code}")
    for code in sorted(not_live):
        print(f"NOT ON LIVE SITE (skipped): {code}")
    print()
    for code, p, folder, imgs, live_imgs in todo:
        print(f"{code} #{p['id']:<5} live={len(live_imgs):<3} -> folder={len(imgs)}"
              f"  {[f.name for f in imgs]}")

    if not apply:
        print(f"\nDRY-RUN complete: {len(todo)} product(s) would be replaced,"
              f" {len(skipped_exc)} skipped, {len(not_live)} not live.")
        return

    if not todo:
        print("nothing to do")
        return

    print()
    for code, p, folder, imgs, live_imgs in todo:
        pid = p["id"]
        for img in live_imgs:
            r = _session.delete(f"{args.api}/api/v1/products/{pid}/images/{img['id']}", timeout=30)
            if r.status_code >= 400:
                print(f"  !! {code} delete img#{img['id']} failed: {r.status_code} {r.text[:120]}")
            else:
                print(f"  {code} deleted img#{img['id']} {img['image_url']}")
        if imgs:
            files = [("files", (f.name, f.read_bytes(),
                                MIME.get(f.suffix.lower(), "application/octet-stream")))
                     for f in imgs]
            r = _session.post(f"{args.api}/api/v1/products/{pid}/images", files=files, timeout=120)
            if r.status_code >= 400:
                print(f"  !! {code} upload failed: {r.status_code} {r.text[:200]}")
                continue
            new = r.json().get("images", [])
            print(f"  {code} uploaded {len(new)}: {[i['image_url'] for i in new]}")
        else:
            print(f"  {code} no folder images — left with 0 images")

    print("\n=== VERIFY (live state after change) ===")
    products2 = get_products(args.api)
    by_code2 = {p.get("product_id"): p for p in products2 if p.get("product_id")}
    for code, p, folder, imgs, _ in todo:
        p2 = by_code2.get(code)
        if not p2:
            print(f"{code}: NOT FOUND")
            continue
        imgs2 = p2.get("images", [])
        print(f"{code} #{p2['id']} images={len(imgs2)} primary={p2.get('image_url')}")


def main():
    ap = argparse.ArgumentParser(description="Replace live product images from local folders")
    ap.add_argument("--base", required=True, help="Category folder with <CODE name>/ subfolders")
    ap.add_argument("--exceptions", default="",
                    help="Comma-separated codes to skip (ranges OK: KE077-KE081)")
    ap.add_argument("--apply", action="store_true", help="Execute delete+upload (default: dry-run)")
    ap.add_argument("--api", default="https://spaghettiprints.ir")
    ap.add_argument("--user", default="admin")
    ap.add_argument("--pass", dest="password", default=os.environ.get("SPAGHETTI_PASS", ""))
    args = ap.parse_args()
    if not args.password:
        sys.exit("✗ No password: pass --pass or set $SPAGHETTI_PASS")
    run(args, args.apply)


if __name__ == "__main__":
    main()
