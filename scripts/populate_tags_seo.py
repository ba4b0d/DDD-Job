# -*- coding: utf-8 -*-
"""Fill missing tags + SEO notes for the 104 freshly-uploaded products.

Conventions (mirror existing PT/KE products):
  tags  = Persian, comma-separated, 3-5 keywords: type, design, theme, هدیه
  notes = «design» + پرینت سه‌بعدی FDM از فیلامنت PLA + weight/dims + use case
          + قابل سفارش در رنگ‌های مختلف
"""
import json
import os
import re
import sys
import time

TEMP = os.environ["TEMP"]
BASE = "https://spaghettiprints.ir/api/v1"

missing = json.load(open(os.path.join(TEMP, "missing_seo.json"), encoding="utf-8"))

# ── Family templates ────────────────────────────────────────────────────
def design_from_name(fam, name):
    """Strip the family prefix to get the design/character name."""
    prefixes = {
        "WA": ["تابلو سه بعدی ", "تابلو سه‌بعدی ", "تابلو "],
        "CH": ["نظم دنده آرایشی ", "نظم دهنده آرایشی "],
        "JO": ["نظم دنده جواهر ", "نظم دهنده جواهر ", "نظم دهنده ", "نظم دنده "],
        "JS": ["نگهدارنده دسته "],
        "PS": ["نگهدارنده موبایل ", "نگدارنده موبایل "],
        "SC": ["کاور کلید "],
        "FF": ["بادبزن "],
    }
    for pre in prefixes.get(fam, []):
        if name.startswith(pre):
            return name[len(pre):].strip() or name
    return name  # FG names are plain "X نشسته"

TYPE_LABEL = {
    "FF": "بادبزن دستی",
    "WA": "تابلو دیواری سه‌بعدی دکوراتیو",
    "FG": "فیگور نشسته کلکسیونی",
    "SC": "کاور کلید و پریز برق",
    "CH": "نظم‌دهنده رومیزی آرایشی",
    "JO": "نظم‌دهنده جواهرات",
    "JS": "نگهدارنده دسته",
    "PS": "نگهدارنده موبایل",
}

USE_CASE = {
    "FF": "گزینه‌ای سبک و خنک برای روزهای گرم، مناسب استفاده روزمره",
    "WA": "مناسب دکوراسیون اتاق، پذیرایی و هدیه به طرفداران",
    "FG": "دکور شلف و میز کار، گزینه‌ای عالی برای کلکسیون و هدیه",
    "SC": "یکپارچه و مطابق با کلید و پریز استاندارد، مناسب دکوراسیون منزل",
    "CH": "سازمان‌دهی لوازم آرایش و میز توالت با ظاهری شیک",
    "JO": "نظم‌دهی گوشواره، انگشتر، گردنبند و کش مو روی میز آرایش",
    "JS": "جلوگیری از برخورد دست با دیوار و چارچوب در، مناسب منزل و محل کار",
    "PS": "قرارگیری راحت گوشی در کنار میز کار و پاتختی به‌صورت عمودی",
}

def dims_text(bb):
    if not bb or len(bb) != 3:
        return ""
    vals = []
    for x in bb:
        try:
            f = float(x)
        except (TypeError, ValueError):
            return ""
        vals.append(f)
    vals = [v / 10 for v in vals]  # mm → cm
    if any(v <= 0 for v in vals):
        return ""
    return f"{vals[0]:.1f}×{vals[1]:.1f}×{vals[2]:.1f} سانتیمتر"

def build(p):
    pid = p.get("product_id") or ""
    fam = pid[:2]
    name = p.get("name") or ""
    design = design_from_name(fam, name)
    w = p.get("weight_g") or 0
    d = dims_text([p.get("dimension_x"), p.get("dimension_y"), p.get("dimension_z")])

    # ── tags ──
    common = {
        "FF": ["بادبزن", "دستی"],
        "WA": ["تابلو", "دیواری", "دکوری"],
        "FG": ["فیگور", "مجسمه", "دکوری", "کلکسیونی"],
        "SC": ["کاور", "کلید", "برق", "دکوری"],
        "CH": ["نظم‌دهنده", "آرایشی", "رومیزی", "دکوری"],
        "JO": ["نظم‌دهنده", "جواهرات", "رومیزی", "دکوری"],
        "JS": ["نگهدارنده", "دسته", "دکوری"],
        "PS": ["نگهدارنده", "موبایل", "پایه", "رومیزی"],
    }
    tags = list(common.get(fam, ["سه‌بعدی", "دکوری"]))
    tags.append(design)
    tags.append("هدیه")
    tags_txt = ",".join(tags)

    # ── notes (SEO) ──
    type_lbl = TYPE_LABEL.get(fam, "محصول سه‌بعدی")
    use = USE_CASE.get(fam, "مناسب استفاده روزمره")
    parts = [f"{type_lbl} «{design}»، ساخته‌شده با پرینت سه‌بعدی FDM از فیلامنت PLA"]
    if w and w >= 5:
        parts.append(f"به وزن {w:.0f} گرم")
    if d:
        parts.append(f"ابعاد {d}")
    spec = " و ".join([parts[0]] + [p for p in parts[1:]]) if len(parts) > 1 else parts[0]
    notes_txt = f"{spec}. {use}، قابل سفارش در رنگ‌های مختلف."

    return tags_txt, notes_txt

# ── Apply via API ───────────────────────────────────────────────────────
import urllib.request
import urllib.error
import http.cookiejar

cj = http.cookiejar.MozillaCookieJar()
opener = urllib.request.build_opener(urllib.request.HTTPCookieProcessor(cj))
opener.addheaders = [("User-Agent", "Mozilla/5.0")]

def api(method, path, body=None):
    req = urllib.request.Request(f"{BASE}{path}", method=method)
    data = None
    if body is not None:
        data = json.dumps(body, ensure_ascii=False).encode("utf-8")
        req.add_header("Content-Type", "application/json")
    with opener.open(req, data=data, timeout=30) as resp:
        return json.loads(resp.read().decode("utf-8"))

api("POST", "/auth/login", {"username": "admin", "password": "Adadep@1625"})

ok, failed, skipped = 0, [], []
for p in sorted(missing, key=lambda x: x["product_id"]):
    tags_txt, notes_txt = build(p)
    # sanity: skip empty name
    if not p.get("product_id") or not p.get("name"):
        skipped.append((p.get("product_id"), "empty name/product_id"))
        continue
    try:
        api("PUT", f"/products/{p['id']}", {"tags": tags_txt, "notes": notes_txt})
        ok += 1
        time.sleep(2.2)  # stay under the 30/min rate limit
    except Exception as e:
        failed.append((p.get("product_id"), repr(e)))

print(f"UPDATED: {ok}  FAILED: {len(failed)}  SKIPPED: {len(skipped)}")
for pid, err in failed[:10]:
    print("  FAIL", pid, err)
for pid, why in skipped:
    print("  SKIP", pid, why)

# sample output for review
print("\n=== samples ===")
for p in sorted(missing, key=lambda x: x["product_id"])[:4]:
    t, n = build(p)
    print(f"{p['product_id']} | tags: {t}\n    notes: {n}\n")