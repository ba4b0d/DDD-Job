import os
import json
import time
import logging
import threading
import requests
from sqlalchemy.orm import Session

from app.database import engine, DB_PATH
from app.models import Product, Order, OrderItem, Settings, Material, Machine
from app.calculator import calculate_product_costs_from_dicts
from app.cache import get_settings_dict

logger = logging.getLogger(__name__)

# State storage for interactive multi-step conversations
USER_STATES = {}

MAIN_KEYBOARD = {
    "keyboard": [
        [{"text": "📦 افزودن محصول"}, {"text": "🛒 ثبت سفارش"}],
        [{"text": "📊 آمار کارگاه"}, {"text": "📋 لیست سفارشات"}],
        [{"text": "💾 دریافت پشتیبان"}]
    ],
    "resize_keyboard": True
}

INLINE_MAIN_MENU = {
    "inline_keyboard": [
        [
            {"text": "📦 افزودن محصول", "callback_data": "cmd_addproduct"},
            {"text": "🛒 ثبت سفارش", "callback_data": "cmd_addorder"}
        ],
        [
            {"text": "📊 آمار کارگاه", "callback_data": "cmd_stats"},
            {"text": "📋 لیست سفارشات", "callback_data": "cmd_orders"}
        ],
        [
            {"text": "💾 پشتیبان دیتابیس", "callback_data": "cmd_backup"}
        ]
    ]
}


def get_telegram_config():
    """Retrieve bot token, admin chat IDs, and proxy from Settings table or environment."""
    token = os.getenv("TELEGRAM_BOT_TOKEN", "")
    chat_id = os.getenv("TELEGRAM_ADMIN_CHAT_ID", "130945736")
    proxy = os.getenv("TELEGRAM_PROXY", "socks5://192.168.100.33:10808")

    try:
        with Session(engine) as db:
            token_setting = db.query(Settings).filter(Settings.key == "telegram_bot_token").first()
            if token_setting and token_setting.string_value:
                token = token_setting.string_value.strip()

            chat_setting = db.query(Settings).filter(Settings.key == "telegram_admin_chat_id").first()
            if chat_setting and chat_setting.string_value:
                chat_id = chat_setting.string_value.strip()

            proxy_setting = db.query(Settings).filter(Settings.key == "telegram_proxy").first()
            if proxy_setting and proxy_setting.string_value:
                proxy = proxy_setting.string_value.strip()
    except Exception as exc:
        logger.warning(f"Could not read Telegram config from DB: {exc}")

    proxies_dict = None
    if proxy and proxy.strip():
        proxies_dict = {"http": proxy.strip(), "https": proxy.strip()}

    # Parse multiple chat IDs (comma-separated)
    admin_chat_ids = [cid.strip() for cid in chat_id.split(",") if cid.strip()]

    return token, admin_chat_ids, proxies_dict


def send_telegram_notification(text: str, parse_mode: str = "HTML") -> bool:
    """Send an instant text message alert to all admin Telegram chat IDs."""
    token, admin_chat_ids, proxies = get_telegram_config()
    if not token or not admin_chat_ids:
        return False

    url = f"https://api.telegram.org/bot{token}/sendMessage"
    payload_template = {
        "text": text,
        "parse_mode": parse_mode,
        "disable_web_page_preview": True,
    }

    sent = False
    for chat_id in admin_chat_ids:
        try:
            payload = {**payload_template, "chat_id": chat_id}
            resp = requests.post(url, json=payload, proxies=proxies, timeout=10)
            if resp.status_code == 200:
                sent = True
        except Exception as e:
            logger.error(f"Failed to send Telegram notification to {chat_id}: {e}")
    return sent


def send_telegram_document(file_path: str, caption: str = "") -> bool:
    """Send a document/file attachment directly to all admins in Telegram."""
    token, admin_chat_ids, proxies = get_telegram_config()
    if not token or not admin_chat_ids:
        return False

    url = f"https://api.telegram.org/bot{token}/sendDocument"
    sent = False
    for chat_id in admin_chat_ids:
        try:
            with open(file_path, "rb") as f:
                files = {"document": f}
                data = {"chat_id": chat_id, "caption": caption}
                resp = requests.post(url, data=data, files=files, proxies=proxies, timeout=30)
                if resp.status_code == 200:
                    sent = True
        except Exception as e:
            logger.error(f"Failed to send Telegram document to {chat_id}: {e}")
    return sent


