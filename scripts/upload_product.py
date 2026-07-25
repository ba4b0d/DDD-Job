#!/usr/bin/env python3
"""
upload_product.py — Create a product from a folder of images + model file.

Folder convention:
  <product_id> <product_name>/
    ├── *.3mf or *.stl       (one model — parsed for weight/time, NOT uploaded)
    ├── img1.jpg             (up to 5 images — uploaded)
    ├── img2.png
    └── ...

Usage:
  python scripts/upload_product.py <folder>
  python scripts/upload_product.py <folder> --api http://192.168.100.51:8000
  python scripts/upload_product.py <folder> --dry          # parse only, no upload
  python scripts/upload_product.py <folder> --existing-id 5  # add images to product #5

Workflow:
  1. User slices in OrcaSlicer → .3mf has embedded slice data (time, filament, weight)
  2. Script parses .3mf metadata OR estimates from .stl volume
  3. Creates product on backend with weight/time
  4. Uploads images (max 5)
"""

import argparse
import json
import os
import re
import struct
import sys
import zipfile
import xml.etree.ElementTree as ET
from pathlib import Path

try:
    import requests
except ImportError:
    print("Install requests:  pip install requests")
    sys.exit(1)


# ── STL parsing ─────────────────────────────────────────────────────

def parse_stl(path: str) -> dict:
    """Parse binary/ASCII STL → volume_mm3, bbox, triangles."""
    with open(path, "rb") as f:
        header = f.read(80)
        if header[:5] == b"solid" and b"\x00" not in header:
            return _parse_stl_ascii(path)
        f.seek(80)
        n = struct.unpack("<I", f.read(4))[0]
        if n > 10_000_000:
            return {"volume_mm3": 0, "triangles": 0, "error": "too many triangles"}

        min_xyz = [float("inf")] * 3
        max_xyz = [float("-inf")] * 3
        vol = 0.0

        for _ in range(n):
            d = struct.unpack("<12fH", f.read(50))
            v1, v2, v3 = (d[3], d[4], d[5]), (d[6], d[7], d[8]), (d[9], d[10], d[11])
            vol += (
                v1[0] * (v2[1] * v3[2] - v3[1] * v2[2])
                - v2[0] * (v1[1] * v3[2] - v3[1] * v1[2])
                + v3[0] * (v1[1] * v2[2] - v2[1] * v1[2])
            ) / 6.0
            for v in (v1, v2, v3):
                for i in range(3):
                    min_xyz[i] = min(min_xyz[i], v[i])
                    max_xyz[i] = max(max_xyz[i], v[i])

        bbox = {
            "x": round(max_xyz[0] - min_xyz[0], 2),
            "y": round(max_xyz[1] - min_xyz[1], 2),
            "z": round(max_xyz[2] - min_xyz[2], 2),
        }
        return {"volume_mm3": abs(vol), "triangles": n, "bbox": bbox}


def _parse_stl_ascii(path: str) -> dict:
    vol = 0.0
    tri = 0
    min_xyz = [float("inf")] * 3
    max_xyz = [float("-inf")] * 3
    verts = []
    with open(path) as f:
        for line in f:
            line = line.strip()
            if line.startswith("vertex"):
                p = line.split()
                v = (float(p[1]), float(p[2]), float(p[3]))
                verts.append(v)
                for i in range(3):
                    min_xyz[i] = min(min_xyz[i], v[i])
                    max_xyz[i] = max(max_xyz[i], v[i])
                if len(verts) == 3:
                    v1, v2, v3 = verts
                    vol += (v1[0]*(v2[1]*v3[2]-v3[1]*v2[2]) - v2[0]*(v1[1]*v3[2]-v3[1]*v1[2]) + v3[0]*(v1[1]*v2[2]-v2[1]*v1[2])) / 6.0
                    tri += 1
                    verts = []
    bbox = None
    if tri > 0:
        bbox = {k: round(max_xyz[i]-min_xyz[i], 2) for i, k in enumerate("xyz")}
    return {"volume_mm3": abs(vol), "triangles": tri, "bbox": bbox}


# ── 3MF parsing (OrcaSlicer metadata) ──────────────────────────────

