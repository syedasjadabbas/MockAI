import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from routes.admin import router as admin_router

app = FastAPI(title="Admin Panel API")

os.makedirs("uploads", exist_ok=True)
app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(admin_router, prefix="/admin")
app.include_router(admin_router, prefix="/api/v1/admin")  # versioned alias

@app.get("/")
async def root():
    return {"message": "Admin Panel Backend is running"}

@app.get("/health")
async def health_check():
    from database import admins_collection
    try:
        admins_collection.find_one({}, {"_id": 1})
        db_status = "ok"
    except Exception:
        db_status = "error"
    return {
        "status": "ok" if db_status == "ok" else "degraded",
        "database": db_status,
        "version": "1.0.0"
    }
