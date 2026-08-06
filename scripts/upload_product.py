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
from xml.etree.ElementTree import fromstring
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
        # Bambu/OrcaSlicer split multi-object 3MFs into 3D/Objects/*.model
        # in addition to the main 3D/3dmodel.model. Aggregate ALL of them.
        model_names = []
        for n in names:
            if n.endswith("3dmodel.model") or n.endswith(".model"):
                model_names.append(n)
        # Dedup but keep main model first
        seen = set()
        ordered = []
        for n in model_names:
            if n not in seen:
                ordered.append(n)
                seen.add(n)

        # Aggregate mesh across all model files
        agg = {"volume_mm3": 0, "triangles": 0, "bbox": None, "_xs": [], "_ys": [], "_zs": []}
        for model_name in ordered:
            xml_data = zf.read(model_name)
            sub = _parse_model_xml(xml_data)
            agg["volume_mm3"] += sub.get("volume_mm3", 0) or 0
            agg["triangles"] += sub.get("triangles", 0) or 0
            agg["_xs"] += sub.get("_xs", []) or []
            agg["_ys"] += sub.get("_ys", []) or []
            agg["_zs"] += sub.get("_zs", []) or []
        if agg["_xs"]:
            agg["bbox"] = [min(agg["_xs"]), min(agg["_ys"]), min(agg["_zs"]),
                           max(agg["_xs"]), max(agg["_ys"]), max(agg["_zs"])]
        # Drop the per-axis lists to keep the result clean
        for k in ("_xs", "_ys", "_zs"):
            agg.pop(k, None)
        result.update(agg)

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
    """Parse XML with external entity expansion disabled (XXE-safe)."""
    # Python's stdlib ElementTree doesn't fetch external entities by default,
    # so plain fromstring is already XXE-safe for untrusted XML.
    return fromstring(xml_bytes)


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
    """Extract mesh volume from 3MF model XML. Highly optimized using regex to avoid XML DOM overhead."""
    try:
        xml_str = xml_bytes.decode('utf-8', errors='ignore')
    except Exception:
        return {"volume_mm3": 0, "triangles": 0}

    # Fast regex match for vertices
    v_matches = re.findall(r'<vertex\s+x=\"([^\"]+)\"\s+y=\"([^\"]+)\"\s+z=\"([^\"]+)\"', xml_str)
    if not v_matches:
        return {"volume_mm3": 0, "triangles": 0}

    vlist = []
    min_xyz = [float("inf")] * 3
    max_xyz = [float("-inf")] * 3
    for x_s, y_s, z_s in v_matches:
        x, y, z = float(x_s), float(y_s), float(z_s)
        vlist.append((x, y, z))
        min_xyz[0] = min(min_xyz[0], x)
        min_xyz[1] = min(min_xyz[1], y)
        min_xyz[2] = min(min_xyz[2], z)
        max_xyz[0] = max(max_xyz[0], x)
        max_xyz[1] = max(max_xyz[1], y)
        max_xyz[2] = max(max_xyz[2], z)

    # Fast regex match for triangles
    t_matches = re.findall(r'<triangle\s+v1=\"([^\"]+)\"\s+v2=\"([^\"]+)\"\s+v3=\"([^\"]+)\"', xml_str)
    vol = 0.0
    triangles = 0

    for v1_s, v2_s, v3_s in t_matches:
        try:
            v1, v2, v3 = int(v1_s), int(v2_s), int(v3_s)
            p1, p2, p3 = vlist[v1], vlist[v2], vlist[v3]
        except (ValueError, IndexError):
            continue
        vol += (p1[0]*(p2[1]*p3[2] - p3[1]*p2[2]) - p2[0]*(p1[1]*p3[2] - p3[1]*p1[2]) + p3[0]*(p1[1]*p2[2] - p2[1]*p1[2])) / 6.0
        triangles += 1

    bbox = None
    if triangles > 0:
        bbox = [round(min_xyz[i], 2) for i in range(3)] + [round(max_xyz[i], 2) for i in range(3)]

    return {
        "volume_mm3": abs(vol),
        "triangles": triangles,
        "bbox": bbox,  # [min_x, min_y, min_z, max_x, max_y, max_z]
        "_xs": [v[0] for v in vlist],
        "_ys": [v[1] for v in vlist],
        "_zs": [v[2] for v in vlist],
    }


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


# ── OrcaSlicer CLI (headless accurate slicing) ─────────────────────