def parse_3mf(path: str) -> dict:
    """Parse 3MF → volume, bbox, OrcaSlicer slice metadata (time, filament, weight)."""
    result = {"volume_mm3": 0, "triangles": 0, "bbox": None, "slice": {}}

    with zipfile.ZipFile(path, "r") as zf:
        names = zf.namelist()

        # ─ OrcaSlicer slice info ─
        for name in names:
            low = name.lower()
            if "slice_info" in low or "plate_info" in low:
                try:
                    data = zf.read(name)
                    # Try JSON first
                    try:
                        j = json.loads(data)
                        result["slice"] = _extract_orca_slice_json(j)
                    except (json.JSONDecodeError, UnicodeDecodeError):
                        pass
                    # Also check XML
                    try:
                        root = ET.fromstring(data)
                        result["slice"].update(_extract_orca_slice_xml(root))
                    except ET.ParseError:
                        pass
                except Exception:
                    pass

        # ─ Metadata/*.config files (OrcaSlicer stores print settings) ─
        for name in names:
            if name.startswith("Metadata/") and name.endswith(".config"):
                try:
                    data = zf.read(name).decode("utf-8", errors="ignore")
                    if "total_time" in data or "filament" in data:
                        result["slice"]["_config_raw"] = data[:3000]
                except Exception:
                    pass

        # ─ Parse mesh geometry ─
        model_name = None
        for n in names:
            if n.endswith("3dmodel.model"):
                model_name = n
                break
        if not model_name:
            for n in names:
                if n.endswith(".model"):
                    model_name = n
                    break

        if model_name:
            xml_data = zf.read(model_name)
            result.update(_parse_model_xml(xml_data))

    return result


def _extract_orca_slice_json(j: dict) -> dict:
    """Pull time/weight/filament from OrcaSlicer slice_info JSON."""
    info = {}
    # Various OrcaSlicer versions store data differently
    for key in ("total_time", "print_time", "estimate_time"):
        if key in j:
            info["time_seconds"] = j[key]
    for key in ("total_weight", "weight", "total_filament_weight"):
        if key in j:
            info["weight_g"] = j[key]
    for key in ("total_filament", "filament_length", "total_length"):
        if key in j:
            info["filament_mm"] = j[key]
    for key in ("total_volume", "volume"):
        if key in j:
            info["volume_mm3"] = j[key]
    # Nested structures
    if "stats" in j and isinstance(j["stats"], dict):
        s = j["stats"]
        for key in ("total_time", "print_time"):
            if key in s:
                info["time_seconds"] = s[key]
        for key in ("total_weight", "weight"):
            if key in s:
                info["weight_g"] = s[key]
    return info


def _extract_orca_slice_xml(root) -> dict:
    """Pull data from OrcaSlicer XML metadata."""
    info = {}
    for elem in root.iter():
        tag = elem.tag.split("}")[-1] if "}" in elem.tag else elem.tag
        text = (elem.text or "").strip()
        if not text:
            continue
        if tag in ("time", "total_time", "print_time"):
            try:
                info["time_seconds"] = float(text)
            except ValueError:
                pass
        elif tag in ("weight", "total_weight", "filament_weight"):
            try:
                info["weight_g"] = float(text)
            except ValueError:
                pass
        elif tag in ("filament", "total_filament"):
            try:
                info["filament_mm"] = float(text)
            except ValueError:
                pass
    return info


