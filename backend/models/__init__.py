# Import all models so Base.metadata knows every table (for create_all).
# Order matters for relationship resolution.
from models.customer import Customer
from models.store import Store
from models.user_model import User
from models.customer_invite import CustomerInvite
from models.transactional import Transaction
from models.inventory_piece import InventoryPiece
from models.transaction_line import TransactionLine
from models.invoice import Invoice
from models.payment import Payment
from models.audit_log import AuditLog
from models.rates_config import MetalRate
from models.password_reset_token import PasswordResetToken
from models.girvi_loan import GirviLoan, GirviPhoto, GirviInterestPayment
from models.metal_exchange import MetalExchange
from models.order_repair import Order
from models.stock_item import StockItem, StockMovement
from models.idempotency import PaymentIdempotency

__all__ = [
    "Customer",
    "Store",
    "User",
    "CustomerInvite",
    "Transaction",
    "InventoryPiece",
    "TransactionLine",
    "Invoice",
    "Payment",
    "AuditLog",
    "MetalRate",
    "PasswordResetToken",
    "GirviLoan",
    "GirviPhoto",
    "GirviInterestPayment",
    "MetalExchange",
    "Order",
    "StockItem",
    "StockMovement",
    "PaymentIdempotency",
]
