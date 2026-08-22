from fastapi import HTTPException, status, Depends
from fastapi.security import OAuth2PasswordBearer
from utils.auth import verify_token

oauth2_scheme_candidate = OAuth2PasswordBearer(tokenUrl="/candidate/login")


def verify_candidate(token: str = Depends(oauth2_scheme_candidate)):
    """
    Dependency to verify that the request is authorized as a candidate
    (role == "user"), mirroring middleware/admin_auth.py's verify_admin
    exactly except for the required role. Because verify_token() itself is
    role-agnostic, an Admin's token decodes here just fine but is then
    explicitly rejected for having the wrong role - and symmetrically, a
    Candidate's token is rejected by verify_admin the same way. Neither role
    can authenticate through the other's routes.
    """
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )

    if not token:
        raise credentials_exception

    payload = verify_token(token)

    if payload.get("role") != "user":
        raise credentials_exception

    return payload
