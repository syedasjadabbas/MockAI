from fastapi import APIRouter, HTTPException, status, Depends, Request
from pydantic import BaseModel
from bson import ObjectId
from database import (
    users_collection,
    interviews_collection,
    serialize_mongo,
    admin_logs_collection,
    admins_collection,
    otps_collection,
    categories_collection,
    questions_collection,
    get_cached,
    set_cached,
    invalidate_cache
)
from utils.auth import verify_password, create_access_token, hash_password
from middleware.admin_auth import verify_admin
from datetime import datetime

from collections import defaultdict
import time

router = APIRouter()

# Simple in-memory rate limiter for login
_login_attempts: dict = defaultdict(list)
RATE_LIMIT_WINDOW = 60   # seconds
RATE_LIMIT_MAX    = 10   # attempts per window

def check_login_rate_limit(ip: str):
    now = time.time()
    attempts = [t for t in _login_attempts[ip] if now - t < RATE_LIMIT_WINDOW]
    _login_attempts[ip] = attempts
    if len(attempts) >= RATE_LIMIT_MAX:
        raise HTTPException(status_code=429, detail="Too many login attempts. Please wait and try again.")
    _login_attempts[ip].append(now)

def log_action(action: str, admin_email: str, target: str = "System", severity: str = "info"):
    admin_logs_collection.insert_one({
        "action": action,
        "admin_email": admin_email,
        "target": target,
        "severity": severity,
        "created_at": datetime.utcnow()
    })

class LoginRequest(BaseModel):
    email: str
    password: str

class ChangePasswordRequest(BaseModel):
    old_password: str
    new_password: str

@router.post("/login")
def admin_login(login_data: LoginRequest, request: Request):
    check_login_rate_limit(request.client.host if request.client else "unknown")
    normalized_email = login_data.email.strip().lower()

    # 1. Find user in admins_collection using email
    user = admins_collection.find_one({"email": normalized_email})
    
    # 2. If user not found -> return 401
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, 
            detail="Invalid email or password"
        )
        
    if user.get("role") != "admin":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, 
            detail="Invalid email or password"
        )
        
    # 4. Verify password
    stored_password = user.get("password") or user.get("password_hash", "")
    if not verify_password(login_data.password, stored_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, 
            detail="Invalid email or password"
        )
        
    # 5. Create JWT
    token_payload = {
        "user_id": str(user["_id"]),
        "role": user.get("role")
    }
    access_token = create_access_token(token_payload)
    
    # 6. Response
    log_action("LOGIN", normalized_email, normalized_email)
    return {
        "access_token": access_token,
        "token_type": "bearer"
    }

@router.put("/change-password")
def change_admin_password(
    data: ChangePasswordRequest, 
    token_payload: dict = Depends(verify_admin)
):
    user_id = token_payload.get("user_id")
    
    # Fetch user from db
    user = admins_collection.find_one({"_id": ObjectId(user_id)})
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, 
            detail="User not found"
        )
        
    # Verify old password
    if not verify_password(data.old_password, user.get("password", "")):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, 
            detail="Incorrect old password"
        )
        
    # Hash new password and update
    hashed_new_pw = hash_password(data.new_password)
    admins_collection.update_one(
        {"_id": ObjectId(user_id)},
        {"$set": {"password": hashed_new_pw}}
    )
    
    log_action("UPDATE", user.get("email", "Unknown"), "Admin Password")
    return {"message": "Password updated successfully"}

from fastapi import File, UploadFile
import uuid

@router.get("/me")
def get_admin_profile(token_payload: dict = Depends(verify_admin)):
    admin_user = admins_collection.find_one({"_id": ObjectId(token_payload.get("user_id"))})
    if not admin_user:
        raise HTTPException(status_code=404, detail="Admin not found")
    return {
        "name": admin_user.get("name", "Admin User"),
        "email": admin_user.get("email"),
        "role": admin_user.get("role", "admin"),
        "profile_picture": admin_user.get("profile_picture")
    }

class UpdateNameRequest(BaseModel):
    name: str

@router.patch("/update-name")
def update_admin_name(data: UpdateNameRequest, token_payload: dict = Depends(verify_admin)):
    if not data.name or not data.name.strip():
        raise HTTPException(status_code=400, detail="Name cannot be empty")
    admin_id = token_payload.get("user_id")
    admins_collection.update_one(
        {"_id": ObjectId(admin_id)},
        {"$set": {"name": data.name.strip()}}
    )
    admin = admins_collection.find_one({"_id": ObjectId(admin_id)})
    log_action("UPDATE", admin.get("email", "Unknown"), "Admin Name", severity="info")
    return {"message": "Name updated successfully", "name": data.name.strip()}

@router.post("/profile-picture")
async def upload_profile_picture(file: UploadFile = File(...), token_payload: dict = Depends(verify_admin)):
    if file.content_type not in ["image/jpeg", "image/png"]:
        raise HTTPException(status_code=400, detail="Only JPG and PNG files are allowed")
    
    content = await file.read()
    if len(content) > 2 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="File size exceeds 2MB limit")
        
    ext = file.filename.split(".")[-1]
    filename = f"{uuid.uuid4()}.{ext}"
    filepath = f"uploads/{filename}"
    
    with open(filepath, "wb") as f:
        f.write(content)
        
    admin_id = token_payload.get("user_id")
    file_url = f"/uploads/{filename}"
    admins_collection.update_one(
        {"_id": ObjectId(admin_id)},
        {"$set": {"profile_picture": file_url}}
    )
    
    admin_email = admins_collection.find_one({"_id": ObjectId(admin_id)}).get("email")
    log_action("UPDATE", admin_email, "Profile Picture")
    return {"message": "Profile picture updated", "url": file_url}

