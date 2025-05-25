from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from routes.auth import router as auth_router
from routes.customer import router as customer_router  # ✅ THIS ONE
from config.database import Base, engine
from fastapi.responses import JSONResponse
from fastapi.requests import Request
from routes.transactional_route import router as transaction_routes

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
app.include_router(customer_router, prefix="/api/customer", tags=["Customers"])
app.include_router(transaction_routes, prefix="/api/transactions", tags= ["Transactions"])