def find_prusaslicer() -> str | None:
    """Find prusa-slicer-console.exe on the system."""
    candidates = [
        r"C:\Program Files\Prusa3D\PrusaSlicer\prusa-slicer-console.exe",
        r"C:\Program Files (x86)\Prusa3D\PrusaSlicer\prusa-slicer-console.exe",
    ]
    for p in candidates:
        if os.path.isfile(p):
            return p
    import shutil
    return shutil.which("prusa-slicer-console") or shutil.which("prusa-slicer")


def _parse_time_str(time_str: str) -> float:
    """Parse Slic3r print time string (e.g. '31m 9s' or '2h 11m') to seconds."""
    seconds = 0.0
    # Match hours
    m_h = re.search(r'(\d+)\s*h', time_str)
    if m_h:
        seconds += int(m_h.group(1)) * 3600
    # Match minutes
    m_m = re.search(r'(\d+)\s*m', time_str)
    if m_m:
        seconds += int(m_m.group(1)) * 60
    # Match seconds
    m_s = re.search(r'(\d+)\s*s', time_str)
    if m_s:
        seconds += int(m_s.group(1))
    return seconds


def extract_and_scale_stl(model_path: str, scale_factor: float) -> str | None:
    """Extract and scale model to a temporary STL file."""
    ext = model_path.lower()
    
    # Generate temp stl path
    fd, temp_stl = tempfile.mkstemp(suffix=".stl")
    os.close(fd)
    
    if ext.endswith(".3mf"):
        all_verts = []
        all_tris = []
        with zipfile.ZipFile(model_path, "r") as zf:
            models = [n for n in zf.namelist() if n.startswith("3D/Objects/") and n.endswith(".model")]
            if not models:
                models = [n for n in zf.namelist() if n.endswith("3dmodel.model")]
            
            v_offset = 0
            for m_file in models:
                xml = zf.read(m_file).decode("utf-8", errors="ignore")
                verts = re.findall(r'<vertex\s+x="([^"]+)"\s+y="([^"]+)"\s+z="([^"]+)"', xml)
                tris = re.findall(r'<triangle\s+v1="([^"]+)"\s+v2="([^"]+)"\s+v3="([^"]+)"', xml)
                
                for v in verts:
                    all_verts.append((
                        float(v[0]) * scale_factor,
                        float(v[1]) * scale_factor,
                        float(v[2]) * scale_factor
                    ))
                for t in tris:
                    all_tris.append((
                        int(t[0]) + v_offset,
                        int(t[1]) + v_offset,
                        int(t[2]) + v_offset
                    ))
                v_offset += len(verts)
                
        if not all_verts or not all_tris:
            if os.path.exists(temp_stl): os.remove(temp_stl)
            return None
            
        with open(temp_stl, "wb") as f:
            f.write(b"\x00" * 80)
            f.write(struct.pack("<I", len(all_tris)))
            for t in all_tris:
                f.write(struct.pack("<fff", 0.0, 0.0, 0.0))
                for v_idx in t:
                    f.write(struct.pack("<fff", *all_verts[v_idx]))
                f.write(struct.pack("<H", 0))
                
        return temp_stl
        
    elif ext.endswith(".stl"):
        # Scale binary STL directly
        try:
            with open(model_path, "rb") as f_in:
                header = f_in.read(80)
                num_tris_bytes = f_in.read(4)
                if len(num_tris_bytes) < 4:
                    if os.path.exists(temp_stl): os.remove(temp_stl)
                    return None
                num_tris = struct.unpack("<I", num_tris_bytes)[0]
                
                with open(temp_stl, "wb") as f_out:
                    f_out.write(header)
                    f_out.write(num_tris_bytes)
                    for _ in range(num_tris):
                        normal = f_in.read(12)
                        v1 = struct.pack("<fff", *[x * scale_factor for x in struct.unpack("<fff", f_in.read(12))])
                        v2 = struct.pack("<fff", *[x * scale_factor for x in struct.unpack("<fff", f_in.read(12))])
                        v3 = struct.pack("<fff", *[x * scale_factor for x in struct.unpack("<fff", f_in.read(12))])
                        attr = f_in.read(2)
                        f_out.write(normal + v1 + v2 + v3 + attr)
            return temp_stl
        except Exception:
            if os.path.exists(temp_stl): os.remove(temp_stl)
            return None
            
    return None


