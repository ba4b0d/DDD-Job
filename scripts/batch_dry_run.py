#!/usr/bin/env python3
"""
batch_dry_run.py — Dry-run (parse + slice) every product folder under a
nested category/product tree, with a live progress bar.

Folder layout supported:
  <base>/
    <category>/
      <product_id> <product_name>/
        *.3mf | *.stl  (model — sliced by OrcaSlicer for real time/weight)
        img1.jpg ...   (images — counted, not uploaded in dry mode)

Usage:
  python scripts/batch_dry_run.py "E:\\our 3d job\\final proudocts"
  python scripts/batch_dry_run.py <folder> --no-slice      # skip OrcaSlicer
  python scripts/batch_dry_run.py <folder> --pattern FLEXI # only matching products
  python scripts/batch_dry_run.py <folder> --out report.json
  python scripts/batch_dry_run.py <folder> --workers 4      # parallel slicing

Parallel slicing spawns `--workers` independent OrcaSlicer CLI processes.
A short self-retry pass re-runs products that produced no slice data the
first time (OrcaSlicer can transiently fail under load), so transient
failures don't get mis-labelled as bad files.
"""

import argparse
import json
import re
import subprocess
import sys
import time
from datetime import timedelta
from pathlib import Path
from concurrent.futures import ThreadPoolExecutor, as_completed

MODEL_EXTS = {".3mf", ".stl"}


def find_products(base: Path):
    """Return list of (category_name, product_folder).

    Supports two layouts:
      <base>/<category>/<product>/        (nested: categories contain products)
      <base>/<product>/                   (flat: base *is* the category)
    """
    products = []
    if not base.is_dir():
        print(f"✗ Not a directory: {base}")
        sys.exit(1)

    def has_model(d):
        return any(f.suffix.lower() in MODEL_EXTS for f in d.iterdir())

    kids = sorted([d for d in base.iterdir() if d.is_dir()])
    # If the immediate children look like products (contain a model), this folder
    # is itself a category → products are direct children.
    direct_products = any(has_model(d) for d in kids)
    if direct_products:
        for prod in kids:
            if has_model(prod):
                products.append((base.name, prod))
        return products

    # Otherwise treat children as categories.
    for cat in kids:
        for prod in sorted([d for d in cat.iterdir() if d.is_dir()]):
            if has_model(prod):
                products.append((cat.name, prod))
    return products


def parse_summary(stdout: str) -> dict:
    """Extract weight/time/bbox/images from upload_product.py --dry output."""
    s = {"sliced": False, "weight_g": None, "time_s": None, "filament_mm": None,
         "bbox": None, "images": 0, "note": ""}

    m = re.search(r"⚖️\s+([\d.]+)g\s+⏱️\s+([0-9a-z ]+?)\s+🧵\s+([\d.]+)mm", stdout)
    if m:
        s["sliced"] = True
        s["weight_g"] = float(m.group(1))
        s["time_s"] = parse_hms(m.group(2))
        s["filament_mm"] = float(m.group(3))
    else:
        m = re.search(r"⚖️\s+~([\d.]+)g\s+\(estimated\)", stdout)
        if m:
            s["weight_g"] = float(m.group(1))
            s["note"] = "estimated (no slice data)"

    m = re.search(r"🖼️\s+(\d+)\s+image", stdout)
    if m:
        s["images"] = int(m.group(1))

    m = re.search(r"📐\s+([\d.]+)\s*×\s*([\d.]+)\s*×\s*([\d.]+)\s*mm", stdout)
    if m:
        s["bbox"] = [float(m.group(1)), float(m.group(2)), float(m.group(3))]

    if "Multiple models" in stdout:
        s["note"] = (s["note"] + "; multiple models, first used").strip("; ")
    return s


def parse_hms(s: str) -> int:
    """'2h 1m' / '38 min' / '20 min' → seconds."""
    total = 0
    for n, unit in re.findall(r"(\d+)\s*(h|m|min|s)", s):
        n = int(n)
        if unit == "h":
            total += n * 3600
        elif unit in ("m", "min"):
            total += n * 60
        else:
            total += n
    return total


