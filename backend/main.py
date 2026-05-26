from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from config.database import engine
from routes.auth import router as auth_router



app = FastAPI(
    title="Customer Management API",
    version="1.0.0"
)

app.include_router(auth_router)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
def root():
    return {"status": "ok"}

@app.get("/health")
def health():
    return {"message": "healthy"}