def slice_with_prusaslicer(model_path: str, slicer: str = None, profile: str = None) -> dict:
    """Slice with PrusaSlicer CLI -> accurate time + weight from comments."""
    if not slicer:
        slicer = find_prusaslicer()
    if not slicer:
        return {"error": "PrusaSlicer not found", "time_seconds": None, "weight_g": None, "filament_mm": None}
        
    if not profile:
        profile = os.path.join(os.path.dirname(os.path.abspath(__file__)), "kobra_s1_pla.ini")
        
    tmp_path = model_path.replace(".stl", "_sliced.gcode").replace(".3mf", "_sliced.gcode")
    if tmp_path == model_path:
        tmp_path += ".gcode"
        
    try:
        cmd = [slicer, "--slice", "--export-gcode", "--output", tmp_path]
        if os.path.isfile(profile):
            cmd += ["--load", profile]
        cmd += [model_path]
        
        r = subprocess.run(cmd, capture_output=True, text=True, timeout=120)
        if not os.path.isfile(tmp_path) or os.path.getsize(tmp_path) < 100:
            return {"error": f"Slice failed: {r.stderr.strip() or r.stdout.strip()}"}
            
        result = {"time_seconds": None, "weight_g": None, "filament_mm": None}
        with open(tmp_path, "r", errors="ignore") as f:
            for line in f:
                if "estimated printing time" in line:
                    t_str = line.split("=")[-1].strip()
                    result["time_seconds"] = _parse_time_str(t_str)
                elif "filament used [g]" in line:
                    result["weight_g"] = float(line.split("=")[-1].strip())
                elif "filament used [mm]" in line:
                    result["filament_mm"] = float(line.split("=")[-1].strip())
        return result
    except Exception as e:
        return {"error": str(e)}
    finally:
        if os.path.exists(tmp_path):
            os.remove(tmp_path)


def find_orcaslicer() -> str | None:
    """Find orca-slicer.exe on the system."""
    candidates = [
        r"C:\Program Files\OrcaSlicer\orca-slicer.exe",
        r"C:\Program Files (x86)\OrcaSlicer\orca-slicer.exe",
    ]
    for p in candidates:
        if os.path.isfile(p):
            return p
    import shutil
    return shutil.which("orca-slicer")


def slice_with_orcaslicer(model_path: str, slicer: str = None, filament_density: float = 1.24, profile: str = None, **_kw) -> dict:
    """Slice with OrcaSlicer CLI -> accurate time + weight from slice_info.config.

    OrcaSlicer CLI: --slice 1 --export-3mf <output> <input.3mf>
    Parses slice_info.config from the output 3MF for weight, prediction (time), filament length.
    """
    if not slicer:
        slicer = find_orcaslicer()
    if not slicer:
        return {"error": "OrcaSlicer not found", "time_seconds": None, "weight_g": None, "filament_mm": None}

    tmp_fd, tmp_3mf = tempfile.mkstemp(suffix=".3mf")
    os.close(tmp_fd)
    try:
        cmd = [slicer, "--slice", "1", "--export-3mf", tmp_3mf, model_path]
        r = subprocess.run(cmd, capture_output=True, text=True, timeout=120)
        if not os.path.isfile(tmp_3mf) or os.path.getsize(tmp_3mf) < 100:
            return {"error": f"Slice failed: {r.stdout.strip()[:200]}"}

        result = {"time_seconds": None, "weight_g": None, "filament_mm": None}
        with zipfile.ZipFile(tmp_3mf, "r") as zf:
            si = zf.read("Metadata/slice_info.config").decode("utf-8", errors="ignore")
            m = re.search(r'key="weight"\s+value="([\d.]+)"', si)
            if m:
                result["weight_g"] = float(m.group(1))
            m = re.search(r'key="prediction"\s+value="([\d.]+)"', si)
            if m:
                result["time_seconds"] = int(float(m.group(1)))
            m = re.search(r'used_m="([\d.]+)"', si)
            if m:
                result["filament_mm"] = round(float(m.group(1)) * 1000)

        if result["weight_g"] is None and result["time_seconds"] is None:
            return {"error": "No slice data in output 3MF"}

        return result

    except subprocess.TimeoutExpired:
        return {"error": "OrcaSlicer slice timed out (120s)"}
    except Exception as e:
        return {"error": str(e)}
    finally:
        if os.path.exists(tmp_3mf):
            os.remove(tmp_3mf)


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

# Use a Session so the httpOnly access_token cookie set by /auth/login
# is automatically attached to every subsequent request. The Bearer
# header fallback is kept for older deployments.
_session = requests.Session()


def api_login(api: str, user: str, pw: str) -> str:
    r = _session.post(f"{api}/api/v1/auth/login", json={"username": user, "password": pw})
    r.raise_for_status()
    # New auth (Tier 1+): no token in body — cookie only. Use cookie.
    # Return any token found in body for older deployments.
    return r.json().get("token") or r.json().get("access_token") or "cookie"