class ForgotPasswordRequest(BaseModel):
    email: str

from utils.email import send_email

@router.post("/forgot-password")
def forgot_password(data: ForgotPasswordRequest):
    user = admins_collection.find_one({"email": data.email})
    if not user:
        raise HTTPException(status_code=404, detail="Email not found")
        
    temp_password = ''.join(random.choices(string.ascii_letters + string.digits, k=8))
    hashed_pw = hash_password(temp_password)
    
    admins_collection.update_one(
        {"_id": user["_id"]},
        {"$set": {"password": hashed_pw}}
    )
    
    html_body = f"""
    <html>
      <body style="font-family: 'Inter', Arial, sans-serif; background-color: #080a10; padding: 40px 20px; margin: 0;">
        <div style="max-width: 500px; margin: 0 auto; background-color: #0f1624; border: 1px solid rgba(255, 255, 255, 0.05); padding: 30px; border-radius: 16px; box-shadow: 0 10px 30px -10px rgba(0, 0, 0, 0.5);">
          <h2 style="color: #ffffff; margin-top: 0; font-size: 24px; font-weight: 700;">MockAI Password Reset</h2>
          <p style="color: #94a3b8; font-size: 15px; line-height: 1.5;">Hello Admin,</p>
          <p style="color: #94a3b8; font-size: 15px; line-height: 1.5;">Your temporary password for the MockAI Admin Portal is:</p>
          
          <div style="background: rgba(99, 102, 241, 0.1); border: 1px solid rgba(99, 102, 241, 0.2); padding: 16px; text-align: center; border-radius: 8px; margin: 24px 0;">
            <span style="font-family: monospace; font-size: 22px; font-weight: bold; color: #818cf8; letter-spacing: 2px;">
              {temp_password}
            </span>
          </div>
          
          <p style="color: #ef4444; font-size: 14px; margin-bottom: 0;">
            <strong>⚠️ Security Warning:</strong> Please change your password immediately after logging in.
          </p>
        </div>
        <div style="text-align: center; margin-top: 20px; color: #475569; font-size: 12px;">
          &copy; 2026 MockAI System. All rights reserved.
        </div>
      </body>
    </html>
    """
    send_email(to_email=data.email, subject="MockAI Admin - Password Reset", html_content=html_body, sender_display_name="MockAI Admin")
    
    log_action("UPDATE", user.get("email"), "Forgot Password Reset")
    return {"message": "Password reset email sent"}

@router.get("/")
def get_admin_dashboard(token_payload: dict = Depends(verify_admin)):
    cached = get_cached("dashboard_stats")
    if cached:
        return cached

    total_users = users_collection.count_documents({"role": {"$ne": "admin"}})
    total_interviews = interviews_collection.count_documents({})
    
    # Single facet query to compute averages, score ranges, and status buckets in one pass
    pipeline = [
        {
            "$facet": {
                "averages": [
                    {
                        "$group": {
                            "_id": None,
                            "avg_score": {"$avg": "$score"},
                            "avg_confidence": {"$avg": "$confidence"},
                            "avg_stress": {"$avg": "$stress"}
                        }
                    }
                ],
                "score_groups": [
                    {
                        "$group": {
                            "_id": {
                                "$cond": [
                                    {"$eq": ["$score", None]}, "none",
                                    {"$cond": [
                                        {"$gte": ["$score", 80]}, "high",
                                        {"$cond": [{"$gte": ["$score", 60]}, "medium", "low"]}
                                    ]}
                                ]
                            },
                            "count": {"$sum": 1}
                        }
                    }
                ],
                "status_groups": [
                    {
                        "$group": {
                            "_id": "$status",
                            "count": {"$sum": 1}
                        }
                    }
                ],
                "high_stress_completed": [
                    {
                        "$match": {
                            "status": "Completed",
                            "stress": "High"
                        }
                    },
                    {"$count": "count"}
                ],
                "total_completed": [
                    {
                        "$match": {
                            "status": "Completed"
                        }
                    },
                    {"$count": "count"}
                ]
            }
        }
    ]
    
    aggr_res = list(interviews_collection.aggregate(pipeline))
    res = aggr_res[0] if aggr_res else {}
    
    averages = res.get("averages", [{}])
    avg_data = averages[0] if averages else {}
    average_score = round(avg_data.get("avg_score") or 0, 1)
    average_confidence = round(avg_data.get("avg_confidence") or 0, 1)
    average_stress = round(avg_data.get("avg_stress") or 0, 1)
    
    score_buckets = {"high": 0, "medium": 0, "low": 0, "none": 0}
    for item in res.get("score_groups", []):
        s_id = item.get("_id")
        if s_id in score_buckets:
            score_buckets[s_id] = item.get("count", 0)
            
    status_buckets = {"completed": 0, "progress": 0, "pending": 0}
    for item in res.get("status_groups", []):
        status_name = str(item.get("_id", "")).lower()
        if "completed" in status_name:
            status_buckets["completed"] = item.get("count", 0)
        elif "progress" in status_name or "in progress" in status_name:
            status_buckets["progress"] = item.get("count", 0)
        elif "pending" in status_name:
            status_buckets["pending"] = item.get("count", 0)
            
    high_stress_count = res.get("high_stress_completed", [{}])
    high_stress_val = high_stress_count[0].get("count", 0) if high_stress_count else 0
    
    completed_count = res.get("total_completed", [{}])
    completed_val = completed_count[0].get("count", 0) if completed_count else 0
    
    insights = []
    if completed_val == 0:
        insights.append("No completed interviews recorded yet.")
    else:
        if average_score < 60:
            insights.append("Average performance score is below 60%. Candidates require improvement.")
        if high_stress_val > completed_val * 0.4:
            insights.append("High stress levels recorded across multiple interview sessions.")
            
    if status_buckets["pending"] > status_buckets["completed"]:
        insights.append("Pending interviews exceed completed evaluations.")
        
    if not insights:
        insights.append("Overall candidate evaluation metrics are stable.")
        
    insights = insights[:3]
    
    result = {
        "total_users": total_users,
        "total_interviews": total_interviews,
        "average_score": average_score,
        "average_confidence": average_confidence,
        "average_stress": average_stress,
        "score_buckets": score_buckets,
        "status_buckets": status_buckets,
        "insights": insights
    }
    set_cached("dashboard_stats", result, ttl_seconds=15)
    return result

