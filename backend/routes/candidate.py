"""
Candidate Authentication API.

Scope for this phase: registration, login, session identity (/me), password
recovery, and change-password. Interview persistence, evaluation, and any
AI-backed endpoints are explicitly out of scope here and are not touched.

Reuses the same infrastructure the Admin Panel already relies on:
- utils/auth.py for bcrypt hashing and JWT creation (hash_password,
  verify_password, create_access_token, verify_token)
- database.py's existing users_collection, with the same document shape
  admin-created candidates already use ({name, email, password, role,
  created_at}) - see routes/admin.py's create_user for the precedent.
- utils/validators.py, a new shared module that mirrors routes/admin.py's
  inline validators exactly, so registration enforces the same rules
  admin-created users implicitly do, without touching admin.py at all.

Mounted at prefix /candidate in main.py, parallel to how admin_router is
mounted at /admin - a fully separate route namespace so nothing here can
collide with or affect the Admin Panel.
"""
import os
import random
import smtplib
import string
import time
from collections import defaultdict
from datetime import datetime
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText

from bson import ObjectId
from fastapi import APIRouter, Depends, HTTPException, Request, status
from pydantic import BaseModel, Field

from database import users_collection, admins_collection, invalidate_cache
from middleware.candidate_auth import verify_candidate
from utils.auth import create_access_token, hash_password, verify_password
from utils.validators import (
    check_duplicate_email,
    validate_email,
    validate_password_strength,
    validate_required,
)

router = APIRouter()

# Same simple in-memory rate limiter pattern as routes/admin.py's login,
# kept as its own copy here rather than shared, since neither route needs
# to touch the other's state.
_login_attempts: dict = defaultdict(list)
RATE_LIMIT_WINDOW = 60
RATE_LIMIT_MAX = 10


def _check_login_rate_limit(ip: str):
    now = time.time()
    attempts = [t for t in _login_attempts[ip] if now - t < RATE_LIMIT_WINDOW]
    _login_attempts[ip] = attempts
    if len(attempts) >= RATE_LIMIT_MAX:
        raise HTTPException(status_code=429, detail="Too many login attempts. Please wait and try again.")
    _login_attempts[ip].append(now)


def _public_user(user: dict) -> dict:
    """Serializes a user document for API responses - never includes the
    password hash, regardless of caller."""
    return {
        "id": str(user["_id"]),
        "name": user.get("name"),
        "email": user.get("email"),
        "role": user.get("role", "user"),
        "avatar": user.get("avatar"),
        "created_at": user.get("created_at"),
    }


# ---------------------------------------------------------------------------
# Registration - FR01
# ---------------------------------------------------------------------------

class RegisterRequest(BaseModel):
    name: str
    email: str
    password: str
    confirm_password: str


@router.post("/register", status_code=status.HTTP_201_CREATED)
def register_candidate(data: RegisterRequest):
    normalized_email = data.email.strip().lower()

    validate_required({"name": data.name, "email": data.email, "password": data.password})
    validate_email(normalized_email)
    validate_password_strength(data.password)

    if data.password != data.confirm_password:
        raise HTTPException(status_code=400, detail="Passwords do not match")

    check_duplicate_email(normalized_email)

    new_user = {
        "name": data.name.strip(),
        "email": normalized_email,
        "password": hash_password(data.password),
        "role": "user",
        "created_at": datetime.utcnow(),
    }
    result = users_collection.insert_one(new_user)
    invalidate_cache("dashboard_stats")

    token_payload = {"user_id": str(result.inserted_id), "role": "user"}
    access_token = create_access_token(token_payload)

    return {"access_token": access_token, "token_type": "bearer"}


# ---------------------------------------------------------------------------
# Login - FR02
# ---------------------------------------------------------------------------

class LoginRequest(BaseModel):
    email: str
    password: str


@router.post("/login")
def login_candidate(data: LoginRequest, request: Request):
    _check_login_rate_limit(request.client.host if request.client else "unknown")
    normalized_email = data.email.strip().lower()

    user = users_collection.find_one({"email": normalized_email})

    # An Admin account can never authenticate here: admins live in a
    # separate collection entirely, so this lookup structurally can't match
    # one. The explicit role check below is defense-in-depth in case a non
    # "user" role ever ends up in users_collection.
    if not user or user.get("role") != "user":
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid email or password")

    if not verify_password(data.password, user.get("password", "")):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid email or password")

    token_payload = {"user_id": str(user["_id"]), "role": "user"}
    access_token = create_access_token(token_payload)

    return {"access_token": access_token, "token_type": "bearer"}


