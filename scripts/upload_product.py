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
import glob
import json
import os
import re
import struct
import subprocess
import sys
import tempfile
import zipfile
from xml.etree.ElementTree import XMLParser, fromstring
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
                        root = _safe_xml_fromstring(data)
                        result["slice"].update(_extract_orca_slice_xml(root))
                    except Exception:
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


def _safe_xml_fromstring(xml_bytes: bytes):
    """Parse XML with external entity expansion disabled."""
    parser = XMLParser()
    parser.parser.UseForeignDTD(False)
    parser.entity["nbsp"] = " "
    return fromstring(xml_bytes, parser=parser)


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
        root = _safe_xml_fromstring(xml_bytes)
    except Exception:
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


# ── PrusaSlicer CLI (headless accurate slicing) ─────────────────────

def find_prusaslicer() -> str | None:
    """Find prusa-slicer-console.exe on the system."""
    candidates = [
        r"C:\Program Files\Prusa3D\PrusaSlicer\prusa-slicer-console.exe",
        r"C:\Program Files (x86)\Prusa3D\PrusaSlicer\prusa-slicer-console.exe",
    ]
    for p in candidates:
        if os.path.isfile(p):
            return p
    # Try PATH
    import shutil
    found = shutil.which("prusa-slicer-console") or shutil.which("prusa-slicer")
    return found


def slice_with_prusaslicer(model_path: str, slicer: str = None, filament_density: float = 1.24, profile: str = None) -> dict:
    """Slice with PrusaSlicer CLI → accurate time + filament stats from gcode."""
    if not slicer:
        slicer = find_prusaslicer()
    if not slicer:
        return {"error": "PrusaSlicer not found", "time_seconds": None, "weight_g": None, "filament_mm": None}

    # Create temp gcode output
    tmp = tempfile.mktemp(suffix=".gcode")
    try:
        cmd = [slicer, "--slice", "--export-gcode", "--output", tmp]
        if profile and os.path.isfile(profile):
            cmd.extend(["--load", profile])
        cmd.append(model_path)
        r = subprocess.run(
            cmd, capture_output=True, text=True, timeout=300,
        )
        if not os.path.isfile(tmp):
            return {"error": f"Slice failed: {r.stderr[-200:]}" if r.stderr else "Slice failed"}

        result = {"time_seconds": None, "weight_g": None, "filament_mm": None, "filament_cm3": None}

        with open(tmp) as f:
            for line in f:
                if not line.startswith(";"):
                    continue
                line = line.strip()
                m = re.match(r";\s*estimated printing time.*?=\s*(.+)", line, re.I)
                if m:
                    result["time_seconds"] = _parse_time_str(m.group(1))
                m = re.match(r";\s*filament used \[mm\]\s*=\s*([\d.]+)", line, re.I)
                if m:
                    result["filament_mm"] = float(m.group(1))
                m = re.match(r";\s*filament used \[cm3\]\s*=\s*([\d.]+)", line, re.I)
                if m:
                    result["filament_cm3"] = float(m.group(1))
                    # Calculate weight from volume × density
                    result["weight_g"] = round(float(m.group(1)) * filament_density, 1)
                m = re.match(r";\s*total filament used \[g\]\s*=\s*([\d.]+)", line, re.I)
                if m and float(m.group(1)) > 0:
                    result["weight_g"] = float(m.group(1))

        return result

    except subprocess.TimeoutExpired:
        return {"error": "Slice timed out (300s)"}
    except Exception as e:
        return {"error": str(e)}
    finally:
        if os.path.exists(tmp):
            os.remove(tmp)


def _parse_time_str(s: str) -> float | None:
    """Parse '2h 14m 25s' → seconds."""
    total = 0.0
    m = re.search(r"(\d+)\s*h", s)
    if m: total += int(m.group(1)) * 3600
    m = re.search(r"(\d+)\s*m", s)
    if m: total += int(m.group(1)) * 60
    m = re.search(r"(\d+)\s*s", s)
    if m: total += int(m.group(1))
    return total if total > 0 else None


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
    return r.json().get("token") or r.json().get("access_token")


def api_create(api: str, token: str, data: dict) -> dict:
    r = requests.post(f"{api}/api/v1/products", json=data, headers={"Authorization": f"Bearer {token}"})
    r.raise_for_status()
    return r.json()


MIME = {".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".png": "image/png",
        ".webp": "image/webp", ".gif": "image/gif", ".bmp": "image/bmp"}


def api_upload_images(api: str, token: str, pid: int, images: list) -> dict:
    headers = {"Authorization": f"Bearer {token}"}
    files = []
    for img in images:
        ct = MIME.get(img.suffix.lower(), "application/octet-stream")
        files.append(("files", (img.name, open(img, "rb"), ct)))
    r = requests.post(f"{api}/api/v1/products/{pid}/images", files=files, headers=headers)
    r.raise_for_status()
    return r.json()


# ── Main ────────────────────────────────────────────────────────────