def _parse_model_xml(xml_bytes: bytes) -> dict:
    """Extract mesh volume from 3MF model XML."""
    try:
        root = ET.fromstring(xml_bytes)
    except ET.ParseError:
        return {"volume_mm3": 0, "triangles": 0}

    min_xyz = [float("inf")] * 3
    max_xyz = [float("-inf")] * 3
    vlist = []
    vol = 0.0
    triangles = 0

    # 3MF vertices are positional (no id attr), stored in order
    for elem in root.iter():
        tag = elem.tag.split("}")[-1] if "}" in elem.tag else elem.tag
        if tag == "vertex":
            x, y, z = float(elem.get("x", 0)), float(elem.get("y", 0)), float(elem.get("z", 0))
            vlist.append((x, y, z))
            for i, val in enumerate((x, y, z)):
                min_xyz[i] = min(min_xyz[i], val)
                max_xyz[i] = max(max_xyz[i], val)

    for elem in root.iter():
        tag = elem.tag.split("}")[-1] if "}" in elem.tag else elem.tag
        if tag == "triangle":
            try:
                v1, v2, v3 = vlist[int(elem.get("v1", 0))], vlist[int(elem.get("v2", 0))], vlist[int(elem.get("v3", 0))]
            except (ValueError, IndexError):
                continue
            vol += (v1[0]*(v2[1]*v3[2]-v3[1]*v2[2]) - v2[0]*(v1[1]*v3[2]-v3[1]*v1[2]) + v3[0]*(v1[1]*v2[2]-v2[1]*v1[2])) / 6.0
            triangles += 1

    bbox = None
    if triangles > 0:
        bbox = {k: round(max_xyz[i]-min_xyz[i], 2) for i, k in enumerate("xyz")}

    return {"volume_mm3": abs(vol), "triangles": triangles, "bbox": bbox}


# ── Helpers ─────────────────────────────────────────────────────────

def estimate_weight(volume_mm3: float, density: float = 1.24) -> float:
    """Volume (mm³) → weight (g). Default PLA 1.24 g/cm³."""
    return round(volume_mm3 / 1000.0 * density, 1)