@router.get("/users")
def get_users(token_payload: dict = Depends(verify_admin)):
    cached = get_cached("users_list")
    if cached:
        return cached

    users = list(users_collection.find({"role": {"$ne": "admin"}}, {"password": 0}).sort("created_at", -1))
    
    # 1 single aggregation to get interview counts for all users simultaneously
    pipeline = [
        {"$group": {"_id": "$user_id", "count": {"$sum": 1}}}
    ]
    counts_map = {str(item["_id"]): item["count"] for item in interviews_collection.aggregate(pipeline) if item.get("_id")}
    
    # Attach precomputed counts in memory
    for user in users:
        user["interview_count"] = counts_map.get(str(user["_id"]), 0)
        
    result = [serialize_mongo(user) for user in users]
    set_cached("users_list", result, ttl_seconds=10)
    return result

class CreateUserRequest(BaseModel):
    name: str
    email: str

def validate_required(fields: dict):
    for key, value in fields.items():
        if not value or (isinstance(value, str) and not value.strip()):
            raise HTTPException(status_code=400, detail=f"{key} is required")

def validate_email(email: str):
    import re
    if not re.match(r"[^@]+@[^@]+\.[^@]+", email):
        raise HTTPException(status_code=400, detail="Invalid email format")

def check_duplicate_email(email: str, exclude_user_id: str = None):
    user_query = {"email": email}
    if exclude_user_id:
        user_query["_id"] = {"$ne": ObjectId(exclude_user_id)}
    if users_collection.find_one(user_query) or admins_collection.find_one({"email": email}):
        raise HTTPException(status_code=400, detail="Email already exists")

@router.post("/users")
def create_user(user_data: CreateUserRequest, token_payload: dict = Depends(verify_admin)):
    validate_required({"name": user_data.name, "email": user_data.email})
    validate_email(user_data.email)
    check_duplicate_email(user_data.email)

    new_user = {
        "name": user_data.name,
        "email": user_data.email,
        "password": hash_password("password123"),
        "role": "user",
        "created_at": datetime.utcnow()
    }
    result = users_collection.insert_one(new_user)
    invalidate_cache("dashboard_stats")
    invalidate_cache("users_list")
    
    admin_user = admins_collection.find_one({"_id": ObjectId(token_payload.get("user_id"))})
    admin_email = admin_user.get("email") if admin_user else "Unknown Admin"
    log_action("CREATE_USER", admin_email, f"Created User: {user_data.name}")
    
    created_user = users_collection.find_one({"_id": result.inserted_id})
    created_user.pop("password", None)
    created_user["interview_count"] = 0
    return serialize_mongo(created_user)

class UpdateUserRequest(BaseModel):
    name: str
    email: str

@router.put("/users/{id}")
def update_user(id: str, user_data: UpdateUserRequest, token_payload: dict = Depends(verify_admin)):
    raise HTTPException(status_code=403, detail="Modifying users is not allowed in this phase")

@router.delete("/users/{id}")
def delete_user(id: str, token_payload: dict = Depends(verify_admin)):
    raise HTTPException(status_code=403, detail="Deleting users is not allowed in this phase")

# Lightweight projection for list views (omits heavy transcript)
INTERVIEW_LIST_PROJECTION = {
    "user_id": 1,
    "role": 1,
    "status": 1,
    "score": 1,
    "confidence": 1,
    "stress": 1,
    "created_at": 1
}

# Full projection for single interview detail modal
INTERVIEW_DETAIL_PROJECTION = {
    "user_id": 1,
    "role": 1,
    "category_id": 1,
    "type": 1,
    "status": 1,
    "evaluation_status": 1,
    "score": 1,
    "confidence": 1,
    "stress": 1,
    "transcript": 1,
    "questions": 1,
    "responses": 1,
    "evaluation": 1,
    "created_at": 1,
    "completed_at": 1,
}

