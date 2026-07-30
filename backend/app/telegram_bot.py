import os
import json
import time
import logging
import threading
import requests
from sqlalchemy.orm import Session

from app.database import engine, DB_PATH
from app.models import Product, Order, Settings, Material, Machine, Category

logger = logging.getLogger(__name__)

# State storage for interactive multi-step conversations (e.g. /addproduct, /addorder)
USER_STATES = {}


def get_telegram_config():
    """Retrieve bot token, admin chat ID, and proxy from Settings table or environment."""
    token = os.getenv("TELEGRAM_BOT_TOKEN", "")
    chat_id = os.getenv("TELEGRAM_ADMIN_CHAT_ID", "130945736")
    proxy = os.getenv("TELEGRAM_PROXY", "socks5h://192.168.100.33:10808")

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

    return token, chat_id, proxies_dict


def send_telegram_notification(text: str, parse_mode: str = "HTML") -> bool:
    """Send an instant text message alert to the admin's Telegram chat ID."""
    token, chat_id, proxies = get_telegram_config()
    if not token or not chat_id:
        return False

    url = f"https://api.telegram.org/bot{token}/sendMessage"
    payload = {
        "chat_id": chat_id,
        "text": text,
        "parse_mode": parse_mode,
        "disable_web_page_preview": True,
    }

    try:
        resp = requests.post(url, json=payload, proxies=proxies, timeout=10)
        return resp.status_code == 200
    except Exception as e:
        logger.error(f"Failed to send Telegram notification: {e}")
        return False


def send_telegram_document(file_path: str, caption: str = "") -> bool:
    """Send a document/file attachment directly to the admin in Telegram."""
    token, chat_id, proxies = get_telegram_config()
    if not token or not chat_id:
        return False

    url = f"https://api.telegram.org/bot{token}/sendDocument"
    try:
        with open(file_path, "rb") as f:
            files = {"document": f}
            data = {"chat_id": chat_id, "caption": caption}
            resp = requests.post(url, data=data, files=files, proxies=proxies, timeout=30)
            return resp.status_code == 200
    except Exception as e:
        logger.error(f"Failed to send Telegram document: {e}")
        return False


def _send_msg(token: str, chat_id: str, text: str):
    _, _, proxies = get_telegram_config()
    url = f"https://api.telegram.org/bot{token}/sendMessage"
    try:
        requests.post(url, json={"chat_id": chat_id, "text": text, "parse_mode": "HTML"}, proxies=proxies, timeout=10)
    except Exception as e:
        logger.error(f"Error in _send_msg: {e}")


# ── Telegram Bot Command Handlers ──