def _headers(token: str) -> dict:
    """Bearer header only if a real token is provided; cookie auth otherwise."""
    if token and token != "cookie":
        return {"Authorization": f"Bearer {token}"}
    return {}


def api_ensure_category(api: str, token: str, category_name: str) -> int | None:
    """Check if category exists in DB (or create it if missing). Returns category_id."""
    if not category_name:
        return None

    # List all categories (flat)
    try:
        r = _session.get(f"{api}/api/v1/categories/all", headers=_headers(token))
        if r.status_code == 200:
            for c in r.json():
                if c.get("name", "").strip().lower() == category_name.strip().lower():
                    return c.get("id")
    except Exception:
        pass

    # Create category if missing
    try:
        r = _session.post(
            f"{api}/api/v1/categories",
            json={"name": category_name.strip()},
            headers=_headers(token),
        )
        if r.status_code in (200, 201):
            return r.json().get("id")
        elif r.status_code == 400 and "قبلاً وجود دارد" in r.text:
            # Race condition / existing category fetch again
            r2 = _session.get(f"{api}/api/v1/categories/all", headers=_headers(token))
            if r2.status_code == 200:
                for c in r2.json():
                    if c.get("name", "").strip().lower() == category_name.strip().lower():
                        return c.get("id")
    except Exception as e:
        print(f"   ⚠ Failed to create/resolve category '{category_name}': {e}")
    return None


def api_create(api: str, token: str, data: dict) -> dict:
    r = _session.post(f"{api}/api/v1/products", json=data, headers=_headers(token))
    r.raise_for_status()
    return r.json()


MIME = {".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".png": "image/png",
        ".webp": "image/webp", ".gif": "image/gif", ".bmp": "image/bmp"}


def api_upload_images(api: str, token: str, pid: int, images: list) -> dict:
    files = []
    for img in images:
        ct = MIME.get(img.suffix.lower(), "application/octet-stream")
        files.append(("files", (img.name, img.read_bytes(), ct)))
    r = _session.post(f"{api}/api/v1/products/{pid}/images", files=files, headers=_headers(token))
    r.raise_for_status()
    return r.json()


def extract_local_bbox(model_path) -> dict | None:
    """Parse a 3MF or STL file locally to extract bounding-box dimensions in mm.
    Returns {"dimension_x", "dimension_y", "dimension_z"} or None on failure."""
    ext = model_path.suffix.lower()
    if ext == ".3mf":
        info = parse_3mf(str(model_path))
    elif ext == ".stl":
        info = parse_stl(str(model_path))
    else:
        return None
    bbox = info.get("bbox")
    if not bbox or len(bbox) < 6:
        return None
    # bbox = [min_x, min_y, min_z, max_x, max_y, max_z]
    return {
        "dimension_x": round(bbox[3] - bbox[0], 2),
        "dimension_y": round(bbox[4] - bbox[1], 2),
        "dimension_z": round(bbox[5] - bbox[2], 2),
    }


def api_update_dimensions(api: str, token: str, pid: int, bbox: dict) -> dict:
    r = requests.put(
        f"{api}/api/v1/products/{pid}",
        json=bbox,
        headers={"Authorization": f"Bearer {token}"},
    )
    r.raise_for_status()
    return r.json()


# ── Main ────────────────────────────────────────────────────────────

