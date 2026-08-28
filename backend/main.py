import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from routes.admin import router as admin_router
from routes.candidate import router as candidate_router
from routes.candidate_interview import router as candidate_interview_router
from routes.candidate_evaluation import router as candidate_evaluation_router
from routes.internal_evaluation import router as internal_evaluation_router
from database import admins_collection, admin_collection, client, init_db_indexes
from utils.auth import hash_password

app = FastAPI(title="Admin Panel API")

os.makedirs("uploads", exist_ok=True)
app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:8000",
        "http://127.0.0.1:8000"
    ],
    allow_origin_regex=r"^https?://(localhost|127\.0\.0\.1)(:[0-9]+)?$",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(admin_router, prefix="/admin")
app.include_router(admin_router, prefix="/api/v1/admin")  # versioned alias

app.include_router(candidate_router, prefix="/candidate")
app.include_router(candidate_router, prefix="/api/v1/candidate")  # versioned alias

app.include_router(candidate_interview_router, prefix="/candidate")
app.include_router(candidate_interview_router, prefix="/api/v1/candidate")  # versioned alias

app.include_router(candidate_evaluation_router, prefix="/candidate")
app.include_router(candidate_evaluation_router, prefix="/api/v1/candidate")  # versioned alias

app.include_router(internal_evaluation_router, prefix="/internal")

DEFAULT_ADMINS = [
    {
        "name": "System Admin",
        "email": "admin@mockai.com",
        "default_password": "admin123",
        "role": "admin",
    },
    {
        "name": "Asjad Abbas",
        "email": "asjadabbaszaidi@gmail.com",
        "default_password": "admin123",
        "role": "admin",
    },
    {
        "name": "Hassan Kazmi",
        "email": "hassankazmi2004@gmail.com",
        "default_password": "admin",
        "role": "admin",
    },
]

def ensure_default_admins():
    """
    Idempotently ensure standard admin accounts exist in admins_collection.
    - Creates missing admin accounts.
    - Leaves existing admin accounts and passwords completely unchanged.
    - Never downgrades an admin.
    - Never touches users_collection or deletes data.
    """
    from datetime import datetime
    for adm in DEFAULT_ADMINS:
        normalized_email = adm["email"].strip().lower()
        existing = admins_collection.find_one({"email": normalized_email})
        if not existing:
            new_doc = {
                "name": adm["name"],
                "email": normalized_email,
                "password": hash_password(adm["default_password"]),
                "role": adm["role"],
                "created_at": datetime.utcnow(),
            }
            admins_collection.insert_one(new_doc)
            print(f"Startup check: Created admin account '{normalized_email}'")
        else:
            if existing.get("role") != "admin":
                admins_collection.update_one(
                    {"_id": existing["_id"]},
                    {"$set": {"role": "admin"}}
                )
            print(f"Startup check: Standard admin '{normalized_email}' verified.")

@app.on_event("startup")
async def startup_event():
    """
    Verify database connectivity on startup, ensure standard admins exist,
    initialize database indexes, and initialize default categories & questions if empty.
    """
    # 1. Ensure standard admin accounts exist (Highest Priority)
    try:
        ensure_default_admins()
    except Exception as admin_err:
        print(f"Startup Admin Seeding Error: {admin_err}")

    # 2. Verify database connectivity & initialize indexes/questions
    try:
        client.admin.command('ping')
        # Create database indexes for maximum query performance
        init_db_indexes()

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
