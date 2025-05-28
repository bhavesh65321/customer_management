from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from config.database import get_db
from controllers.transactionaL_controller import create_transaction, get_transactions, update_transaction
from schemas.transaction_schema import TransactionCreate, TransactionResponse, TransactionUpdate
from typing import List

router = APIRouter(tags=["Transactions"])

@router.post("/add")
def save_transaction(transaction: TransactionCreate, db: Session = Depends(get_db)):
    db_transaction = create_transaction(db, transaction)
    return {"message": "Transaction saved successfully", "transactionId": db_transaction.id}


# GET endpoint to fetch all transactions
@router.get("/{customer_id}", response_model=List[TransactionResponse])
def get_transaction(customer_id: int, db: Session = Depends(get_db)):
   db_transaction = get_transactions(db, customer_id = customer_id)
   return db_transaction


@router.put("/{transaction_id}")
def update_transactions(
    transaction_id: int,
    transaction: TransactionUpdate,
    db: Session = Depends(get_db)
):
    return update_transaction(db, transaction_id, transaction)


# @router.put("/transactions/{transaction_id}/fullypaid")
# def mark_fully_paid(transaction_id: int, db: Session = Depends(get_db)):
#     transaction = db.query(Transaction).filter(Transaction.id == transaction_id).first()
#     if not transaction:
#         raise HTTPException(status_code=404, detail="Transaction not found")
    
#     transaction.due_amount = 0
#     transaction.status = "paid"  # Assuming your model has a 'status' field
#     db.commit()
#     db.refresh(transaction)
#     return transaction  