def process_folder(folder_path: str, args, slicer_path: str, token: str = None) -> dict:
    """Process one product folder. Returns {"id": ..., "name": ..., "ok": bool}."""
    info = parse_folder(folder_path)
    
    slice_data = {}
    mesh = {}
    
    # Check if we need to scale the model
    if args.scale != 1.0:
        print(f"     📐 Scaling model to {args.scale:.2f}x...")
        temp_stl = extract_and_scale_stl(str(info["model_file"]), args.scale)
        if temp_stl:
            # Slice with PrusaSlicer (since OrcaSlicer has issues with raw multi-part STL/coordinates in CLI)
            prusa_slicer = find_prusaslicer()
            if prusa_slicer:
                slice_data = slice_with_prusaslicer(temp_stl, prusa_slicer)
                if slice_data.get("error"):
                    print(f"   ⚠ PrusaSlicer slice failed: {slice_data['error']}")
                    slice_data = {}
            else:
                print("   ⚠ PrusaSlicer not found for scaled slicing")
                
            # Parse mesh from scaled temp STL
            mesh = parse_stl(temp_stl)
            
            # Remove temp stl file
            if os.path.exists(temp_stl):
                os.remove(temp_stl)
        else:
            print("   ⚠ Mesh extraction/scaling failed")
            ext = info["model_file"].suffix.lower()
            mesh = parse_3mf(str(info["model_file"])) if ext == ".3mf" else parse_stl(str(info["model_file"]))
    else:
        # Normal behavior (1.0 scale with OrcaSlicer)
        if slicer_path:
            slice_data = slice_with_orcaslicer(str(info["model_file"]), slicer_path, args.density, args.profile)
            if slice_data.get("error"):
                print(f"   ⚠ {slice_data['error']}")
                slice_data = {}
        ext = info["model_file"].suffix.lower()
        mesh = parse_3mf(str(info["model_file"])) if ext == ".3mf" else parse_stl(str(info["model_file"]))

    # Weight + time
    weight = slice_data.get("weight_g") or mesh.get("slice", {}).get("weight_g")
    time_s = slice_data.get("time_seconds") or mesh.get("slice", {}).get("time_seconds")
    if not weight and mesh.get("volume_mm3", 0) > 0:
        weight = estimate_weight(mesh["volume_mm3"], args.density)

    # Summary
    print(f"\n  📁 {info['folder'].name}")
    print(f"     🏷️  {info['product_id'] or '(auto)'}  📝 {info['name']}")
    print(f"     📦 {info['model_file'].name} (Scale: {args.scale:.2f}x)")
    if slice_data.get("time_seconds"):
        print(f"     ⚖️  {weight}g  ⏱️  {fmt_time(time_s)}  🧵 {slice_data.get('filament_mm', 0):.0f}mm")
    elif weight:
        print(f"     ⚖️  ~{weight}g (estimated)")
    print(f"     🖼️  {len(info['images'])} image(s)")

    # Bbox extraction
    bbox = mesh.get("bbox")
    if bbox:
        if isinstance(bbox, dict):
            bbox_dict = {
                "dimension_x": bbox.get("x", 0),
                "dimension_y": bbox.get("y", 0),
                "dimension_z": bbox.get("z", 0),
            }
        else:
            bbox_dict = {
                "dimension_x": round(bbox[3] - bbox[0], 2),
                "dimension_y": round(bbox[4] - bbox[1], 2),
                "dimension_z": round(bbox[5] - bbox[2], 2),
            }
        print(f"     📐 {bbox_dict['dimension_x']:.1f} × {bbox_dict['dimension_y']:.1f} × {bbox_dict['dimension_z']:.1f} mm")
        info["bbox"] = bbox_dict

    if args.dry:
        return {"ok": True, "name": info["name"]}

    # Create product
    if args.existing_id:
        pid = args.existing_id
    else:
        # Resolve / auto-create category in DB and link via category_ids
        cat_id = None
        if args.category:
            cat_id = api_ensure_category(args.api, token, args.category)

        data = {
            "product_id": info["product_id"],
            "name": info["name"],
            "weight_g": weight or 0,
            "print_time_hours": round(time_s / 3600, 2) if time_s else 0,
            "category": args.category,
            "machine_id": args.machine_id,
            "material_id": args.material_id,
        }
        if cat_id:
            data["category_ids"] = [cat_id]

        if info.get("bbox"):
            data.update(info["bbox"])
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
    ap.add_argument("--profile", default=None, help="OrcaSlicer .ini profile (printer+print+filament)")
    ap.add_argument("--dry", action="store_true", help="Parse only — no API calls")
    ap.add_argument("--existing-id", type=int, default=None, help="Upload images to existing product")
    ap.add_argument("--no-slice", action="store_true", help="Skip OrcaSlicer slicing")
    ap.add_argument("--pattern", default=None, help="Filter folders by substring in folder name")
    ap.add_argument("--scale", type=float, default=1.0, help="Scale factor for the model (e.g. 0.5 to scale by 50%%)")
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
    if args.pattern:
        import re
        subfolders = [d for d in subfolders if re.search(args.pattern, d.name)]

    if subfolders:
        # ── Batch mode ──
        slicer_path = None if args.no_slice else find_orcaslicer()
        print(f"\n📦 Batch mode: {len(subfolders)} product(s) in {folder.name}\n")
        print(f"   🖨️  OrcaSlicer: {slicer_path or ('skipped' if args.no_slice else 'not found')}")
        if args.profile:
            print(f"   📄 Profile: {args.profile}")
        print()

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
        slicer_path = None if args.no_slice else find_orcaslicer()

        print(f"\n🔍 OrcaSlicer: {Path(slicer_path).name if slicer_path else ('skipped' if args.no_slice else 'not found')}")
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
