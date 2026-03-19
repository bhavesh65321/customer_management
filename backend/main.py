from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from routes.auth import router as auth_router
from routes.customer import router as customer_router
from config.database import Base, engine
from fastapi.responses import JSONResponse
from fastapi.requests import Request
from routes.transactional_route import router as transaction_routes
from routes.stores import router as stores_router
from routes.metal_rates import router as metal_rates_router
from routes.inventory import router as inventory_router
from routes.customer_portal import router as customer_portal_router
from routes.admin import router as admin_router
from routes.analytics import router as analytics_router
from routes.workers import router as workers_router
from routes.payments import router as payments_router
from routes.reminders import router as reminders_router
from routes.girvi import router as girvi_router
from routes.metal_exchange import router as metal_exchange_router
from routes.orders import router as orders_router
from routes.stock import router as stock_router

import models  # noqa: F401 - register all model tables before create_all

# Create DB tables
Base.metadata.create_all(bind=engine)

app = FastAPI()

# Enable CORS for frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://127.0.0.1:3000", "http://localhost:3000"],  # Allow frontend URLs
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.options("/{rest_of_path:path}")
async def preflight_handler(request: Request, rest_of_path: str = ""):
    return JSONResponse(content={"message": "Preflight OK"}, status_code=200)


@app.get("/")
def read_root():
    return {"message": "Server is running"}

# Register routes
app.include_router(auth_router, prefix="/api/auth")
app.include_router(customer_router, prefix="/api/customer")
app.include_router(transaction_routes, prefix="/api/transactions")
app.include_router(stores_router, prefix="/api/stores")
app.include_router(metal_rates_router, prefix="/api/metal-rates")
app.include_router(inventory_router, prefix="/api/inventory")
app.include_router(admin_router, prefix="/api/admin")
app.include_router(analytics_router, prefix="/api/analytics")
app.include_router(workers_router, prefix="/api/workers")
app.include_router(payments_router, prefix="/api/payments")
app.include_router(reminders_router, prefix="/api/reminders")
app.include_router(girvi_router, prefix="/api/girvi")
app.include_router(metal_exchange_router, prefix="/api/metal-exchange")
app.include_router(orders_router, prefix="/api/orders")
app.include_router(stock_router, prefix="/api/stock")
app.include_router(customer_portal_router)