def _handle_start(chat_id: str, token: str):
    msg = (
        "🤖 <b>ربات مدیریت اسپاگتی پرینت</b>\n\n"
        "به ربات مدیریت کارگاه خوش آمدید! شما می‌توانید از دستورات زیر استفاده کنید:\n\n"
        "📦 /addproduct — افزودن محصول جدید به سایت\n"
        "🛒 /addorder — ثبت سفارش جدید در سیستم\n"
        "📊 /stats — آمار و گزارش فروش کارگاه\n"
        "📋 /orders — مشاهده سفارش‌های فعال\n"
        "💾 /backup — دریافت پشتیبان کامل دیتابیس\n"
        "❓ /help — راهنمای استفاده از ربات"
    )
    _send_msg(token, chat_id, msg)


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
                f"▫️ <b>سفارشات جدید (جدید):</b> {new_orders}\n"
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

    # --- Add Product Wizard ---
    if action == "add_product":
        step = state.get("step")
        if step == "name":
            state["data"]["name"] = text.strip()
            state["step"] = "price"
            _send_msg(token, chat_id, f"✅ نام محصول: <b>{text.strip()}</b>\n\nلطفاً قیمت پیشنهادی (به تومان) را وارد کنید:")
            return True

        elif step == "price":
            try:
                price = float(text.replace(",", "").strip())
                state["data"]["price"] = price
                
                with Session(engine) as db:
                    mats = db.query(Material).filter(Material.is_active == True).all()
                    mat_text = "\n".join([f"🔹 ID: {m.id} — {m.name} ({m.color or ''})" for m in mats])
                
                state["step"] = "material_id"
                _send_msg(token, chat_id, f"✅ قیمت: <b>{price:,.0f} تومان</b>\n\nلطفاً شناسه (ID) فیلامنت را وارد کنید:\n\n{mat_text}")
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
                _send_msg(token, chat_id, f"✅ فیلامنت ثبت شد.\n\nلطفاً شناسه (ID) پرینتر را وارد کنید:\n\n{mach_text}")
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
                        suggested_price=p_data["price"],
                        material_id=p_data["material_id"],
                        machine_id=mach_id,
                        weight_grams=100.0,
                        print_hours=2.0,
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

    # --- Add Order Wizard ---
    if action == "add_order":
        step = state.get("step")
        if step == "customer_name":
            state["data"]["customer_name"] = text.strip()
            state["step"] = "quoted_price"
            _send_msg(token, chat_id, f"✅ نام مشتری: <b>{text.strip()}</b>\n\nلطفاً مبلغ کل فاکتور (تومان) را وارد کنید:")
            return True

        elif step == "quoted_price":
            try:
                price = float(text.replace(",", "").strip())
                state["data"]["quoted_price"] = price

                # Create Order in DB
                o_data = state["data"]
                with Session(engine) as db:
                    new_order = Order(
                        customer_name=o_data["customer_name"],
                        quoted_price=price,
                        paid_amount=0.0,
                        status="new",
                        is_active=True,
                    )
                    db.add(new_order)
                    db.commit()
                    db.refresh(new_order)
                    o_id = new_order.id

                USER_STATES.pop(chat_id, None)
                _send_msg(token, chat_id, f"🎉 <b>سفارش جدید با موفقیت ثبت شد!</b>\n\n🆔 کد سفارش: #{o_id}\nمشتری: {o_data['customer_name']}\nمبلغ: {price:,.0f} تومان\nوضعیت: جدید")
                return True
            except Exception as e:
                USER_STATES.pop(chat_id, None)
                _send_msg(token, chat_id, f"❌ خطا در ثبت سفارش: {str(e)}")
                return True

    return False


def _poll_telegram_updates():
    """Background polling loop for Telegram updates."""
    offset = 0
    while True:
        token, admin_chat_id, proxies = get_telegram_config()
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
                    msg = update.get("message", {})
                    chat = msg.get("chat", {})
                    chat_id = str(chat.get("id"))
                    text = msg.get("text", "").strip()

                    # Only allow admin chat_id
                    if admin_chat_id and str(chat_id) != str(admin_chat_id):
                        _send_msg(token, chat_id, "⛔ شما دسترسی به این ربات مدیریت را ندارید.")
                        continue

                    if not text:
                        continue

                    # Handle interactive multi-step wizards
                    if _handle_user_step(chat_id, text, token):
                        continue

                    # Command Dispatcher
                    if text in ("/start", "/help"):
                        _handle_start(chat_id, token)
                    elif text == "/stats":
                        _handle_stats(chat_id, token)
                    elif text == "/orders":
                        _handle_orders_list(chat_id, token)
                    elif text == "/backup":
                        _handle_backup(chat_id, token)
                    elif text == "/addproduct":
                        USER_STATES[chat_id] = {"action": "add_product", "step": "name", "data": {}}
                        _send_msg(token, chat_id, "📦 <b>افزودن محصول جدید</b>\n\nلطفاً **نام محصول** را ارسال کنید:")
                    elif text == "/addorder":
                        USER_STATES[chat_id] = {"action": "add_order", "step": "customer_name", "data": {}}
                        _send_msg(token, chat_id, "🛒 <b>ثبت سفارش جدید</b>\n\nلطفاً **نام مشتری** را ارسال کنید:")
                    else:
                        _send_msg(token, chat_id, "دستور ناشناخته است. از /start برای مشاهده لیست دستورات استفاده کنید.")
        except Exception as e:
            logger.error(f"Error in Telegram poll loop: {e}")
            time.sleep(5)


def start_telegram_bot_thread():
    """Start background daemon thread for Telegram bot polling."""
    t = threading.Thread(target=_poll_telegram_updates, daemon=True)
    t.start()
    logger.info("Telegram bot polling thread started.")
