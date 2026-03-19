from fastapi import HTTPException, status
from sqlalchemy.orm import Session
from datetime import datetime
from models.transactional import Transaction
from models.invoice import Invoice
from schemas.transaction_schema import TransactionCreate, TransactionResponse, TransactionUpdate


def create_transaction(db: Session, transaction_data: TransactionCreate, store_id: int = None):
    try:
        product_sum = sum(p.total for p in transaction_data.products) if transaction_data.products else 0
        if abs(transaction_data.grandTotal - product_sum) > 0.01:
            raise HTTPException(
                status_code=400,
                detail=f"grandTotal must equal sum of product totals (got {transaction_data.grandTotal}, sum={product_sum})",
            )
        if abs((transaction_data.paidAmount + transaction_data.dueAmount) - transaction_data.grandTotal) > 0.01:
            raise HTTPException(
                status_code=400,
                detail="paidAmount + dueAmount must equal grandTotal",
            )
        db_transaction = Transaction(
            customer_id=transaction_data.customerId,
            customer_name=transaction_data.customerName,
            store_id=store_id,
            products=[p.dict() for p in transaction_data.products] if transaction_data.products else [],
            paid_amount=transaction_data.paidAmount,
            due_amount=transaction_data.dueAmount,
            grand_total=transaction_data.grandTotal,
            date=transaction_data.date,
            bill_type=getattr(transaction_data, "billType", None) or None,
            bill_photo_url=getattr(transaction_data, "billPhotoUrl", None) or None,
        )
        db.add(db_transaction)
        db.commit()
        db.refresh(db_transaction)
        invoice = Invoice(transaction_id=db_transaction.id)
        db.add(invoice)
        db.commit()
        return db_transaction
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))


def get_transactions(db: Session, customer_id: int = None, store_id: int = None, skip: int = 0, limit: int = 50):
    try:
        query = db.query(Transaction)
        if store_id is not None:
            query = query.filter(Transaction.store_id == store_id)
        if customer_id:
            query = query.filter(Transaction.customer_id == customer_id)
        transactions = query.offset(skip).limit(limit).all()

        response = []
        for txn in transactions:
            products = [
                {
                    "productName": p["productName"],
                    "metalType": p["metalType"],
                    "weight": p["weight"],
                    "rate": p["rate"],
                    "makingCharge": p["makingCharge"],
                    "diamondCharge": p["diamondCharge"],
                    "gstPercent": p["gstPercent"],
                    "metalValue": p["metalValue"],
                    "gstAmount": p["gstAmount"],
                    "total": p["total"],
                }
                for p in txn.products
            ]
            response.append(TransactionResponse(
                id=txn.id,
                customerId=txn.customer_id,
                customerName=txn.customer_name,
                products=products,
                paidAmount=txn.paid_amount,
                dueAmount=txn.due_amount,
                grandTotal=txn.grand_total,
                date=txn.date,
                billType=txn.bill_type,
                billPhotoUrl=txn.bill_photo_url,
            ))
        return response
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


def update_transaction(db: Session, transaction_id: int, transaction_data: TransactionUpdate):
    try:
        db_transaction = (
            db.query(Transaction)
            .filter(Transaction.id == transaction_id)
            .with_for_update()
            .first()
        )
        if not db_transaction:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Transaction not found")
        if db_transaction.customer_id != transaction_data.customerId:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized to update this transaction")
        if transaction_data.paidAmount < 0:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Paid amount cannot be negative")
        if transaction_data.paidAmount > transaction_data.grandTotal:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Paid amount exceeds grand total")
        if not transaction_data.products:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="At least one product is required")
        for product in transaction_data.products:
            if product.weight <= 0 or product.rate <= 0:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Product weight and rate must be positive",
                )

        db_transaction.customer_name = transaction_data.customerName
        db_transaction.products = [p.dict() for p in transaction_data.products]
        db_transaction.paid_amount = transaction_data.paidAmount
        db_transaction.due_amount = transaction_data.grandTotal - transaction_data.paidAmount
        db_transaction.grand_total = transaction_data.grandTotal
        db_transaction.date = transaction_data.date

        db.commit()
        db.refresh(db_transaction)
        return db_transaction
    except HTTPException:
        db.rollback()
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Database error: {str(e)}")