def fmt_time(seconds: float) -> str:
    h = int(seconds // 3600)
    m = int((seconds % 3600) // 60)
    if h > 0:
        return f"{h}h {m}m"
    return f"{m} min"


MODEL_EXTS = {".3mf", ".stl"}
IMAGE_EXTS = {".jpg", ".jpeg", ".png", ".webp", ".gif", ".bmp"}


def parse_folder(folder_path: str) -> dict:
    folder = Path(folder_path)
    if not folder.is_dir():
        print(f"✗ Not a directory: {folder}")
        sys.exit(1)

    name = folder.name.strip()
    # "<id> - <name>" or "<id> <name>"
    m = re.match(r"^([A-Za-z0-9_-]+)\s+[-–]?\s*(.+)$", name)
    product_id = m.group(1) if m else ""
    product_name = m.group(2).strip() if m else name

    models = [f for f in folder.iterdir() if f.suffix.lower() in MODEL_EXTS]
    if not models:
        print(f"✗ No model file ({', '.join(MODEL_EXTS)})")
        sys.exit(1)
    if len(models) > 1:
        print(f"⚠ Multiple models, using first: {models[0].name}")

    images = sorted(
        [f for f in folder.iterdir() if f.suffix.lower() in IMAGE_EXTS],
        key=lambda f: f.name,
    )[:5]

    return {
        "product_id": product_id,
        "name": product_name,
        "folder": folder,
        "model_file": models[0],
        "images": images,
    }


# ── API ─────────────────────────────────────────────────────────────

def api_login(api: str, user: str, pw: str) -> str:
    r = requests.post(f"{api}/api/v1/auth/login", json={"username": user, "password": pw})
    r.raise_for_status()
    return r.json()["access_token"]


def api_create(api: str, token: str, data: dict) -> dict:
    r = requests.post(f"{api}/api/v1/products", json=data, headers={"Authorization": f"Bearer {token}"})
    r.raise_for_status()
    return r.json()


def api_upload_images(api: str, token: str, pid: int, images: list) -> dict:
    headers = {"Authorization": f"Bearer {token}"}
    files = [("files", (img.name, open(img, "rb"), "image/jpeg")) for img in images]
    r = requests.post(f"{api}/api/v1/products/{pid}/images", files=files, headers=headers)
    r.raise_for_status()
    return r.json()


# ── Main ────────────────────────────────────────────────────────────

def main():
    ap = argparse.ArgumentParser(description="Create product from folder (images + model)")
    ap.add_argument("folder", help="Product folder path")
    ap.add_argument("--api", default="http://127.0.0.1:8000", help="Backend API URL")
    ap.add_argument("--user", default="admin")
    ap.add_argument("--pass", dest="password", default="admin")
    ap.add_argument("--category", default="")
    ap.add_argument("--material-id", type=int, default=None)
    ap.add_argument("--machine-id", type=int, default=None)
    ap.add_argument("--density", type=float, default=1.24, help="Material density g/cm³ (PLA=1.24, PETG=1.27, ABS=1.04)")
    ap.add_argument("--dry", action="store_true", help="Parse only — no API calls")
    ap.add_argument("--existing-id", type=int, default=None, help="Upload images to existing product")
    args = ap.parse_args()

    info = parse_folder(args.folder)

    # Parse mesh
    ext = info["model_file"].suffix.lower()
    mesh = parse_3mf(str(info["model_file"])) if ext == ".3mf" else parse_stl(str(info["model_file"]))

    # Determine weight + time
    weight = mesh.get("slice", {}).get("weight_g")
    time_s = mesh.get("slice", {}).get("time_seconds")

    if not weight and mesh["volume_mm3"] > 0:
        weight = estimate_weight(mesh["volume_mm3"], args.density)

    # ─ Print summary ─
    print(f"\n{'='*50}")
    print(f"  📁 Folder:    {info['folder'].name}")
    print(f"  🏷️  ID:        {info['product_id'] or '(auto)'}")
    print(f"  📝 Name:      {info['name']}")
    print(f"  📦 Model:     {info['model_file'].name} ({ext})")
    print(f"  📐 Volume:    {mesh['volume_mm3']:.0f} mm³")
    if mesh.get("bbox"):
        b = mesh["bbox"]
        print(f"  📏 Size:      {b['x']} × {b['y']} × {b['z']} mm")
    print(f"  🔺 Triangles: {mesh['triangles']:,}")

    if mesh.get("slice"):
        s = mesh["slice"]
        print(f"\n  🎯 OrcaSlicer slice data:")
        if weight:
            print(f"     ⚖️  Weight:  {weight}g")
        if time_s:
            print(f"     ⏱️  Time:    {fmt_time(time_s)} ({time_s:.0f}s)")
        if s.get("filament_mm"):
            print(f"     🧵 Filament: {s['filament_mm']:.0f}mm")
        if s.get("volume_mm3"):
            print(f"     📐 Volume:  {s['volume_mm3']:.0f}mm³")
    else:
        print(f"  ⚖️  Est. weight: ~{weight or 0}g ({'PLA' if args.density == 1.24 else f'density={args.density}'})")

    print(f"  🖼️  Images:   {len(info['images'])}")
    for img in info["images"]:
        print(f"     • {img.name}")
    print(f"{'='*50}\n")

    if args.dry:
        print("  (--dry — stopping)")
        return

    # Login
    print("🔑 Login...")
    try:
        token = api_login(args.api, args.user, args.password)
        print("   ✓ OK")
    except Exception as e:
        print(f"   ✗ {e}")
        sys.exit(1)

    # Create or use existing
    if args.existing_id:
        pid = args.existing_id
        print(f"📦 Product #{pid} (existing)")
    else:
        data = {
            "product_id": info["product_id"],
            "name": info["name"],
            "weight_g": weight or 0,
            "print_time_hours": round(time_s / 3600, 2) if time_s else 0,
            "category": args.category,
            "machine_id": args.machine_id,
            "material_id": args.material_id,
        }
        print("📦 Creating product...")
        try:
            result = api_create(args.api, token, data)
            pid = result["id"]
            print(f"   ✓ #{pid} — {result.get('name', '')}")
        except requests.HTTPError as e:
            print(f"   ✗ {e.response.text}")
            sys.exit(1)

    # Upload images
    if info["images"]:
        print(f"🖼️  Uploading {len(info['images'])} image(s)...")
        try:
            result = api_upload_images(args.api, token, pid, info["images"])
            print(f"   ✓ {result.get('message', '')}")
        except requests.HTTPError as e:
            print(f"   ✗ {e.response.text}")

    print(f"\n✅ Done → #{pid} {info['name']}")
    print(f"   http://localhost:5173/ (catalog)")


if __name__ == "__main__":
    main()
