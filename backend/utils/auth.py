import os
from datetime import datetime, timedelta
from jose import JWTError, jwt
from passlib.context import CryptContext
from fastapi import HTTPException, status
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

SECRET_KEY = os.getenv("SECRET_KEY", "default-fallback-secret-key")
ALGORITHM = "HS256"

# Password hashing context setup
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def hash_password(password: str) -> str:
    """Return the hashed version of a plain password."""
    return pwd_context.hash(password)

def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Return True if the plain password matches the hashed password."""
    return pwd_context.verify(plain_password, hashed_password)

def create_access_token(data: dict) -> str:
    """Create a new JWT access token with a 24-hour expiration."""
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(hours=24)
    to_encode.update({"exp": expire})
    
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

def verify_token(token: str) -> dict:
    """
    Decode and verify a JWT token's signature/expiry and return its raw payload.

    This is role-agnostic by design: it only guarantees the token is validly
    signed, unexpired, and carries a user_id. Callers that require a specific
    role (e.g. middleware/admin_auth.py's verify_admin, or
    middleware/candidate_auth.py's verify_candidate) must check
    payload.get("role") themselves after calling this. This lets a single
    shared JWT utility serve multiple roles without one role's dependency
    silently accepting another role's token.
    """
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )

    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id = payload.get("user_id")

        if not user_id:
            raise credentials_exception

        return payload
    except JWTError:
        raise credentials_exception
