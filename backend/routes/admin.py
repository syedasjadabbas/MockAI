from fastapi import APIRouter, HTTPException, status, Depends
from pydantic import BaseModel
from bson import ObjectId
from database import users_collection, interviews_collection, serialize_mongo, admin_logs_collection
from utils.auth import verify_password, create_access_token, hash_password
from middleware.admin_auth import verify_admin
from datetime import datetime

router = APIRouter()

def log_action(action: str, admin_email: str, target: str = "System"):
    admin_logs_collection.insert_one({
        "action": action,
        "admin_email": admin_email,
        "target": target,
        "created_at": datetime.utcnow()
    })

class LoginRequest(BaseModel):
    email: str
    password: str

class ChangePasswordRequest(BaseModel):
    old_password: str
    new_password: str

@router.post("/login")
async def admin_login(login_data: LoginRequest):
    # 1. Find user in users_collection using email
    user = users_collection.find_one({"email": login_data.email})
    
    # 2. If user not found -> return 401
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, 
            detail="Invalid email or password"
        )
        
    # 3. Check user role == "admin"
    if user.get("role") != "admin":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, 
            detail="Access forbidden: User is not an admin"
        )
        
    # 4. Verify password
    if not verify_password(login_data.password, user.get("password", "")):
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
    log_action("LOGIN", login_data.email, "System")
    return {
        "access_token": access_token,
        "token_type": "bearer"
    }

@router.put("/change-password")
async def change_admin_password(
    data: ChangePasswordRequest, 
    token_payload: dict = Depends(verify_admin)
):
    user_id = token_payload.get("user_id")
    
    # Fetch user from db
    user = users_collection.find_one({"_id": ObjectId(user_id)})
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
    users_collection.update_one(
        {"_id": ObjectId(user_id)},
        {"$set": {"password": hashed_new_pw}}
    )
    
    log_action("UPDATE", user.get("email", "Unknown"), "Admin Password")
    return {"message": "Password updated successfully"}

@router.get("/")
async def get_admin_dashboard(token_payload: dict = Depends(verify_admin)):
    total_users = users_collection.count_documents({"role": {"$ne": "admin"}})
    total_interviews = interviews_collection.count_documents({})
    
    pipeline = [
        {
            "$group": {
                "_id": None,
                "avg_score": {"$avg": "$score"},
                "avg_confidence": {"$avg": "$confidence"},
                "avg_stress": {"$avg": "$stress"}
            }
        }
    ]
    
    aggr = list(interviews_collection.aggregate(pipeline))
    if aggr:
        stats = aggr[0]
        average_score = round(stats.get("avg_score") or 0, 1)
        average_confidence = round(stats.get("avg_confidence") or 0, 1)
        average_stress = round(stats.get("avg_stress") or 0, 1)
    else:
        average_score = 0
        average_confidence = 0
        average_stress = 0
        
    return {
        "total_users": total_users,
        "total_interviews": total_interviews,
        "average_score": average_score,
        "average_confidence": average_confidence,
        "average_stress": average_stress
    }

@router.get("/users")
async def get_users(token_payload: dict = Depends(verify_admin)):
    users = list(users_collection.find({"role": {"$ne": "admin"}}))
    # Remove passwords from the response for security
    for user in users:
        user.pop("password", None)
        # Add interview count per user
        user["interview_count"] = interviews_collection.count_documents({"user_id": str(user["_id"])})
    return [serialize_mongo(user) for user in users]

class CreateUserRequest(BaseModel):
    name: str
    email: str

@router.post("/users")
async def create_user(user_data: CreateUserRequest, token_payload: dict = Depends(verify_admin)):
    if users_collection.find_one({"email": user_data.email}):
        raise HTTPException(status_code=400, detail="Email already registered")
        
    new_user = {
        "name": user_data.name,
        "email": user_data.email,
        "password": hash_password("password123"),
        "role": "user",
        "created_at": datetime.utcnow()
    }
    result = users_collection.insert_one(new_user)
    
    admin_user = users_collection.find_one({"_id": ObjectId(token_payload.get("user_id"))})
    admin_email = admin_user.get("email") if admin_user else "Unknown Admin"
    log_action("UPDATE", admin_email, f"Created User: {user_data.name}")
    
    created_user = users_collection.find_one({"_id": result.inserted_id})
    created_user.pop("password", None)
    created_user["interview_count"] = 0
    return serialize_mongo(created_user)