def _send_msg(token: str, chat_id: str, text: str, reply_markup=None):
    _, _, proxies = get_telegram_config()
    url = f"https://api.telegram.org/bot{token}/sendMessage"
    payload = {"chat_id": chat_id, "text": text, "parse_mode": "HTML"}
    if reply_markup:
        payload["reply_markup"] = reply_markup
    else:
        payload["reply_markup"] = MAIN_KEYBOARD

    try:
        requests.post(url, json=payload, proxies=proxies, timeout=10)
    except Exception as e:
        logger.error(f"Error in _send_msg: {e}")


def _answer_callback(token: str, callback_query_id: str, text: str = ""):
    """Answer the callback query to remove the loading spinner on the button."""
    _, _, proxies = get_telegram_config()
    url = f"https://api.telegram.org/bot{token}/answerCallbackQuery"
    try:
        requests.post(url, json={"callback_query_id": callback_query_id, "text": text}, proxies=proxies, timeout=5)
    except Exception as e:
        logger.error(f"Error in _answer_callback: {e}")


# ── Telegram Bot Command Handlers ──

def _calc_product_price(product) -> float:
    """Calculate product price dynamically using the cost calculator."""
    try:
        with Session(engine) as db:
            material = db.query(Material).filter(Material.id == product.material_id).first() if product.material_id else None
            machine = db.query(Machine).filter(Machine.id == product.machine_id).first() if product.machine_id else None
            settings = get_settings_dict(db)
            result = calculate_product_costs_from_dicts(product, material, machine, settings)
            return round(result.get("suggested_price", 0) or result.get("final_price", 0), 2)
    except Exception as e:
        logger.warning(f"Price calc failed for product {product.id}: {e}")
        return product.final_price or 0.0


def _handle_start(chat_id: str, token: str):
    msg = (
        "🤖 <b>ربات مدیریت اسپاگتی پرینت</b> 🎁\n\n"
        "به ربات مدیریت کارگاه خوش آمدید!\n"
        "از دکمه‌های زیر برای مدیریت سفارشات و محصولات استفاده کنید 👇\n\n"
        "📦 <b>افزودن محصول</b> — ایجاد محصول جدید با قیمت خودکار\n"
        "🛒 <b>ثبت سفارش</b> — ثبت سفارش با انتخاب محصول و قیمت خودکار\n"
        "📊 <b>آمار کارگاه</b> — خلاصه وضعیت فروش و سفارشات\n"
        "📋 <b>لیست سفارشات</b> — ۵ سفارش اخیر سیستم\n"
        "💾 <b>پشتیبان دیتابیس</b> — دریافت فایل .db امن از دیتابیس\n\n"
        "<i>یا از دستورات /addproduct /addorder /stats /orders /backup نیز می‌توانید استفاده کنید.</i>"
    )
    _send_msg(token, chat_id, msg, reply_markup=INLINE_MAIN_MENU)


def _handle_stats(chat_id: str, token: str):
    try:
        with Session(engine) as db:
            total_products = db.query(Product).filter(Product.is_active == True).count()
            total_orders = db.query(Order).filter(Order.is_active == True).count()
            new_orders = db.query(Order).filter(Order.is_active == True, Order.status == "new").count()
            printing_orders = db.query(Order).filter(Order.is_active == True, Order.status == "printing").count()

            msg = (
                "📊 <b>خلاصه آمار و وضعیت کارگاه</b>\n\n"
                f"▫️ <b>تعداد محصولات فعال:</b> {total_products}\n"
                f"▫️ <b>کل سفارشات:</b> {total_orders}\n"
                f"▫️ <b>سفارشات جدید:</b> {new_orders}\n"
                f"▫️ <b>در حال چاپ:</b> {printing_orders}\n"
            )
            _send_msg(token, chat_id, msg)
    except Exception as e:
        _send_msg(token, chat_id, f"❌ خطا در دریافت آمار: {str(e)}")


