from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel
from database import users_collection
from utils.auth import verify_password, create_access_token

router = APIRouter()

class LoginRequest(BaseModel):
    email: str
    password: str

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
    return {
        "access_token": access_token,
        "token_type": "bearer"
    }

@router.get("/")
async def get_admin_dashboard():
    # Placeholder for dashboard logic
    return {"message": "Admin dashboard endpoint"}