def main():
    ap = argparse.ArgumentParser(description="Batch dry-run with progress bar")
    ap.add_argument("base", help="Base folder containing category subfolders")
    ap.add_argument("--no-slice", action="store_true", help="Skip OrcaSlicer slicing")
    ap.add_argument("--pattern", default=None, help="Only products whose folder name matches regex")
    ap.add_argument("--out", default="", help="JSON report path (optional)")
    ap.add_argument("--max", type=int, default=0, help="Stop after N products (debug)")
    ap.add_argument("--workers", type=int, default=1,
                    help="Parallel OrcaSlicer workers (default 1 = sequential)")
    ap.add_argument("--scale", type=float, default=1.0,
                    help="Scale factor for the model (e.g. 0.5 = 50%%). NOTE: scale != 1.0 "
                         "switches slicing to the PrusaSlicer path, which handles multi-object "
                         "3MFs that OrcaSlicer CLI rejects.")
    ap.add_argument("--force-prusaslicer", action="store_true",
                    help="Use the PrusaSlicer merge-to-STL path even at 1.0 scale "
                         "(for multi-object 3MFs that OrcaSlicer CLI rejects)")
    args = ap.parse_args()

    products = find_products(Path(args.base))
    if args.pattern:
        import re as _re
        products = [(c, p) for c, p in products if _re.search(args.pattern, p.name)]
    if args.max:
        products = products[: args.max]

    total = len(products)
    print(f"\n📦 {total} product(s) found\n", flush=True)

    slicer = "skipped" if args.no_slice else "enabled"
    print(f"🖨️  OrcaSlicer: {slicer} | workers: {args.workers}\n", flush=True)

    results = [None] * total   # index-aligned so the bar shows stable order
    t_start = time.time()

    def run_one(idx, cat, prod):
        cmd = [sys.executable, str(Path(__file__).parent / "upload_product.py"),
               str(prod), "--dry"]
        if args.no_slice:
            cmd.append("--no-slice")
        if args.scale != 1.0:
            cmd += ["--scale", str(args.scale)]
        if args.force_prusaslicer:
            cmd += ["--force-prusaslicer"]
        t0 = time.time()
        r = subprocess.run(cmd, capture_output=True, text=True,
                           encoding="utf-8", errors="replace")
        elapsed = time.time() - t0
        info = parse_summary(r.stdout)
        if not info["weight_g"] and not args.no_slice:
            # Debug: dump raw output for empty results to a sidecar file
            import os as _os
            dump_dir = Path(_os.environ.get("TEMP", "."))
            (dump_dir / "batch_empty_stdout.log").open("a", encoding="utf-8").write(
                f"\n===== {prod.name} (rc={r.returncode}) =====\n{r.stdout}\n"
            )
        info.update({
            "category": cat,
            "folder": prod.name,
            "product_id": prod.name.split()[0] if prod.name.split() else "",
            "status": "ok" if r.returncode == 0 else "error",
            "slice_sec": round(elapsed, 1),
        })
        return idx, info

    def show_progress(done_count):
        pct = done_count / total
        bar_w = 30
        filled = int(bar_w * pct)
        bar = "█" * filled + "░" * (bar_w - filled)
        elapsed_total = time.time() - t_start
        per = elapsed_total / max(done_count, 1)
        eta = timedelta(seconds=int(per * (total - done_count)))
        sys.stdout.write(
            f"\r[{done_count:>4}/{total}] {pct*100:5.1f}% |{bar}| "
            f"{elapsed_total:5.0f}s elapsed, ETA {eta}"
        )
        sys.stdout.flush()

    # ── pass 1: parallel ──
    done = 0
    with ThreadPoolExecutor(max_workers=max(1, args.workers)) as ex:
        futures = {ex.submit(run_one, i, c, p): i for i, (c, p) in enumerate(products)}
        for fut in as_completed(futures):
            idx, info = fut.result()
            results[idx] = info
            done += 1
            show_progress(done)
    sys.stdout.write("\n")

    # ── pass 2+: retry products with no data (transient OrcaSlicer failures).
    # Loop up to 3 attempts, staggering starts so concurrent instances don't
    # collide on the same moment.
    MAX_RETRIES = 3
    for attempt in range(1, MAX_RETRIES + 1):
        retry_idx = [i for i, r in enumerate(results)
                     if r and not r["sliced"] and not r["weight_g"]]
        if not retry_idx:
            break
        print(f"\n🔁 Retry {attempt}/{MAX_RETRIES}: {len(retry_idx)} product(s) with no data...",
              flush=True)
        time.sleep(2)
        done = 0
        with ThreadPoolExecutor(max_workers=max(1, args.workers)) as ex:
            futures = {ex.submit(run_one, i, products[i][0], products[i][1]): i
                       for i in retry_idx}
            for fut in as_completed(futures):
                idx, info = fut.result()
                results[idx] = info
                done += 1
                show_progress(done)
        sys.stdout.write("\n")

    # ── final pass: sequential fallback for any that are STILL empty after
    # parallel retries. A lone OrcaSlicer process is far more reliable than
    # concurrent ones, so this cleans up the stragglers.
    leftover = [i for i, r in enumerate(results)
                if r and not r["sliced"] and not r["weight_g"]]
    if leftover:
        print(f"\n🛟 Sequential fallback for {len(leftover)} remaining product(s)...",
              flush=True)
        done = 0
        for i in leftover:
            _, info = run_one(i, products[i][0], products[i][1])
            results[i] = info
            done += 1
            show_progress(done)
            time.sleep(1)   # breathe between sequential slices
        sys.stdout.write("\n")
    elapsed_total = time.time() - t_start
    sys.stdout.write(f"\n\n{'='*70}\n")
    n_sliced = sum(1 for x in results if x["sliced"])
    n_est = sum(1 for x in results if not x["sliced"] and x["weight_g"])
    n_fail = sum(1 for x in results if not x["weight_g"] or x["status"] == "error")
    print(f"  DONE in {timedelta(seconds=int(elapsed_total))}")
    print(f"  ✅ {n_sliced} sliced with real time/weight")
    print(f"  ⚠️  {n_est} estimated (slice failed / no slice data)")
    print(f"  ❌ {n_fail} with no weight data")
    print(f"{'='*70}\n")

    if args.out:
        Path(args.out).write_text(
            json.dumps(results, ensure_ascii=False, indent=2), encoding="utf-8"
        )
        print(f"Report saved to {args.out}")


if __name__ == "__main__":
    main()
