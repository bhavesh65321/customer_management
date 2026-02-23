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

import models  # noqa: F401 - register all model tables before create_all

# Create DB tables
Base.metadata.create_all(bind=engine)

app = FastAPI()

# Enable CORS for frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
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
app.include_router(customer_portal_router)