def _handle_orders_list(chat_id: str, token: str):
    try:
        with Session(engine) as db:
            orders = (
                db.query(Order)
                .filter(Order.is_active == True)
                .order_by(Order.id.desc())
                .limit(5)
                .all()
            )

            if not orders:
                _send_msg(token, chat_id, "📋 هیچ سفارشی یافت نشد.")
                return

            lines = ["📋 <b>۵ سفارش اخیر کارگاه:</b>\n"]
            for o in orders:
                status_fa = {"new": "جدید", "quoted": "قیمت‌داده‌شده", "printing": "در حال چاپ", "ready": "آماده", "delivered": "تحویل‌شده"}.get(o.status, o.status)
                lines.append(f"🆔 <b>سفارش #{o.id}</b> — {o.customer_name or 'مشتری نامشخص'}\nوضعیت: {status_fa} | مبلغ: {o.quoted_price:,.0f} تومان\n")

            _send_msg(token, chat_id, "\n".join(lines))
    except Exception as e:
        _send_msg(token, chat_id, f"❌ خطا در دریافت لیست سفارشات: {str(e)}")


def _handle_backup(chat_id: str, token: str):
    import sqlite3
    import tempfile
    from datetime import datetime, timezone

    _send_msg(token, chat_id, "⏳ در حال ساخت پشتیبان WAL-safe...")
    timestamp = datetime.now(timezone.utc).strftime("%Y%m%d_%H%M%S")
    temp_dir = tempfile.gettempdir()
    backup_file = os.path.join(temp_dir, f"3djat_backup_{timestamp}.db")

    try:
        src = sqlite3.connect(DB_PATH)
        dst = sqlite3.connect(backup_file)
        with dst:
            src.backup(dst)
        dst.close()
        src.close()

        send_telegram_document(backup_file, caption=f"💾 پشتیبان دیتابیس — {timestamp}")
        if os.path.exists(backup_file):
            os.remove(backup_file)
    except Exception as e:
        _send_msg(token, chat_id, f"❌ خطا در ساخت پشتیبان: {str(e)}")


# ── Interactive Conversation State Machine ──

