"""
Lightweight repository for Product CRUD and search.
Centralizes DB access logic for products in one place.
"""
from sqlalchemy.orm import Session
from sqlalchemy import or_

from app.models import Product


class ProductRepository:
    def __init__(self, db: Session):
        self.db = db

    def get_all(self, active_only: bool = True) -> list[Product]:
        q = self.db.query(Product)
        if active_only:
            q = q.filter(Product.is_active == True)
        return q.all()

    def get_by_id(self, product_id: int) -> Product | None:
        return self.db.query(Product).filter(Product.id == product_id).first()

    def create(self, data: dict) -> Product:
        product = Product(**data)
        self.db.add(product)
        self.db.commit()
        self.db.refresh(product)
        return product

    def update(self, product_id: int, data: dict) -> Product:
        product = self.get_by_id(product_id)
        if not product:
            return None
        for field, value in data.items():
            setattr(product, field, value)
        self.db.commit()
        self.db.refresh(product)
        return product

    def delete(self, product_id: int) -> bool:
        product = self.get_by_id(product_id)
        if not product:
            return False
        product.is_active = False
        self.db.commit()
        return True

    def search(self, query: str) -> list[Product]:
        pattern = f"%{query}%"
        return (
            self.db.query(Product)
            .filter(
                Product.is_active == True,
                or_(
                    Product.name.ilike(pattern),
                    Product.product_id.ilike(pattern),
                    Product.category.ilike(pattern),
                    Product.notes.ilike(pattern),
                ),
            )
            .all()
        )