def process_folder(folder_path: str, args, slicer_path: str, token: str = None) -> dict:
    """Process one product folder. Returns {"id": ..., "name": ..., "ok": bool}."""
    info = parse_folder(folder_path)

    # Slice
    slice_data = {}
    if slicer_path:
        slice_data = slice_with_prusaslicer(str(info["model_file"]), slicer_path, args.density, args.profile)
        if slice_data.get("error"):
            print(f"   ⚠ {slice_data['error']}")
            slice_data = {}

    # Parse mesh
    ext = info["model_file"].suffix.lower()
    mesh = parse_3mf(str(info["model_file"])) if ext == ".3mf" else parse_stl(str(info["model_file"]))

    # Weight + time
    weight = slice_data.get("weight_g") or mesh.get("slice", {}).get("weight_g")
    time_s = slice_data.get("time_seconds") or mesh.get("slice", {}).get("time_seconds")
    if not weight and mesh["volume_mm3"] > 0:
        weight = estimate_weight(mesh["volume_mm3"], args.density)

    # Summary
    print(f"\n  📁 {info['folder'].name}")
    print(f"     🏷️  {info['product_id'] or '(auto)'}  📝 {info['name']}")
    print(f"     📦 {info['model_file'].name}")
    if slice_data.get("time_seconds"):
        print(f"     ⚖️  {weight}g  ⏱️  {fmt_time(time_s)}  🧵 {slice_data.get('filament_mm', 0):.0f}mm")
    elif weight:
        print(f"     ⚖️  ~{weight}g (estimated)")
    print(f"     🖼️  {len(info['images'])} image(s)")

    if args.dry:
        return {"ok": True, "name": info["name"]}

    # Create product
    if args.existing_id:
        pid = args.existing_id
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
        try:
            result = api_create(args.api, token, data)
            pid = result["id"]
        except requests.HTTPError as e:
            print(f"     ✗ Create failed: {e.response.text}")
            return {"ok": False, "name": info["name"]}

    # Upload images
    if info["images"]:
        try:
            api_upload_images(args.api, token, pid, info["images"])
        except requests.HTTPError as e:
            print(f"     ✗ Images failed: {e.response.text}")

    print(f"     ✅ #{pid} {info['name']}")
    return {"ok": True, "id": pid, "name": info["name"]}


def main():
    ap = argparse.ArgumentParser(description="Create products from folders (images + model)")
    ap.add_argument("folder", help="Product folder — or parent folder with sub-folders (batch mode)")
    ap.add_argument("--api", default="http://127.0.0.1:8000", help="Backend API URL")
    ap.add_argument("--user", default="admin")
    ap.add_argument("--pass", dest="password", default="admin")
    ap.add_argument("--category", default="")
    ap.add_argument("--material-id", type=int, default=1, help="Material ID (default: 1 = PLA Black)")
    ap.add_argument("--machine-id", type=int, default=2, help="Machine ID (default: 2 = Kobra S1 barbod)")
    ap.add_argument("--density", type=float, default=1.24, help="Material density g/cm3 (PLA=1.24, PETG=1.27, ABS=1.04)")
    ap.add_argument("--profile", default=None, help="PrusaSlicer .ini profile (printer+print+filament)")
    ap.add_argument("--dry", action="store_true", help="Parse only — no API calls")
    ap.add_argument("--existing-id", type=int, default=None, help="Upload images to existing product")
    args = ap.parse_args()

    folder = Path(args.folder)
    if not folder.is_dir():
        print(f"✗ Not a directory: {folder}")
        sys.exit(1)

    # Detect batch vs single: batch = folder has subfolders with model files
    subfolders = sorted([
        d for d in folder.iterdir()
        if d.is_dir() and any(f.suffix.lower() in MODEL_EXTS for f in d.iterdir())
    ])

    if subfolders:
        # ── Batch mode ──
        print(f"\n📦 Batch mode: {len(subfolders)} product(s) in {folder.name}\n")
        print(f"   🖨️  PrusaSlicer: {find_prusaslicer() or 'not found'}")
        if args.profile:
            print(f"   📄 Profile: {args.profile}")
        print()

        # Find slicer once
        slicer_path = find_prusaslicer()

        # Login once (unless dry)
        token = None
        if not args.dry:
            try:
                token = api_login(args.api, args.user, args.password)
            except Exception as e:
                print(f"✗ Login failed: {e}")
                sys.exit(1)

        results = []
        for i, sf in enumerate(subfolders, 1):
            print(f"\n{'─'*50}")
            print(f"  [{i}/{len(subfolders)}] {sf.name}")
            print(f"{'─'*50}")
            r = process_folder(str(sf), args, slicer_path, token)
            results.append(r)

        # Summary
        ok = sum(1 for r in results if r.get("ok"))
        fail = len(results) - ok
        print(f"\n{'='*50}")
        print(f"  ✅ {ok} uploaded  ❌ {fail} failed")
        print(f"{'='*50}\n")

    else:
        # ── Single mode ──
        slicer_path = find_prusaslicer()

        print(f"\n🔍 PrusaSlicer: {Path(slicer_path).name if slicer_path else 'not found'}")
        if args.profile:
            print(f"📄 Profile: {args.profile}")

        token = None
        if not args.dry:
            print("🔑 Login...")
            try:
                token = api_login(args.api, args.user, args.password)
                print("   ✓ OK")
            except Exception as e:
                print(f"   ✗ {e}")
                sys.exit(1)

        r = process_folder(str(folder), args, slicer_path, token)

        if args.dry:
            print("\n  (--dry — stopping)")
        elif r.get("ok"):
            print(f"\n   http://localhost:5173/ (catalog)")


if __name__ == "__main__":
    main()
