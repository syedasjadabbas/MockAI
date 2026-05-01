from fastapi import FastAPI, Depends, HTTPException, Body
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime
from bson import ObjectId
import json
from database import (
    admin_collection, 
    users_collection, 
    interviews_collection, 
    responses_collection, 
    analysis_collection, 
    interview_result_collection, 
    admin_log_collection
)
from auth import (
    verify_password, 
    create_access_token, 
    verify_token, 
    get_password_hash
)

app = FastAPI(title="MockAI Admin Panel API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Helpers
def serialize_mongo(obj):
    if obj is None:
        return None
    if isinstance(obj, list):
        return [serialize_mongo(item) for item in obj]
    obj["_id"] = str(obj["_id"])
    return obj

class LoginRequest(BaseModel):
    email: str
    password: str

class LogRequest(BaseModel):
    action: str
    target: str

@app.on_event("startup")
def startup_db():
    # Setup initial admin if it doesn't exist
    existing_admin = admin_collection.find_one({"email": "admin@mockai.com"})
    if not existing_admin:
        admin_collection.insert_one({
            "email": "admin@mockai.com",
            "password": get_password_hash("admin123")
        })

@app.post("/api/admin/login")
def login(request: LoginRequest):
    admin = admin_collection.find_one({"email": request.email})
    if not admin or not verify_password(request.password, admin["password"]):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    
    token = create_access_token({"sub": request.email})
    
    # Store admin log for login
    admin_log_collection.insert_one({
        "admin": request.email,
        "action": "Logged In",
        "target": "System",
        "timestamp": datetime.utcnow().isoformat()
    })
    
    return {"token": token}

@app.get("/api/admin/stats", dependencies=[Depends(verify_token)])
def get_stats():
    total_users = users_collection.count_documents({})
    total_interviews = interviews_collection.count_documents({})
    total_responses = responses_collection.count_documents({})
    
    pipeline = [{"$group": {"_id": None, "avgScore": {"$avg": "$overallScore"}}}]
    result = list(interview_result_collection.aggregate(pipeline))
    avg_score = result[0]["avgScore"] if result else 0
    
    return {
        "totalUsers": total_users,
        "totalInterviews": total_interviews,
        "totalResponses": total_responses,
        "averageScore": round(avg_score, 2)
    }

@app.get("/api/admin/recent-interviews", dependencies=[Depends(verify_token)])
def get_recent_interviews():
    interviews = list(interviews_collection.find().sort("date", -1).limit(5))
    return [serialize_mongo(i) for i in interviews]

@app.get("/api/admin/users", dependencies=[Depends(verify_token)])
def get_users():
    users = list(users_collection.find())
    for u in users:
        u["interviews"] = interviews_collection.count_documents({"userId": str(u["_id"])})
    return [serialize_mongo(u) for u in users]

@app.get("/api/admin/users/{user_id}", dependencies=[Depends(verify_token)])
def get_user_details(user_id: str):
    try:
        user = users_collection.find_one({"_id": ObjectId(user_id)})
    except:
        user = users_collection.find_one({"id": user_id})  # Fallback for mock integer IDs
    if not user:
        raise HTTPException(404, "User not found")
    
    user["interviews"] = interviews_collection.count_documents({"userId": user_id})
    return serialize_mongo(user)

@app.get("/api/admin/interviews", dependencies=[Depends(verify_token)])
def get_interviews():
    interviews = list(interviews_collection.find())
    return [serialize_mongo(i) for i in interviews]

@app.get("/api/admin/interviews/{interview_id}", dependencies=[Depends(verify_token)])
def get_interview(interview_id: str):
    try:
        interv = interviews_collection.find_one({"_id": ObjectId(interview_id)})
    except:
        # Fallback if frontend used custom format like integer IDs
        try:
            interv = interviews_collection.find_one({"id": int(interview_id)})
        except:
            interv = interviews_collection.find_one({"id": interview_id})
            
    if not interv:
        raise HTTPException(404, "Interview not found")
    return serialize_mongo(interv)

@app.get("/api/admin/results", dependencies=[Depends(verify_token)])
def get_results():
    results = list(interview_result_collection.find())
    for r in results:
        try:
            interv = interviews_collection.find_one({"_id": ObjectId(r.get("interviewId"))})
        except:
            try:
                interv = interviews_collection.find_one({"id": int(r.get("interviewId"))})
            except:
                interv = interviews_collection.find_one({"id": r.get("interviewId")})
        r["date"] = interv.get("date", "Unknown Date") if interv else "Unknown Date"
        # If frontend expects user from results... usually it's in results anyway
    return [serialize_mongo(r) for r in results]

@app.get("/api/admin/logs", dependencies=[Depends(verify_token)])
def get_logs():
    logs = list(admin_log_collection.find().sort("timestamp", -1))
    return [serialize_mongo(l) for l in logs]

@app.post("/api/admin/logs")
def store_log(req: LogRequest, admin: str = Depends(verify_token)):
    log_id = admin_log_collection.insert_one({
        "admin": admin,
        "action": req.action,
        "target": req.target,
        "timestamp": datetime.utcnow().isoformat()
    }).inserted_id
    return {"message": "Log saved", "id": str(log_id)}