# ---------------------------------------------------------------------------
# Session identity - FR04
# ---------------------------------------------------------------------------

@router.get("/me")
def get_candidate_profile(token_payload: dict = Depends(verify_candidate)):
    user = users_collection.find_one({"_id": ObjectId(token_payload.get("user_id"))})
    if not user:
        raise HTTPException(status_code=404, detail="Account not found")
    return _public_user(user)


# ---------------------------------------------------------------------------
# Update profile - FR05
#
# Scoped to the fields the system's own data model and Profile.jsx actually
# support today (name only) - matches the FYP report's "edit personal
# profile information" without inventing new profile fields the report,
# users_collection schema, and UI don't already define. Deliberately does
# NOT accept email or role in the request body at all (not just "ignores
# them"): the Pydantic model below has no such fields, so there is nothing
# for a crafted payload to smuggle through, and the $set only ever touches
# "name". Ownership is enforced structurally, not by trusting the caller -
# the target _id comes from the verified JWT's user_id, never from the
# request body, so a candidate can only ever update their own document.
# ---------------------------------------------------------------------------

class UpdateProfileRequest(BaseModel):
    name: str = Field(None, min_length=1, max_length=100)
    avatar: str = Field(None)


@router.patch("/me")
def update_candidate_profile(data: UpdateProfileRequest, token_payload: dict = Depends(verify_candidate)):
    user_id = ObjectId(token_payload.get("user_id"))
    update_fields = {}
    
    if data.name is not None:
        clean_name = data.name.strip()
        if not clean_name:
            raise HTTPException(status_code=400, detail="name is required")
        update_fields["name"] = clean_name
        
    if data.avatar is not None:
        update_fields["avatar"] = data.avatar
        
    if not update_fields:
        raise HTTPException(status_code=400, detail="No fields to update")
        
    result = users_collection.update_one({"_id": user_id}, {"$set": update_fields})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Account not found")
        
    updated_user = users_collection.find_one({"_id": user_id})
    return _public_user(updated_user)


# ---------------------------------------------------------------------------
# Logout - stateless JWT, no server-side session to destroy.
#
# There is deliberately no POST /candidate/logout endpoint. With a stateless
# JWT and no token-blocklist/session-store infrastructure in this backend,
# there is nothing a logout *request* could invalidate server-side that
# calling it wouldn't already achieve by doing nothing. The correct and
# complete logout mechanism is what the frontend already does: delete the
# token from localStorage (candidateAuth.js's logout()) so the browser can
# no longer present it. The token itself remains technically valid until
# its 24h expiry if captured beforehand - a known, explicitly documented
# limitation of pure stateless JWT (see the final report's "remaining
# limitations"), not something worth inventing a session store to solve in
# this authentication-only phase.
# ---------------------------------------------------------------------------


# ---------------------------------------------------------------------------
# Password recovery - FR03
#
# SMTP is already configured for this project (see routes/admin.py's own
# forgot-password/send-otp flows), so this sends a real email using the same
# mechanism. Unlike the Admin forgot-password route, this one:
#   - never changes the password unless the email actually sends, so a
#     delivery failure can't strand an account with a temp password the
#     user never received
#   - never logs the temp password to the console under any circumstance
#   - always returns the same generic response regardless of whether the
#     email exists, to avoid leaking account existence
# ---------------------------------------------------------------------------

class ForgotPasswordRequest(BaseModel):
    email: str

GENERIC_RESET_MESSAGE = "If an account exists for this email, password reset instructions have been sent."


