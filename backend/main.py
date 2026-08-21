import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from routes.admin import router as admin_router
from database import admins_collection, admin_collection, client
from utils.auth import hash_password

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

@app.on_event("startup")
async def startup_event():
    """
    Verify database connectivity on startup, ensure default admin exists,
    and initialize default categories & questions if empty.
    """
    try:
        client.admin.command('ping')
        # Check if default admin exists
        admin = admin_collection.find_one({"email": "admin@mockai.com"})
        if not admin:
            admin_collection.insert_one({
                "email": "admin@mockai.com",
                "password": hash_password("admin123"),
                "role": "admin",
                "name": "System Admin"
            })
            print("Initialized default admin: admin@mockai.com")
        else:
            print(f"Startup check: admin@mockai.com found in database.")

        # Ensure question bank default categories and questions
        try:
            from seed_question_bank import seed_question_bank
            seed_question_bank(force=False)
        except Exception as seed_err:
            print(f"Question bank auto-seed notice: {seed_err}")
    except Exception as e:
        print(f"Startup database check notice: {e}")

@app.get("/")
async def root():
    return {"message": "Admin Panel Backend is running"}

@app.get("/health")
async def health_check():
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
