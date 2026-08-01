import os
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker, DeclarativeBase

# Database path: app/data/ inside container
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA_DIR = os.path.join(BASE_DIR, 'data')
os.makedirs(DATA_DIR, exist_ok=True)

DB_PATH = os.path.join(DATA_DIR, '3djat.db')
SQLALCHEMY_DATABASE_URL = f"sqlite:///{DB_PATH}"

engine = create_engine(
    SQLALCHEMY_DATABASE_URL,
    connect_args={"check_same_thread": False},
)

import logging

logger = logging.getLogger(__name__)


# Enable WAL mode for better concurrent reads + writes.
# Tolerate permission errors (e.g. mounted volume owned by a different
# user) so the app still boots — WAL is an optimization, not a hard
# requirement.
def _enable_wal():
    try:
        with engine.connect() as conn:
            conn.execute(text("PRAGMA journal_mode=WAL"))
            conn.execute(text("PRAGMA synchronous=NORMAL"))
            conn.execute(text("PRAGMA foreign_keys=ON"))
    except Exception as exc:
        logger.warning("Could not enable SQLite WAL mode: %s", exc)

_enable_wal()


def _migrate_orders():
    """Add new columns to orders table if they don't exist (SQLite-safe)."""
    try:
        with engine.connect() as conn:
            # Check existing columns
            cols = {row[1] for row in conn.execute(text("PRAGMA table_info(orders)"))}
            if "qty" not in cols:
                conn.execute(text("ALTER TABLE orders ADD COLUMN qty INTEGER NOT NULL DEFAULT 1"))
                logger.info("Added orders.qty column")
            if "unit_cost" not in cols:
                conn.execute(text("ALTER TABLE orders ADD COLUMN unit_cost FLOAT"))
                logger.info("Added orders.unit_cost column")
            if "delivered_at" not in cols:
                conn.execute(text("ALTER TABLE orders ADD COLUMN delivered_at DATETIME"))
                logger.info("Added orders.delivered_at column")
            # Add index on customer_name if missing
            indexes = {row[1] for row in conn.execute(text("PRAGMA index_list(orders)"))}
            if "ix_orders_customer_name" not in indexes:
                conn.execute(text("CREATE INDEX IF NOT EXISTS ix_orders_customer_name ON orders (customer_name)"))
                logger.info("Added ix_orders_customer_name index")
    except Exception as exc:
        logger.warning("Order migration skipped: %s", exc)

_migrate_orders()


SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


class Base(DeclarativeBase):
    pass


def get_db():
    """FastAPI dependency to get a database session."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