def _handle_user_step(chat_id: str, text: str, token: str):
    state = USER_STATES.get(chat_id)
    if not state:
        return False

    action = state.get("action")

    # ── Add Product Wizard ──
    if action == "add_product":
        step = state.get("step")
        if step == "name":
            state["data"]["name"] = text.strip()
            state["step"] = "price"
            _send_msg(token, chat_id, f"✅ نام محصول: <b>{text.strip()}</b>\n\nلطفاً <b>قیمت پیشنهادی (تومان)</b> را وارد کنید:")
            return True

        elif step == "price":
            try:
                price = float(text.replace(",", "").strip())
                state["data"]["price"] = price

                with Session(engine) as db:
                    mats = db.query(Material).filter(Material.is_active == True).all()
                    mat_text = "\n".join([f"🔹 ID: {m.id} — {m.name} ({m.color or ''})" for m in mats])

                state["step"] = "material_id"
                _send_msg(token, chat_id, f"✅ قیمت: <b>{price:,.0f} تومان</b>\n\nلطفاً <b>شناسه (ID) فیلامنت</b> را وارد کنید:\n\n{mat_text}")
                return True
            except ValueError:
                _send_msg(token, chat_id, "❌ قیمت وارد شده معتبر نیست. لطفاً یک عدد وارد کنید:")
                return True

        elif step == "material_id":
            try:
                mat_id = int(text.strip())
                state["data"]["material_id"] = mat_id

                with Session(engine) as db:
                    machs = db.query(Machine).filter(Machine.is_active == True).all()
                    mach_text = "\n".join([f"🖨 ID: {m.id} — {m.name}" for m in machs])

                state["step"] = "machine_id"
                _send_msg(token, chat_id, f"✅ فیلامنت ثبت شد.\n\nلطفاً <b>شناسه (ID) پرینتر</b> را وارد کنید:\n\n{mach_text}")
                return True
            except ValueError:
                _send_msg(token, chat_id, "❌ شناسه معتبر نیست. عدد وارد کنید:")
                return True

        elif step == "machine_id":
            try:
                mach_id = int(text.strip())
                state["data"]["machine_id"] = mach_id

                # Create Product in DB
                p_data = state["data"]
                with Session(engine) as db:
                    new_prod = Product(
                        name=p_data["name"],
                        final_price=p_data["price"],
                        material_id=p_data["material_id"],
                        machine_id=mach_id,
                        weight_g=100.0,
                        print_time_hours=2.0,
                        is_active=True,
                    )
                    db.add(new_prod)
                    db.commit()
                    db.refresh(new_prod)
                    p_id = new_prod.id

                USER_STATES.pop(chat_id, None)
                _send_msg(token, chat_id, f"🎉 <b>محصول با موفقیت ایجاد شد!</b>\n\n🆔 کد محصول: #{p_id}\nنام: {p_data['name']}\nقیمت: {p_data['price']:,.0f} تومان")
                return True
            except Exception as e:
                USER_STATES.pop(chat_id, None)
                _send_msg(token, chat_id, f"❌ خطا در ثبت محصول: {str(e)}")
                return True

    # ── Add Order Wizard (Multi-Item) ──
    if action == "add_order":
        step = state.get("step")

        # Step 1: Customer name
        if step == "customer_name":
            state["data"]["customer_name"] = text.strip()
            state["step"] = "contact"
            _send_msg(token, chat_id, f"✅ نام مشتری: <b>{text.strip()}</b>\n\nلطفاً <b>شماره تماس</b> را وارد کنید (یا '-' رد شوید):")
            return True

        # Step 2: Contact / phone
        elif step == "contact":
            state["data"]["contact"] = text.strip() if text.strip() != "-" else ""
            state["step"] = "add_item"
            state["data"]["items"] = []
            _show_product_list_and_ask(chat_id, token)
            return True

        # Step 3: Product ID for current item
        elif step == "add_item":
            user_input = text.strip()
            if user_input.isdigit() and int(user_input) > 0:
                p_id = int(user_input)
                with Session(engine) as db:
                    p = db.query(Product).filter(Product.id == p_id, Product.is_active == True).first()
                    if p:
                        unit_price = _calc_product_price(p)
                        state["data"]["current_item"] = {
                            "product_id": p.id,
                            "product_label": p.name,
                            "unit_price": unit_price,
                        }
                        state["step"] = "item_qty"
                        _send_msg(
                            token, chat_id,
                            f"✅ محصول: <b>{p.name}</b>\n"
                            f"💰 قیمت واحد: <b>{unit_price:,.0f} تومان</b>\n\n"
                            f"لطفاً <b>تعداد</b> را وارد کنید (پیش‌فرض: 1):"
                        )
                        return True

            # Custom order (no product)
            state["data"]["current_item"] = {
                "product_id": None,
                "product_label": user_input if user_input != "0" else "سفارش سفارشی",
                "unit_price": 0,
            }
            state["step"] = "custom_price"
            _send_msg(token, chat_id, f"✅ عنوان: <b>{state['data']['current_item']['product_label']}</b>\n\nلطفاً <b>مبلغ این آیتم (تومان)</b> را وارد کنید:")
            return True

        # Step 3b: Custom price for non-catalog item
        elif step == "custom_price":
            try:
                price = float(text.replace(",", "").strip())
                state["data"]["current_item"]["unit_price"] = price
                state["data"]["current_item"]["qty"] = 1
                state["data"]["items"].append(state["data"]["current_item"])
                state["data"]["current_item"] = None
                state["step"] = "another_item"
                _send_msg(
                    token, chat_id,
                    f"✅ آیتم ثبت شد: <b>{state['data']['items'][-1]['product_label']}</b> — {price:,.0f} تومان\n\n"
                    f"📦 تعداد آیتم‌های ثبت شده: <b>{len(state['data']['items'])}</b>\n\n"
                    f"آیا آیتم دیگری اضافه می‌کنید؟",
                    reply_markup={
                        "inline_keyboard": [
                            [
                                {"text": "➕ بله، آیتم بعدی", "callback_data": "add_next_item"},
                                {"text": "✅ خیر، ثبت نهایی", "callback_data": "finish_items"}
                            ]
                        ]
                    }
                )
                return True
            except ValueError:
                _send_msg(token, chat_id, "❌ مبلغ معتبر نیست. لطفاً یک عدد وارد کنید:")
                return True

        # Step 4: Item quantity
        elif step == "item_qty":
            try:
                qty = int(text.strip()) if text.strip().isdigit() else 1
                item = state["data"]["current_item"]
                item["qty"] = qty
                item_total = item["unit_price"] * qty
                state["data"]["items"].append(item)
                state["data"]["current_item"] = None
                state["step"] = "another_item"
                _send_msg(
                    token, chat_id,
                    f"✅ آیتم ثبت شد: <b>{item['product_label']}</b>\n"
                    f"   تعداد: {qty} × {item['unit_price']:,.0f} = <b>{item_total:,.0f} تومان</b>\n\n"
                    f"📦 تعداد آیتم‌های ثبت شده: <b>{len(state['data']['items'])}</b>\n\n"
                    f"آیا آیتم دیگری اضافه می‌کنید؟",
                    reply_markup={
                        "inline_keyboard": [
                            [
                                {"text": "➕ بله، آیتم بعدی", "callback_data": "add_next_item"},
                                {"text": "✅ خیر، ثبت نهایی", "callback_data": "finish_items"}
                            ]
                        ]
                    }
                )
                return True
            except ValueError:
                _send_msg(token, chat_id, "❌ تعداد معتبر نیست. عدد وارد کنید:")
                return True

        # Step 5: Another item? (handled by inline callback, but also accept text)
        elif step == "another_item":
            if text.strip() in ("➕ بله، آیتم بعدی", "add_next_item"):
                state["step"] = "add_item"
                _show_product_list_and_ask(chat_id, token)
                return True
            elif text.strip() in ("✅ خیر، ثبت نهایی", "finish_items"):
                state["step"] = "started_at"
                _send_msg(
                    token, chat_id,
                    "📅 <b>تاریخ شروع کار</b>\n\n"
                    "لطفاً تاریخ شروع (مثال: 1404/05/01) را وارد کنید\n"
                    "<i>(یا '-' رد شوید)</i>:"
                )
                return True
            else:
                # Treat as "no, finish"
                state["step"] = "started_at"
                _send_msg(
                    token, chat_id,
                    "📅 <b>تاریخ شروع کار</b>\n\n"
                    "لطفاً تاریخ شروع (مثال: 1404/05/01) را وارد کنید\n"
                    "<i>(یا '-' رد شوید)</i>:"
                )
                return True

        # Step 6: Start date
        elif step == "started_at":
            state["data"]["started_at"] = text.strip() if text.strip() != "-" else None
            state["step"] = "ready_by"
            _send_msg(
                token, chat_id,
                "📅 <b>تاریخ تحویل (آماده ارسال)</b>\n\n"
                "لطفاً تاریخ تحویل (مثال: 1404/05/15) را وارد کنید\n"
                "<i>(یا '-' رد شوید)</i>:"
            )
            return True

        # Step 7: Ready-by date → CREATE ORDER
        elif step == "ready_by":
            state["data"]["ready_by"] = text.strip() if text.strip() != "-" else None
            try:
                o_data = state["data"]
                items = o_data.get("items", [])

                # Calculate total from items
                total_price = sum(i["unit_price"] * i["qty"] for i in items)
                total_qty = sum(i["qty"] for i in items)

                # Convert date strings to date objects if provided
                started_at = None
                ready_by = None
                if o_data.get("started_at"):
                    try:
                        from datetime import datetime
                        parts = o_data["started_at"].replace("/", "-").split("-")
                        started_at = datetime(int(parts[0]), int(parts[1]), int(parts[2])).date()
                    except Exception:
                        started_at = None
                if o_data.get("ready_by"):
                    try:
                        from datetime import datetime
                        parts = o_data["ready_by"].replace("/", "-").split("-")
                        ready_by = datetime(int(parts[0]), int(parts[1]), int(parts[2])).date()
                    except Exception:
                        ready_by = None

                with Session(engine) as db:
                    new_order = Order(
                        customer_name=o_data["customer_name"],
                        contact=o_data.get("contact", ""),
                        product_label=items[0]["product_label"] if len(items) == 1 else f"{len(items)} آیتم",
                        product_id=items[0]["product_id"] if len(items) == 1 else None,
                        qty=total_qty,
                        quoted_price=total_price,
                        paid_amount=0.0,
                        status="new",
                        notes="",
                        started_at=started_at,
                        ready_by=ready_by,
                        is_active=True,
                    )
                    db.add(new_order)
                    db.flush()

                    # Add individual OrderItems
                    for item in items:
                        oi = OrderItem(
                            order_id=new_order.id,
                            product_id=item.get("product_id"),
                            product_label=item["product_label"],
                            qty=item["qty"],
                            unit_price=item["unit_price"],
                            unit_cost=None,
                        )
                        db.add(oi)

                    db.commit()
                    db.refresh(new_order)
                    o_id = new_order.id

                # Build summary
                items_summary = "\n".join(
                    [f"  📦 {i['product_label']} — {i['qty']}× {i['unit_price']:,.0f} = <b>{i['unit_price']*i['qty']:,.0f}</b>" for i in items]
                )

                USER_STATES.pop(chat_id, None)
                _send_msg(
                    token, chat_id,
                    f"🎉 <b>سفارش با موفقیت ثبت شد!</b>\n\n"
                    f"🆔 <b>کد سفارش:</b> #{o_id}\n"
                    f"👤 <b>مشتری:</b> {o_data['customer_name']}\n"
                    f"📞 <b>تماس:</b> {o_data.get('contact', '-')}\n\n"
                    f"📝 <b>آیتم‌ها:</b>\n{items_summary}\n\n"
                    f"💰 <b>جمع کل:</b> {total_price:,.0f} تومان\n"
                    f"📅 <b>شروع:</b> {o_data.get('started_at') or '—'}\n"
                    f"📅 <b>تحویل:</b> {o_data.get('ready_by') or '—'}\n"
                    f"📍 <b>وضعیت:</b> جدید"
                )
                return True
            except Exception as e:
                USER_STATES.pop(chat_id, None)
                _send_msg(token, chat_id, f"❌ خطا در ثبت سفارش: {str(e)}")
                return True

    return False


