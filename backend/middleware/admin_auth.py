from fastapi import Header, HTTPException, status
from typing import Optional
from utils.auth import verify_token

def verify_admin(authorization: Optional[str] = Header(None)):
    """
    Dependency to verify that the request is authorized as an admin.
    Extracts the token from the Authorization header and decodes it.
    """
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    
    # 1. Extract JWT token from Authorization header and 2. Check if header missing
    if not authorization or not authorization.startswith("Bearer "):
        raise credentials_exception
        
    # Format: "Bearer <token>"
    token = authorization.split(" ")[1]
    
    # 3. Decode token using verify_token (this handles invalid/expired tokens with a 401)
    payload = verify_token(token)
    
    # 4. Check role must be "admin" & 5. If invalid, return HTTPException 401
    if payload.get("role") != "admin":
        raise credentials_exception
        
    # 6. If valid, return token payload
    return payload
