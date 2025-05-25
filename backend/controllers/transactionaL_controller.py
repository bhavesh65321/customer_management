from fastapi import HTTPException, Depends, status
from sqlalchemy.orm import Session
from datetime import datetime
from config.database import get_db
from models.transactional import Transaction
from schemas.transaction_schema import TransactionCreate, TransactionResponse, TransactionUpdate

def create_transaction(db: Session, transaction_data: TransactionCreate):
    try:
        db_transaction = Transaction(
            customer_id=transaction_data.customerId,
            customer_name=transaction_data.customerName,
            products=[product.dict() for product in transaction_data.products],
            paid_amount=transaction_data.paidAmount,
            due_amount=transaction_data.dueAmount,
            grand_total=transaction_data.grandTotal,
            date=transaction_data.date
        )
        db.add(db_transaction)
        db.commit()
        db.refresh(db_transaction)
        return db_transaction
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    

def get_transactions(db: Session, customer_id: int = None, skip: int = 0, limit: int = 50):
    try:
        query = db.query(Transaction)
        
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
                products=products,  # ✅ FIXED
                paidAmount=txn.paid_amount,
                dueAmount=txn.due_amount,
                grandTotal=txn.grand_total,
                date=txn.date
            ))
        
        return response
        
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))
    

def update_transaction(db: Session, transaction_id: str, transaction_data: TransactionUpdate):
    try:
        # 1. Fetch existing transaction with lock to prevent concurrent updates
        db_transaction = db.query(Transaction).filter(
            Transaction.id == transaction_id
        ).with_for_update().first()
        
        if not db_transaction:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Transaction not found"
            )
        
        # 2. Validate ownership
        if db_transaction.customer_id != transaction_data.customerId:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Not authorized to update this transaction"
            )
        
        # 3. Validate payment amounts
        if transaction_data.paidAmount < 0:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Paid amount cannot be negative"
            )
            
        if transaction_data.paidAmount > transaction_data.grandTotal:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Paid amount exceeds grand total"
            )
        
        # 4. Validate products
        if not transaction_data.products:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="At least one product is required"
            )
            
        for product in transaction_data.products:
            if product.weight <= 0 or product.rate <= 0:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Product weight and rate must be positive"
                )
        
        # 5. Update transaction fields
        update_fields = {
           'customer_name': transaction_data.customerName,
            'products': [product.dict() for product in transaction_data.products],
            'paid_amount': transaction_data.paidAmount,
            'due_amount': transaction_data.grandTotal - transaction_data.paidAmount,
            'grand_total': transaction_data.grandTotal,
            'date': transaction_data.date,
            'updated_at': datetime.utcnow()
        }
        print(update_fields)
        
        for field, value in update_fields.items():
            setattr(db_transaction, field, value)
        
        # 6. Commit changes
        db.commit()
        db.refresh(db_transaction)
        
        # 7. Return updated transaction
        return db_transaction
        
    except HTTPException:
        db.rollback()
        raise
        
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Database error: {str(e)}"
        )