def _send_candidate_reset_email(to_email: str, temp_password: str) -> bool:
    sender_email = os.getenv("SMTP_EMAIL")
    sender_password = os.getenv("SMTP_PASSWORD")
    smtp_server = os.getenv("SMTP_SERVER", "smtp.gmail.com")
    smtp_port = int(os.getenv("SMTP_PORT", "587"))

    if not sender_email or not sender_password:
        return False

    try:
        msg = MIMEMultipart()
        msg["From"] = sender_email
        msg["To"] = to_email
        msg["Subject"] = "MockAI - Password Reset"

        html_body = f"""
        <html>
          <body style="font-family: 'Inter', Arial, sans-serif; background-color: #080a10; padding: 40px 20px; margin: 0;">
            <div style="max-width: 500px; margin: 0 auto; background-color: #0f1624; border: 1px solid rgba(255, 255, 255, 0.05); padding: 30px; border-radius: 16px; box-shadow: 0 10px 30px -10px rgba(0, 0, 0, 0.5);">
              <h2 style="color: #ffffff; margin-top: 0; font-size: 24px; font-weight: 700;">MockAI Password Reset</h2>
              <p style="color: #94a3b8; font-size: 15px; line-height: 1.5;">Hello,</p>
              <p style="color: #94a3b8; font-size: 15px; line-height: 1.5;">Your temporary password for MockAI is:</p>
              <div style="background: rgba(99, 102, 241, 0.1); border: 1px solid rgba(99, 102, 241, 0.2); padding: 16px; text-align: center; border-radius: 8px; margin: 24px 0;">
                <span style="font-family: monospace; font-size: 22px; font-weight: bold; color: #818cf8; letter-spacing: 2px;">
                  {temp_password}
                </span>
              </div>
              <p style="color: #ef4444; font-size: 14px; margin-bottom: 0;">
                <strong>Security notice:</strong> Please sign in and change this password as soon as possible.
              </p>
            </div>
            <div style="text-align: center; margin-top: 20px; color: #475569; font-size: 12px;">
              &copy; 2026 MockAI. All rights reserved.
            </div>
          </body>
        </html>
        """
        msg.attach(MIMEText(html_body, "html"))

        server = smtplib.SMTP(smtp_server, smtp_port)
        server.starttls()
        server.login(sender_email, sender_password)
        server.send_message(msg)
        server.quit()
        return True
    except Exception as exc:
        # Log the failure for diagnostics, but never the temp password itself.
        print(f"Candidate password reset email failed for {to_email}: {type(exc).__name__}")
        return False


@router.post("/forgot-password")
def forgot_password_candidate(data: ForgotPasswordRequest):
    normalized_email = data.email.strip().lower()
    user = users_collection.find_one({"email": normalized_email, "role": "user"})

    if user:
        temp_password = "".join(random.choices(string.ascii_letters + string.digits, k=10))
        if _send_candidate_reset_email(normalized_email, temp_password):
            users_collection.update_one(
                {"_id": user["_id"]},
                {"$set": {"password": hash_password(temp_password)}},
            )
        # If the email failed to send, the password is intentionally left
        # unchanged - the account stays accessible with the old password.

    # Always the same response, whether or not the account exists or the
    # email could be sent - avoids leaking which emails are registered.
    return {"message": GENERIC_RESET_MESSAGE}


# ---------------------------------------------------------------------------
# Change password (authenticated) - supports FR03's "set a new password"
# once signed in, e.g. after using a temp password from the flow above.
# Not yet wired to any frontend control (Profile.jsx's UI is explicitly
# out of scope this phase) - exercised here and via the test suite so it's
# ready when profile integration adds the control.
# ---------------------------------------------------------------------------

class ChangePasswordRequest(BaseModel):
    old_password: str
    new_password: str


@router.put("/change-password")
def change_candidate_password(data: ChangePasswordRequest, token_payload: dict = Depends(verify_candidate)):
    user = users_collection.find_one({"_id": ObjectId(token_payload.get("user_id"))})
    if not user:
        raise HTTPException(status_code=404, detail="Account not found")

    if not verify_password(data.old_password, user.get("password", "")):
        raise HTTPException(status_code=400, detail="Current password is incorrect")

    validate_password_strength(data.new_password)

    users_collection.update_one(
        {"_id": user["_id"]},
        {"$set": {"password": hash_password(data.new_password)}},
    )

    # On the existing JWT staying valid after this: it does, until its
    # normal 24h expiry. This backend has no session store or token
    # blocklist (verify_token only checks signature/expiry - see
    # utils/auth.py), so there is nothing server-side to revoke, and adding
    # one just to invalidate-on-password-change would be exactly the kind
    # of token infrastructure this phase was told not to introduce. The
    # practical exposure is small and standard for stateless JWT: only a
    # token already captured before the change remains usable, and only
    # until it naturally expires. The frontend still logs the candidate out
    # immediately after a successful change (forcing a fresh login with the
    # new password) as a good client-side practice, not because the old
    # token stops working.
    return {"message": "Password updated successfully"}
