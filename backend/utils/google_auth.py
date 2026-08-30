import os
from fastapi import HTTPException, status
from google.oauth2 import id_token as google_id_token
from google.auth.transport import requests as google_requests


def verify_google_id_token(token_str: str) -> dict:
    """
    Verifies a Google OAuth2 ID Token server-side.
    
    Validates:
    - Signature & Expiration
    - Audience (matches GOOGLE_CLIENT_ID from environment)
    - Issuer (accounts.google.com or https://accounts.google.com)
    - Email is present and marked verified
    
    Returns a normalized dict:
    {
        "sub": str,
        "email": str,
        "name": str,
        "avatar": Optional[str]
    }
    """
    if not token_str or not token_str.strip():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Google ID token is required."
        )

    # In automated test mode, support mock token format: mock-google-token:<sub_id>:<email>:<name>[:<avatar_url>]
    if os.getenv("TESTING") == "1" and token_str.startswith("mock-google-token:"):
        parts = token_str.split(":", 4)
        if len(parts) < 3:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid mock Google ID token format."
            )
        sub = parts[1]
        email = parts[2].strip().lower()
        name = parts[3] if len(parts) > 3 and parts[3] else email.split("@")[0]
        avatar = parts[4] if len(parts) > 4 and parts[4] else None
        return {
            "sub": sub,
            "email": email,
            "name": name,
            "avatar": avatar,
        }

    client_id = os.getenv("GOOGLE_CLIENT_ID", "").strip()
    if not client_id:
        print("[GoogleAuth Error] GOOGLE_CLIENT_ID is not configured in backend/.env")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Google authentication is not configured on the server. Please set GOOGLE_CLIENT_ID in backend/.env."
        )

    import time
    start_time = time.time()
    print(f"[GoogleAuth Flow] Step 5: Verifying Google OAuth2 token with audience={client_id[:12]}... (token length={len(token_str)})")

    try:
        import requests
        from requests.adapters import HTTPAdapter

        class _TimeoutAdapter(HTTPAdapter):
            def send(self, request, **kwargs):
                # If timeout is None or omitted in kwargs, enforce 8.0s timeout
                if kwargs.get('timeout') is None:
                    kwargs['timeout'] = 8.0
                return super().send(request, **kwargs)

        session = requests.Session()
        session.mount('https://', _TimeoutAdapter())
        session.mount('http://', _TimeoutAdapter())
        request_adapter = google_requests.Request(session=session)

        idinfo = google_id_token.verify_oauth2_token(
            token_str.strip(),
            request_adapter,
            audience=client_id
        )
        elapsed = round((time.time() - start_time) * 1000, 2)
        print(f"[GoogleAuth Flow] Step 5: Token successfully verified by Google in {elapsed}ms. Email: {idinfo.get('email')}")
    except requests.exceptions.Timeout:
        print("[GoogleAuth Error] Connection to Google token verification servers timed out.")
        raise HTTPException(
            status_code=status.HTTP_504_GATEWAY_TIMEOUT,
            detail="Google token verification timed out. Please check your network and try again."
        )
    except requests.exceptions.RequestException as req_err:
        print(f"[GoogleAuth Error] Network error contacting Google servers: {req_err}")
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Network error connecting to Google servers: {str(req_err)}"
        )
    except ValueError as val_err:
        print(f"[GoogleAuth Error] Token verification ValueError: {val_err}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Google ID token verification failed: {str(val_err)}"
        )
    except HTTPException:
        raise
    except Exception as exc:
        print(f"[GoogleAuth Error] Token verification Exception ({type(exc).__name__}): {exc}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Google authentication failed: {str(exc) or type(exc).__name__}"
        )

    # Verify Issuer
    issuer = idinfo.get("iss")
    if issuer not in ["accounts.google.com", "https://accounts.google.com"]:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Invalid Google token issuer: {issuer}"
        )

    # Verify email is present and verified
    email = idinfo.get("email", "").strip().lower()
    if not email:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Google account does not have an associated email address."
        )

    if not idinfo.get("email_verified", False):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Google account email is not verified. Please verify your email with Google first."
        )

    sub = idinfo.get("sub")
    if not sub:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Google account ID (sub) is missing from token."
        )

    name = idinfo.get("name") or idinfo.get("given_name") or email.split("@")[0]
    avatar = idinfo.get("picture")

    return {
        "sub": str(sub),
        "email": email,
        "name": str(name).strip(),
        "avatar": avatar,
    }