def _show_product_list_and_ask(chat_id: str, token: str):
    """Show available products with prices and ask for product ID."""
    with Session(engine) as db:
        prods = db.query(Product).filter(Product.is_active == True).limit(10).all()
        if prods:
            prod_lines = ["📦 <b>محصولات موجود در سایت:</b>\n"]
            for p in prods:
                price = _calc_product_price(p)
                price_str = f"{price:,.0f}" if price > 0 else "—"
                prod_lines.append(f"🔹 <b>ID {p.id}</b> — {p.name}  ({price_str} تومان)")
            prod_text = "\n".join(prod_lines)
        else:
            prod_text = "هیچ محصولی در سایت یافت نشد."

    # Count existing items
    state = USER_STATES.get(chat_id, {})
    items_count = len(state.get("data", {}).get("items", []))
    count_text = f"\n📦 آیتم‌های ثبت شده: <b>{items_count}</b>\n" if items_count > 0 else ""

    msg = (
        f"{count_text}\n"
        f"{prod_text}\n\n"
        f"لطفاً <b>کد محصول (ID)</b> را وارد کنید\n"
        f"<i>(یا 0 برای سفارش سفارشی)</i>:"
    )
    _send_msg(token, chat_id, msg)


def _handle_callback_query(chat_id: str, cb_data: str, cb_query_id: str, token: str):
    """Handle inline button callback queries."""
    _answer_callback(token, cb_query_id)

    if cb_data == "cmd_addproduct":
        USER_STATES[chat_id] = {"action": "add_product", "step": "name", "data": {}}
        _send_msg(token, chat_id, "📦 <b>افزودن محصول جدید</b>\n\nلطفاً <b>نام محصول</b> را ارسال کنید:")
    elif cb_data == "cmd_addorder":
        USER_STATES[chat_id] = {"action": "add_order", "step": "customer_name", "data": {}}
        _send_msg(token, chat_id, "🛒 <b>ثبت سفارش جدید</b>\n\nلطفاً <b>نام مشتری</b> را ارسال کنید:")
    elif cb_data == "cmd_stats":
        _handle_stats(chat_id, token)
    elif cb_data == "cmd_orders":
        _handle_orders_list(chat_id, token)
    elif cb_data == "cmd_backup":
        _handle_backup(chat_id, token)
    elif cb_data == "add_next_item":
        state = USER_STATES.get(chat_id)
        if state and state.get("action") == "add_order":
            state["step"] = "add_item"
            _show_product_list_and_ask(chat_id, token)
    elif cb_data == "finish_items":
        state = USER_STATES.get(chat_id)
        if state and state.get("action") == "add_order":
            state["step"] = "started_at"
            _send_msg(
                token, chat_id,
                "📅 <b>تاریخ شروع کار</b>\n\n"
                "لطفاً تاریخ شروع (مثال: 1404/05/01) را وارد کنید\n"
                "<i>(یا '-' رد شوید)</i>:"
            )


