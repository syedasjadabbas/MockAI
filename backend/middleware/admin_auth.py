from fastapi import HTTPException, status, Depends
from fastapi.security import OAuth2PasswordBearer
from utils.auth import verify_token

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/admin/login")

def verify_admin(token: str = Depends(oauth2_scheme)):
    """
    Dependency to verify that the request is authorized as an admin.
    Extracts the token using OAuth2PasswordBearer to support Swagger UI.
    """
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    
    if not token:
        raise credentials_exception
        
    # Decode token using verify_token (this handles invalid/expired tokens with a 401)
    payload = verify_token(token)
    
    # Check role must be "admin" & If invalid, return HTTPException 401
    if payload.get("role") != "admin":
        raise credentials_exception
        
    # If valid, return token payload
    return payload