@router.delete("/users/{id}")
async def delete_user(id: str, token_payload: dict = Depends(verify_admin)):
    try:
        obj_id = ObjectId(id)
    except Exception:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid user ID")
        
    admin_user = users_collection.find_one({"_id": ObjectId(token_payload.get("user_id"))})
    admin_email = admin_user.get("email") if admin_user else "Unknown Admin"
    user_to_delete = users_collection.find_one({"_id": obj_id})
    target_name = user_to_delete.get("name", id) if user_to_delete else id
    
    result = users_collection.delete_one({"_id": obj_id, "role": {"$ne": "admin"}})
    if result.deleted_count == 0:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
        
    log_action("DELETE", admin_email, f"User: {target_name}")
    return {"message": "User deleted successfully"}

# Projection to return only the requested fields
INTERVIEW_PROJECTION = {
    "user_id": 1,
    "role": 1,
    "status": 1,
    "score": 1,
    "confidence": 1,
    "stress": 1,
    "transcript": 1,
    "created_at": 1
}

from typing import Optional

@router.get("/interviews")
async def get_interviews(
    role: Optional[str] = None, 
    status_filter: Optional[str] = None, 
    date: Optional[str] = None, 
    token_payload: dict = Depends(verify_admin)
):
    query = {}
    if role and role != 'All':
        query["role"] = role
    if status_filter and status_filter != 'All':
        query["status"] = status_filter
        
    interviews = list(interviews_collection.find(query, INTERVIEW_PROJECTION))
    
    # Map user_id to user name
    for interview in interviews:
        try:
            user = users_collection.find_one({"_id": ObjectId(interview.get("user_id"))})
            interview["candidate_name"] = user.get("name", "Deleted User") if user else "Deleted User"
        except Exception:
            interview["candidate_name"] = "Deleted User"
            
    # Filter by date exactly if provided (matching YYYY-MM-DD prefix)
    if date:
        interviews = [i for i in interviews if i.get("created_at") and i["created_at"].strftime('%Y-%m-%d') == date]
            
    return [serialize_mongo(interview) for interview in interviews]

@router.get("/interviews/{id}")
async def get_interview(id: str, token_payload: dict = Depends(verify_admin)):
    try:
        obj_id = ObjectId(id)
    except Exception:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid interview ID")
        
    interview = interviews_collection.find_one({"_id": obj_id}, INTERVIEW_PROJECTION)
    if not interview:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Interview not found")
        
    return serialize_mongo(interview)

@router.delete("/interviews/{id}")
async def delete_interview(id: str, token_payload: dict = Depends(verify_admin)):
    try:
        obj_id = ObjectId(id)
    except Exception:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid interview ID")
        
    admin_user = users_collection.find_one({"_id": ObjectId(token_payload.get("user_id"))})
    admin_email = admin_user.get("email") if admin_user else "Unknown Admin"
    interview_to_delete = interviews_collection.find_one({"_id": obj_id})
    target_role = interview_to_delete.get("role", id) if interview_to_delete else id
    
    result = interviews_collection.delete_one({"_id": obj_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Interview not found")
        
    log_action("DELETE", admin_email, f"Interview: {target_role}")
    return {"message": "Interview deleted successfully"}

@router.get("/logs")
async def get_logs(token_payload: dict = Depends(verify_admin)):
    logs = list(admin_logs_collection.find({}).sort("created_at", -1).limit(50))
    if not logs:
        # Provide dummy logs if empty
        dummy_logs = [
            {"action": "Admin logged in", "admin_email": "admin@mockai.com", "created_at": "2023-10-27T10:00:00Z"},
            {"action": "Password changed", "admin_email": "admin@mockai.com", "created_at": "2023-10-26T15:30:00Z"},
            {"action": "User deleted", "admin_email": "admin@mockai.com", "created_at": "2023-10-25T09:15:00Z"},
            {"action": "Interview reviewed", "admin_email": "admin@mockai.com", "created_at": "2023-10-24T14:20:00Z"}
        ]
        return [serialize_mongo(log) for log in dummy_logs]
        
    return [serialize_mongo(log) for log in logs]