def _poll_telegram_updates():
    """Background polling loop for Telegram updates."""
    offset = 0
    while True:
        token, admin_chat_ids, proxies = get_telegram_config()
        if not token:
            time.sleep(10)
            continue

        try:
            url = f"https://api.telegram.org/bot{token}/getUpdates?offset={offset}&timeout=20"
            resp = requests.get(url, proxies=proxies, timeout=25)
            if resp.status_code == 200:
                data = resp.json()
                for update in data.get("result", []):
                    offset = update["update_id"] + 1

                    # ── Handle inline button callback queries ──
                    callback = update.get("callback_query")
                    if callback:
                        cb_chat = callback.get("message", {}).get("chat", {})
                        cb_chat_id = str(cb_chat.get("id"))
                        cb_data = callback.get("data", "")
                        cb_query_id = callback.get("id", "")

                        if admin_chat_ids and cb_chat_id not in admin_chat_ids:
                            _answer_callback(token, cb_query_id, "⛔ دسترسی غیرمجاز")
                            continue

                        _handle_callback_query(cb_chat_id, cb_data, cb_query_id, token)
                        continue

                    # ── Handle normal messages ──
                    msg = update.get("message", {})
                    chat = msg.get("chat", {})
                    chat_id = str(chat.get("id"))
                    text = msg.get("text", "").strip()

                    # Only allow admin chat_ids
                    if admin_chat_ids and chat_id not in admin_chat_ids:
                        _send_msg(token, chat_id, "⛔ شما دسترسی به این ربات مدیریت را ندارید.")
                        continue

                    if not text:
                        continue

                    # Handle interactive multi-step wizards
                    if _handle_user_step(chat_id, text, token):
                        continue

                    # Command Dispatcher (slash commands AND keyboard buttons)
                    if text in ("/start", "/help", "🏠 خانه"):
                        _handle_start(chat_id, token)
                    elif text in ("/stats", "📊 آمار کارگاه"):
                        _handle_stats(chat_id, token)
                    elif text in ("/orders", "📋 لیست سفارشات"):
                        _handle_orders_list(chat_id, token)
                    elif text in ("/backup", "💾 دریافت پشتیبان"):
                        _handle_backup(chat_id, token)
                    elif text in ("/addproduct", "📦 افزودن محصول"):
                        USER_STATES[chat_id] = {"action": "add_product", "step": "name", "data": {}}
                        _send_msg(token, chat_id, "📦 <b>افزودن محصول جدید</b>\n\nلطفاً <b>نام محصول</b> را ارسال کنید:")
                    elif text in ("/addorder", "🛒 ثبت سفارش"):
                        USER_STATES[chat_id] = {"action": "add_order", "step": "customer_name", "data": {}}
                        _send_msg(token, chat_id, "🛒 <b>ثبت سفارش جدید</b>\n\nلطفاً <b>نام مشتری</b> را ارسال کنید:")
                    else:
                        _send_msg(token, chat_id, "دستور ناشناخته است. از منوی زیر استفاده کنید 👇")
        except Exception as e:
            logger.error(f"Error in Telegram poll loop: {e}")
            time.sleep(5)


def start_telegram_bot_thread():
    """Start background daemon thread for Telegram bot polling."""
    t = threading.Thread(target=_poll_telegram_updates, daemon=True)
    t.start()
    logger.info("Telegram bot polling thread started.")
