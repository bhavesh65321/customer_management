# Import all models so Base.metadata knows every table (for create_all).
# Order matters for relationship resolution — referenced tables must come first.
from models.plan import Plan, StoreSubscription   # MON-01 — must be before Store
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
from models.karigar import Karigar
from models.workflow_template import WorkflowTemplate, WorkflowTemplateStep
from models.order_repair import Order
from models.order_step import OrderStep
from models.stock_item import StockItem, StockMovement
from models.idempotency import PaymentIdempotency
from models.piece_lifecycle import PieceLifecycleEvent
from models.push_token import PushToken
from models.loyalty import LoyaltyConfig, LoyaltyLedger  # FEAT-05
from models.otp_token import OtpToken                     # 2FA

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
    "Karigar",
    "WorkflowTemplate",
    "WorkflowTemplateStep",
    "Order",
    "OrderStep",
    "StockItem",
    "StockMovement",
    "PaymentIdempotency",
    "PieceLifecycleEvent",
    "PushToken",
]
