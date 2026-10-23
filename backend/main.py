import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from routes.admin import router as admin_router
from routes.candidate import router as candidate_router
from routes.candidate_interview import router as candidate_interview_router
from routes.candidate_mentors import router as candidate_mentors_router
from routes.candidate_evaluation import router as candidate_evaluation_router
from routes.internal_evaluation import router as internal_evaluation_router
from routes.candidate_survey import router as candidate_survey_router
from routes.candidate_goal import router as candidate_goal_router
from database import admins_collection, admin_collection, client, init_db_indexes, MONGO_TARGET
from utils.auth import hash_password

app = FastAPI(title="Admin Panel API")

os.makedirs("uploads", exist_ok=True)
app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")

cors_origins = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://192.168.19.35:5173",
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "http://localhost:8000",
    "http://127.0.0.1:8000"
]
extra_origins = os.getenv("ALLOWED_ORIGINS", "")
if extra_origins:
    for orig in extra_origins.split(","):
        orig_clean = orig.strip().rstrip("/")
        if orig_clean and orig_clean not in cors_origins:
            cors_origins.append(orig_clean)

frontend_url = os.getenv("FRONTEND_URL", "").strip().rstrip("/")
if frontend_url and frontend_url not in cors_origins:
    cors_origins.append(frontend_url)

app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins,
    # Local / LAN development hosts only. Deployed frontends must be listed
    # explicitly via ALLOWED_ORIGINS / FRONTEND_URL - a wildcard such as
    # *.onrender.com would let any site hosted there make credentialed calls.
    allow_origin_regex=r"^https?://(localhost|127\.0\.0\.1|192\.168\.\d+\.\d+|10\.\d+\.\d+\.\d+|172\.(1[6-9]|2\d|3[0-1])\.\d+\.\d+)(:[0-9]+)?$",
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

app.include_router(candidate_mentors_router, prefix="/candidate")
app.include_router(candidate_mentors_router, prefix="/api/v1/candidate")  # versioned alias

app.include_router(candidate_goal_router, prefix="/candidate")
app.include_router(candidate_goal_router, prefix="/api/v1/candidate")  # versioned alias

app.include_router(candidate_survey_router, prefix="/candidate")
app.include_router(candidate_survey_router, prefix="/api/v1/candidate")  # versioned alias

app.include_router(internal_evaluation_router, prefix="/internal")

# Standard admin accounts are bootstrapped from utils/admin_bootstrap.py -
# no passwords live in source code (see ADMIN_BOOTSTRAP_PASSWORD).
from utils.admin_bootstrap import ensure_default_admins

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

        # Ensure default technical mentors exist for candidate mentorship
        try:
            from seed_mentors import ensure_default_mentors
            ensure_default_mentors(force_refresh=False)
        except Exception as mentor_seed_err:
            print(f"Mentor auto-seed notice: {mentor_seed_err}")

    except Exception as e:
        print(f"Startup database check notice: {e}")

    # 3. Pre-warm NLP semantic model once at application startup to eliminate per-request latency
    try:
        from services.nlp_analyzer import BertSemanticAnalyzer
        model = BertSemanticAnalyzer().get_model()
        if model is not None:
            print("Startup check: NLP semantic model pre-warmed successfully.")
        else:
            print("Startup check: NLP semantic model unavailable (fallback active).")
    except Exception as nlp_warm_err:
        print(f"NLP model pre-warm notice: {nlp_warm_err}")

    # 4. Pre-build the goal chatbot's category profiles (FR07) so the first
    #    candidate message isn't slowed down.
    try:
        from routes.candidate_goal import _category_profiles, _profile_similarities
        from services.nlp_analyzer import BertSemanticAnalyzer
        profiles = _category_profiles()
        if BertSemanticAnalyzer().get_model() is not None:
            _profile_similarities("warm-up", profiles, BertSemanticAnalyzer())
        print(f"Startup check: goal chatbot ready ({len(profiles)} categories).")
    except Exception as goal_warm_err:
        print(f"Goal chatbot warm-up notice: {goal_warm_err}")

    # 5. Report AI profile: load DeepFace now rather than on the first evaluation.
    try:
        from services.ai_profile import get_profile, is_report_profile
        print(f"Startup check: AI profile = {get_profile()} | database = {MONGO_TARGET}")
        if is_report_profile():
            from services.facial_analyzer import FacialAnalyzer
            print(f"Startup check: facial pipeline = {FacialAnalyzer().pipeline_label}")
    except Exception as face_warm_err:
        print(f"Facial model warm-up notice: {face_warm_err}")

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
        "database_target": MONGO_TARGET,
        "version": "1.0.0"
    }