def attach_candidate_names(interviews: list) -> list:
    """
    Batch fetch user candidate names in a single $in query
    to eliminate N+1 sequential database roundtrips.
    """
    if not interviews:
        return interviews

    user_ids = []
    for item in interviews:
        uid = item.get("user_id")
        if uid and ObjectId.is_valid(str(uid)):
            user_ids.append(ObjectId(str(uid)))

    users_map = {}
    if user_ids:
        for u in users_collection.find({"_id": {"$in": user_ids}}, {"name": 1}):
            users_map[str(u["_id"])] = u.get("name", "Deleted User")

    for item in interviews:
        uid = str(item.get("user_id", ""))
        item["candidate_name"] = users_map.get(uid, "Deleted User")

    return interviews

from typing import Optional

@router.get("/results")
def get_completed_results(token_payload: dict = Depends(verify_admin)):
    query = {"status": "Completed"}
    interviews = list(interviews_collection.find(query, INTERVIEW_LIST_PROJECTION).sort("created_at", -1))
    attach_candidate_names(interviews)
    return [serialize_mongo(interview) for interview in interviews]

@router.get("/interviews")
def get_interviews(
    role: Optional[str] = None, 
    status_filter: Optional[str] = None, 
    date: Optional[str] = None, 
    limit: Optional[int] = None,
    token_payload: dict = Depends(verify_admin)
):
    query = {}
    if role and role != 'All':
        query["role"] = role
    if status_filter and status_filter != 'All':
        query["status"] = status_filter
        
    if limit:
        interviews = list(interviews_collection.find(query, INTERVIEW_LIST_PROJECTION).sort("created_at", -1).limit(limit))
    else:
        interviews = list(interviews_collection.find(query, INTERVIEW_LIST_PROJECTION).sort("created_at", -1))
        
    attach_candidate_names(interviews)
            
    # Filter by date exactly if provided (matching YYYY-MM-DD prefix)
    if date:
        interviews = [i for i in interviews if i.get("created_at") and i["created_at"].strftime('%Y-%m-%d') == date]
            
    return [serialize_mongo(interview) for interview in interviews]

@router.get("/interviews/{id}")
def get_interview(id: str, token_payload: dict = Depends(verify_admin)):
    try:
        obj_id = ObjectId(id)
    except Exception:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid interview ID")
        
    interview = interviews_collection.find_one({"_id": obj_id}, INTERVIEW_DETAIL_PROJECTION)
    if not interview:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Interview not found")
        
    attach_candidate_names([interview])
    return serialize_mongo(interview)

class UpdateInterviewRequest(BaseModel):
    status: str
    role: str

import random

@router.patch("/interviews/{id}")
def update_interview(id: str, data: UpdateInterviewRequest, token_payload: dict = Depends(verify_admin)):
    raise HTTPException(status_code=403, detail="Modifying interviews is not allowed in this phase")

@router.delete("/interviews/{id}")
def delete_interview(id: str, token_payload: dict = Depends(verify_admin)):
    raise HTTPException(status_code=403, detail="Deleting interviews is not allowed in this phase")

@router.get("/logs")
def get_logs(token_payload: dict = Depends(verify_admin)):
    logs = list(admin_logs_collection.find({}).sort("created_at", -1).limit(50))
    if not logs:
        # Provide dummy logs if empty
        dummy_logs = [
            {"action": "LOGIN", "admin_email": "admin@mockai.com", "target": "admin@mockai.com", "created_at": "2023-10-27T10:00:00Z"},
            {"action": "UPDATE", "admin_email": "admin@mockai.com", "target": "Admin Password", "created_at": "2023-10-26T15:30:00Z"},
            {"action": "DELETE_USER", "admin_email": "admin@mockai.com", "target": "John Doe", "created_at": "2023-10-25T09:15:00Z"},
            {"action": "DELETE_INTERVIEW", "admin_email": "admin@mockai.com", "target": "INT-123456", "created_at": "2023-10-24T14:20:00Z"}
        ]
        return [serialize_mongo(log) for log in dummy_logs]
        
    return [serialize_mongo(log) for log in logs]

import re

class SendOtpRequest(BaseModel):
    name: str
    email: str

@router.post("/create/send-otp")
def send_create_admin_otp(data: SendOtpRequest, token_payload: dict = Depends(verify_admin)):
    validate_required({"name": data.name, "email": data.email})
    validate_email(data.email)
    check_duplicate_email(data.email)
        
    otp = ''.join(random.choices(string.digits, k=6))
    
    otps_collection.update_one(
        {"email": data.email},
        {"$set": {"otp": otp, "created_at": datetime.utcnow()}},
        upsert=True
    )
    
    html_body = f"""
    <html>
      <body style="font-family: 'Inter', Arial, sans-serif; background-color: #080a10; padding: 40px 20px; margin: 0;">
        <div style="max-width: 500px; margin: 0 auto; background-color: #0f1624; border: 1px solid rgba(255, 255, 255, 0.05); padding: 30px; border-radius: 16px; box-shadow: 0 10px 30px -10px rgba(0, 0, 0, 0.5);">
          <h2 style="color: #ffffff; margin-top: 0; font-size: 24px; font-weight: 700;">Admin Verification</h2>
          <p style="color: #94a3b8; font-size: 15px; line-height: 1.5;">Hello {data.name},</p>
          <p style="color: #94a3b8; font-size: 15px; line-height: 1.5;">You are being added as an Admin to MockAI. Your verification code is:</p>
          
          <div style="background: rgba(99, 102, 241, 0.1); border: 1px solid rgba(99, 102, 241, 0.2); padding: 16px; text-align: center; border-radius: 8px; margin: 24px 0;">
            <span style="font-family: monospace; font-size: 28px; font-weight: bold; color: #818cf8; letter-spacing: 4px;">
              {otp}
            </span>
          </div>
        </div>
      </body>
    </html>
    """
    send_email(to_email=data.email, subject="MockAI Admin - Verify Email", html_content=html_body, sender_display_name="MockAI Admin")
        
    return {"message": "OTP sent successfully"}

class CreateAdminRequest(BaseModel):
    name: str
    email: str
    password: str
    otp: str

@router.post("/create")
def create_admin(data: CreateAdminRequest, token_payload: dict = Depends(verify_admin)):
    validate_required({"name": data.name, "email": data.email, "password": data.password, "otp": data.otp})
    validate_email(data.email)
    check_duplicate_email(data.email)
        
    otp_record = otps_collection.find_one({"email": data.email, "otp": data.otp})
    if not otp_record:
        raise HTTPException(status_code=400, detail="Invalid or expired OTP")
        
    new_admin = {
        "name": data.name,
        "email": data.email,
        "password": hash_password(data.password),
        "role": "admin",
        "created_at": datetime.utcnow(),
        "is_verified": True
    }
    
    admins_collection.insert_one(new_admin)
    otps_collection.delete_one({"email": data.email})
    
    admin_user = admins_collection.find_one({"_id": ObjectId(token_payload.get("user_id"))})
    admin_email = admin_user.get("email") if admin_user else "Unknown Admin"
    log_action("CREATE_ADMIN", admin_email, data.email)
    
    return {"message": "Admin created successfully"}

@router.get("/all-admins")
def get_all_admins(token_payload: dict = Depends(verify_admin)):
    admins = list(admins_collection.find({}, {"password": 0}))
    return [
        {
            "name": admin.get("name", "Unknown Admin"),
            "email": admin.get("email"),
            "role": admin.get("role", "admin")
        }
        for admin in admins
    ]

# ----------------------------------------------------
# QUESTION BANK & INTERVIEW CATEGORY MANAGEMENT
# ----------------------------------------------------

class CreateCategoryRequest(BaseModel):
    name: str
    description: Optional[str] = ""
    icon: Optional[str] = "Folder"
    status: Optional[str] = "active"

class UpdateCategoryRequest(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    icon: Optional[str] = None
    status: Optional[str] = None

class CreateQuestionRequest(BaseModel):
    category_id: str
    question_text: str
    difficulty: Optional[str] = "Medium"
    type: Optional[str] = "Technical"
    expected_answer: Optional[str] = ""
    tags: Optional[list[str]] = []
    status: Optional[str] = "active"

class UpdateQuestionRequest(BaseModel):
    category_id: Optional[str] = None
    question_text: Optional[str] = None
    difficulty: Optional[str] = None
    type: Optional[str] = None
    expected_answer: Optional[str] = None
    tags: Optional[list[str]] = None
    status: Optional[str] = None

class StatusToggleRequest(BaseModel):
    status: str

# ----------------- Category Endpoints -----------------

@router.get("/categories")
def get_categories(
    search: Optional[str] = None,
    status_filter: Optional[str] = None,
    token_payload: dict = Depends(verify_admin)
):
    query = {}
    if status_filter and status_filter.lower() != "all":
        query["status"] = status_filter.lower()
    if search and search.strip():
        term = search.strip()
        query["$or"] = [
            {"name": {"$regex": term, "$options": "i"}},
            {"description": {"$regex": term, "$options": "i"}}
        ]
    
    categories = list(categories_collection.find(query).sort("created_at", -1))
    
    # 1 single aggregation to get total and active question counts for all categories
    pipeline = [
        {
            "$group": {
                "_id": "$category_id",
                "total": {"$sum": 1},
                "active": {
                    "$sum": {"$cond": [{"$eq": ["$status", "active"]}, 1, 0]}
                }
            }
        }
    ]
    counts_map = {item["_id"]: item for item in questions_collection.aggregate(pipeline) if item.get("_id")}
    
    result = []
    for cat in categories:
        cat_id_str = str(cat["_id"])
        counts = counts_map.get(cat_id_str, {})
        cat_data = serialize_mongo(cat)
        cat_data["question_count"] = counts.get("total", 0)
        cat_data["active_question_count"] = counts.get("active", 0)
        result.append(cat_data)
        
    return result

@router.get("/categories/{id}")
def get_category(id: str, token_payload: dict = Depends(verify_admin)):
    try:
        obj_id = ObjectId(id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid category ID")
        
    cat = categories_collection.find_one({"_id": obj_id})
    if not cat:
        raise HTTPException(status_code=404, detail="Category not found")
        
    cat_data = serialize_mongo(cat)
    cat_data["question_count"] = questions_collection.count_documents({"category_id": id})
    cat_data["active_question_count"] = questions_collection.count_documents({"category_id": id, "status": "active"})
    return cat_data

@router.post("/categories")
def create_category(data: CreateCategoryRequest, token_payload: dict = Depends(verify_admin)):
    name = (data.name or "").strip()
    if not name:
        raise HTTPException(status_code=400, detail="Category name is required")
        
    # Check duplicate name case-insensitively
    existing = categories_collection.find_one({"name": {"$regex": f"^{re.escape(name)}$", "$options": "i"}})
    if existing:
        raise HTTPException(status_code=400, detail="A category with this name already exists")
        
    status_val = data.status.lower() if data.status and data.status.lower() in ["active", "archived"] else "active"
    
    new_cat = {
        "name": name,
        "description": (data.description or "").strip(),
        "icon": data.icon or "Folder",
        "status": status_val,
        "created_at": datetime.utcnow(),
        "updated_at": datetime.utcnow()
    }
    
    res = categories_collection.insert_one(new_cat)
    created = categories_collection.find_one({"_id": res.inserted_id})
    invalidate_cache("qb_stats")
    
    admin_user = admins_collection.find_one({"_id": ObjectId(token_payload.get("user_id"))})
    admin_email = admin_user.get("email") if admin_user else "Admin"
    log_action("CREATE_CATEGORY", admin_email, f"Category: {name}")
    
    result = serialize_mongo(created)
    result["question_count"] = 0
    result["active_question_count"] = 0
    return result

@router.put("/categories/{id}")
@router.patch("/categories/{id}")
def update_category(id: str, data: UpdateCategoryRequest, token_payload: dict = Depends(verify_admin)):
    try:
        obj_id = ObjectId(id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid category ID")
        
    existing = categories_collection.find_one({"_id": obj_id})
    if not existing:
        raise HTTPException(status_code=404, detail="Category not found")
        
    update_fields = {}
    if data.name is not None:
        name = data.name.strip()
        if not name:
            raise HTTPException(status_code=400, detail="Category name cannot be empty")
        # Check duplicate if name is different
        dup = categories_collection.find_one({
            "_id": {"$ne": obj_id},
            "name": {"$regex": f"^{re.escape(name)}$", "$options": "i"}
        })
        if dup:
            raise HTTPException(status_code=400, detail="A category with this name already exists")
        update_fields["name"] = name
        
    if data.description is not None:
        update_fields["description"] = data.description.strip()
    if data.icon is not None:
        update_fields["icon"] = data.icon.strip()
    if data.status is not None and data.status.lower() in ["active", "archived"]:
        update_fields["status"] = data.status.lower()
        
    update_fields["updated_at"] = datetime.utcnow()
    
    categories_collection.update_one({"_id": obj_id}, {"$set": update_fields})
    invalidate_cache("qb_stats")
    
    # If category name changed, update denormalized category_name in questions
    if "name" in update_fields:
        questions_collection.update_many({"category_id": id}, {"$set": {"category_name": update_fields["name"]}})
        
    updated = categories_collection.find_one({"_id": obj_id})
    
    admin_user = admins_collection.find_one({"_id": ObjectId(token_payload.get("user_id"))})
    admin_email = admin_user.get("email") if admin_user else "Admin"
    log_action("UPDATE_CATEGORY", admin_email, f"Category: {updated.get('name')}")
    
    res = serialize_mongo(updated)
    res["question_count"] = questions_collection.count_documents({"category_id": id})
    res["active_question_count"] = questions_collection.count_documents({"category_id": id, "status": "active"})
    return res

@router.patch("/categories/{id}/status")
def toggle_category_status(id: str, data: StatusToggleRequest, token_payload: dict = Depends(verify_admin)):
    try:
        obj_id = ObjectId(id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid category ID")
        
    status_val = data.status.lower()
    if status_val not in ["active", "archived"]:
        raise HTTPException(status_code=400, detail="Status must be 'active' or 'archived'")
        
    cat = categories_collection.find_one({"_id": obj_id})
    if not cat:
        raise HTTPException(status_code=404, detail="Category not found")
        
    categories_collection.update_one(
        {"_id": obj_id},
        {"$set": {"status": status_val, "updated_at": datetime.utcnow()}}
    )
    invalidate_cache("qb_stats")
    
    admin_user = admins_collection.find_one({"_id": ObjectId(token_payload.get("user_id"))})
    admin_email = admin_user.get("email") if admin_user else "Admin"
    log_action("UPDATE_CATEGORY_STATUS", admin_email, f"Category '{cat.get('name')}' -> {status_val}")
    
    updated = categories_collection.find_one({"_id": obj_id})
    res = serialize_mongo(updated)
    res["question_count"] = questions_collection.count_documents({"category_id": id})
    res["active_question_count"] = questions_collection.count_documents({"category_id": id, "status": "active"})
    return res

@router.delete("/categories/{id}")
def delete_category(id: str, token_payload: dict = Depends(verify_admin)):
    try:
        obj_id = ObjectId(id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid category ID")
        
    cat = categories_collection.find_one({"_id": obj_id})
    if not cat:
        raise HTTPException(status_code=404, detail="Category not found")
        
    cat_name = cat.get("name", id)
    # Delete category and cascade delete its questions
    q_del_result = questions_collection.delete_many({"category_id": id})
    categories_collection.delete_one({"_id": obj_id})
    invalidate_cache("qb_stats")
    
    admin_user = admins_collection.find_one({"_id": ObjectId(token_payload.get("user_id"))})
    admin_email = admin_user.get("email") if admin_user else "Admin"
    log_action("DELETE_CATEGORY", admin_email, f"Category: {cat_name} (and {q_del_result.deleted_count} questions)")
    
    return {
        "message": f"Category '{cat_name}' and {q_del_result.deleted_count} questions deleted successfully",
        "deleted_questions_count": q_del_result.deleted_count
    }

# ----------------- Questions Endpoints -----------------

@router.get("/questions")
def get_questions(
    search: Optional[str] = None,
    category_id: Optional[str] = None,
    difficulty: Optional[str] = None,
    status_filter: Optional[str] = None,
    type: Optional[str] = None,
    token_payload: dict = Depends(verify_admin)
):
    query = {}
    if category_id and category_id.lower() != "all":
        query["category_id"] = category_id
    if difficulty and difficulty.lower() != "all":
        query["difficulty"] = difficulty.capitalize() if difficulty.lower() in ["easy", "medium", "hard"] else difficulty
    if status_filter and status_filter.lower() != "all":
        query["status"] = status_filter.lower()
    if type and type.lower() != "all":
        query["type"] = type
        
    if search and search.strip():
        term = search.strip()
        query["$or"] = [
            {"question_text": {"$regex": term, "$options": "i"}},
            {"expected_answer": {"$regex": term, "$options": "i"}},
            {"category_name": {"$regex": term, "$options": "i"}},
            {"tags": {"$elemMatch": {"$regex": term, "$options": "i"}}}
        ]
        
    questions = list(questions_collection.find(query).sort("created_at", -1))
    return [serialize_mongo(q) for q in questions]

@router.get("/questions/{id}")
def get_question(id: str, token_payload: dict = Depends(verify_admin)):
    try:
        obj_id = ObjectId(id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid question ID")
        
    q = questions_collection.find_one({"_id": obj_id})
    if not q:
        raise HTTPException(status_code=404, detail="Question not found")
        
    return serialize_mongo(q)

@router.post("/questions")
def create_question(data: CreateQuestionRequest, token_payload: dict = Depends(verify_admin)):
    q_text = (data.question_text or "").strip()
    if not q_text:
        raise HTTPException(status_code=400, detail="Question text is required")
        
    if not data.category_id or not data.category_id.strip():
        raise HTTPException(status_code=400, detail="Category is required")
        
    # Verify category exists
    try:
        cat_obj_id = ObjectId(data.category_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid Category ID")
        
    cat = categories_collection.find_one({"_id": cat_obj_id})
    if not cat:
        raise HTTPException(status_code=404, detail="Selected category not found")
        
    difficulty = data.difficulty if data.difficulty in ["Easy", "Medium", "Hard"] else "Medium"
    status_val = data.status.lower() if data.status and data.status.lower() in ["active", "archived"] else "active"
    
    # Process tags
    clean_tags = [t.strip() for t in data.tags if isinstance(t, str) and t.strip()] if data.tags else []
    
    new_q = {
        "category_id": data.category_id,
        "category_name": cat.get("name", "Unknown Category"),
        "question_text": q_text,
        "difficulty": difficulty,
        "type": (data.type or "Technical").strip(),
        "expected_answer": (data.expected_answer or "").strip(),
        "tags": clean_tags,
        "status": status_val,
        "created_at": datetime.utcnow(),
        "updated_at": datetime.utcnow()
    }
    
    res = questions_collection.insert_one(new_q)
    created = questions_collection.find_one({"_id": res.inserted_id})
    invalidate_cache("qb_stats")
    
    admin_user = admins_collection.find_one({"_id": ObjectId(token_payload.get("user_id"))})
    admin_email = admin_user.get("email") if admin_user else "Admin"
    log_action("CREATE_QUESTION", admin_email, f"Question: {q_text[:35]}... ({cat.get('name')})")
    
    return serialize_mongo(created)

@router.put("/questions/{id}")
@router.patch("/questions/{id}")
def update_question(id: str, data: UpdateQuestionRequest, token_payload: dict = Depends(verify_admin)):
    try:
        obj_id = ObjectId(id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid question ID")
        
    existing = questions_collection.find_one({"_id": obj_id})
    if not existing:
        raise HTTPException(status_code=404, detail="Question not found")
        
    update_fields = {}
    if data.question_text is not None:
        q_text = data.question_text.strip()
        if not q_text:
            raise HTTPException(status_code=400, detail="Question text cannot be empty")
        update_fields["question_text"] = q_text
        
    if data.category_id is not None:
        cat_id = data.category_id.strip()
        try:
            cat_obj_id = ObjectId(cat_id)
        except Exception:
            raise HTTPException(status_code=400, detail="Invalid Category ID")
        cat = categories_collection.find_one({"_id": cat_obj_id})
        if not cat:
            raise HTTPException(status_code=404, detail="Selected category not found")
        update_fields["category_id"] = cat_id
        update_fields["category_name"] = cat.get("name", "Unknown Category")
        
    if data.difficulty is not None and data.difficulty in ["Easy", "Medium", "Hard"]:
        update_fields["difficulty"] = data.difficulty
    if data.type is not None:
        update_fields["type"] = data.type.strip()
    if data.expected_answer is not None:
        update_fields["expected_answer"] = data.expected_answer.strip()
    if data.tags is not None:
        update_fields["tags"] = [t.strip() for t in data.tags if isinstance(t, str) and t.strip()]
    if data.status is not None and data.status.lower() in ["active", "archived"]:
        update_fields["status"] = data.status.lower()
        
    update_fields["updated_at"] = datetime.utcnow()
    
    questions_collection.update_one({"_id": obj_id}, {"$set": update_fields})
    invalidate_cache("qb_stats")
    updated = questions_collection.find_one({"_id": obj_id})
    
    admin_user = admins_collection.find_one({"_id": ObjectId(token_payload.get("user_id"))})
    admin_email = admin_user.get("email") if admin_user else "Admin"
    log_action("UPDATE_QUESTION", admin_email, f"Question: {updated.get('question_text', '')[:35]}...")
    
    return serialize_mongo(updated)

@router.patch("/questions/{id}/status")
def toggle_question_status(id: str, data: StatusToggleRequest, token_payload: dict = Depends(verify_admin)):
    try:
        obj_id = ObjectId(id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid question ID")
        
    status_val = data.status.lower()
    if status_val not in ["active", "archived"]:
        raise HTTPException(status_code=400, detail="Status must be 'active' or 'archived'")
        
    q = questions_collection.find_one({"_id": obj_id})
    if not q:
        raise HTTPException(status_code=404, detail="Question not found")
        
    questions_collection.update_one(
        {"_id": obj_id},
        {"$set": {"status": status_val, "updated_at": datetime.utcnow()}}
    )
    invalidate_cache("qb_stats")
    
    admin_user = admins_collection.find_one({"_id": ObjectId(token_payload.get("user_id"))})
    admin_email = admin_user.get("email") if admin_user else "Admin"
    log_action("UPDATE_QUESTION_STATUS", admin_email, f"Question status -> {status_val}")
    
    updated = questions_collection.find_one({"_id": obj_id})
    return serialize_mongo(updated)

@router.delete("/questions/{id}")
def delete_question(id: str, token_payload: dict = Depends(verify_admin)):
    try:
        obj_id = ObjectId(id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid question ID")
        
    q = questions_collection.find_one({"_id": obj_id})
    if not q:
        raise HTTPException(status_code=404, detail="Question not found")
        
    q_text = q.get("question_text", id)
    questions_collection.delete_one({"_id": obj_id})
    invalidate_cache("qb_stats")
    
    admin_user = admins_collection.find_one({"_id": ObjectId(token_payload.get("user_id"))})
    admin_email = admin_user.get("email") if admin_user else "Admin"
    log_action("DELETE_QUESTION", admin_email, f"Question: {q_text[:35]}...")
    
    return {"message": "Question deleted successfully"}

# ----------------- Question Bank Stats & Seed -----------------

@router.get("/question-bank/stats")
def get_question_bank_stats(token_payload: dict = Depends(verify_admin)):
    cached = get_cached("qb_stats")
    if cached:
        return cached

    q_pipeline = [
        {
            "$facet": {
                "status_counts": [
                    {"$group": {"_id": "$status", "count": {"$sum": 1}}}
                ],
                "difficulty_counts": [
                    {"$group": {"_id": "$difficulty", "count": {"$sum": 1}}}
                ],
                "total": [
                    {"$count": "count"}
                ]
            }
        }
    ]
    
    cat_pipeline = [
        {
            "$facet": {
                "status_counts": [
                    {"$group": {"_id": "$status", "count": {"$sum": 1}}}
                ],
                "total": [
                    {"$count": "count"}
                ]
            }
        }
    ]
    
    q_aggr = list(questions_collection.aggregate(q_pipeline))
    cat_aggr = list(categories_collection.aggregate(cat_pipeline))
    
    q_res = q_aggr[0] if q_aggr else {}
    cat_res = cat_aggr[0] if cat_aggr else {}
    
    q_total = q_res.get("total", [{}])[0].get("count", 0) if q_res.get("total") else 0
    q_status_map = {item["_id"]: item["count"] for item in q_res.get("status_counts", []) if item.get("_id")}
    q_diff_map = {item["_id"]: item["count"] for item in q_res.get("difficulty_counts", []) if item.get("_id")}
    
    cat_total = cat_res.get("total", [{}])[0].get("count", 0) if cat_res.get("total") else 0
    cat_status_map = {item["_id"]: item["count"] for item in cat_res.get("status_counts", []) if item.get("_id")}
    
    result = {
        "total_questions": q_total,
        "active_questions": q_status_map.get("active", 0),
        "archived_questions": q_status_map.get("archived", 0),
        "total_categories": cat_total,
        "active_categories": cat_status_map.get("active", 0),
        "archived_categories": cat_status_map.get("archived", 0),
        "difficulty_breakdown": {
            "Easy": q_diff_map.get("Easy", 0),
            "Medium": q_diff_map.get("Medium", 0),
            "Hard": q_diff_map.get("Hard", 0)
        }
    }
    set_cached("qb_stats", result, ttl_seconds=15)
    return result

@router.post("/question-bank/seed")
def trigger_seed_question_bank(token_payload: dict = Depends(verify_admin)):
    from seed_question_bank import seed_question_bank
    res = seed_question_bank(force=True)
    invalidate_cache("qb_stats")
    
    admin_user = admins_collection.find_one({"_id": ObjectId(token_payload.get("user_id"))})
    admin_email = admin_user.get("email") if admin_user else "Admin"
    log_action("SEED_QUESTION_BANK", admin_email, "Question Bank Data", severity="info")
    
    return res

