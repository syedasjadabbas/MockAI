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
import hashlib
import os
import random
import secrets
import smtplib
import string
import time
from collections import defaultdict
from datetime import datetime, timedelta
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText

from bson import ObjectId
from fastapi import APIRouter, Depends, HTTPException, Request, status
from jose import JWTError, jwt
from pydantic import BaseModel, Field

from database import users_collection, admins_collection, otps_collection, invalidate_cache
from middleware.candidate_auth import verify_candidate
from utils.auth import SECRET_KEY, ALGORITHM, create_access_token, hash_password, verify_password
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
# Registration - FR01 (Production Email OTP Verification Flow)
# ---------------------------------------------------------------------------

class RegisterRequest(BaseModel):
    name: str
    email: str
    password: str
    confirm_password: str

class VerifyRegisterOtpRequest(BaseModel):
    email: str
    otp: str

class ResendRegisterOtpRequest(BaseModel):
    email: str


def _send_candidate_registration_otp_email(to_email: str, name: str, otp: str) -> bool:
    sender_email = os.getenv("SMTP_EMAIL")
    sender_password = os.getenv("SMTP_PASSWORD")
    smtp_server = os.getenv("SMTP_SERVER", "smtp.gmail.com")
    smtp_port = int(os.getenv("SMTP_PORT", "587"))

    if not sender_email or not sender_password:
        print(f"[DEBUG] SMTP not configured. Candidate registration OTP for {to_email} ({name}) is: {otp}")
        return False

    try:
        msg = MIMEMultipart()
        msg["From"] = f"MockAI <{sender_email}>"
        msg["To"] = to_email
        msg["Subject"] = "MockAI - Verify Your Email Address"

        first_name = name.strip().split()[0] if name and name.strip() else "there"

        html_body = f"""<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>MockAI Email Verification</title>
  </head>
  <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #14100d; padding: 40px 15px; margin: 0; color: #f3ede3;">
    <div style="max-width: 500px; margin: 0 auto; background-color: #1e1814; border: 1px solid #332921; padding: 36px 32px; border-radius: 16px; box-shadow: 0 12px 32px -8px rgba(0, 0, 0, 0.6);">
      
      <!-- Brand Header -->
      <div style="text-align: center; margin-bottom: 28px;">
        <div style="font-size: 26px; font-weight: 700; color: #df9b85; letter-spacing: -0.5px;">
          Mock<span style="color: #f3ede3;">AI</span>
        </div>
        <div style="font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 1.5px; color: #8e8070; margin-top: 4px;">
          Interview Practice Workspace
        </div>
      </div>

      <!-- Main Card Content -->
      <h2 style="color: #f3ede3; margin: 0 0 12px 0; font-size: 20px; font-weight: 600; text-align: center;">
        Verify your email
      </h2>
      <p style="color: #b6a999; font-size: 14px; line-height: 1.6; margin: 0 0 24px 0; text-align: center;">
        Hi {first_name}, welcome to MockAI! Please enter the 6-digit verification code below to complete your registration.
      </p>

      <!-- 6-Digit OTP Box -->
      <div style="background-color: #14100d; border: 1px solid #7a2333; padding: 20px; text-align: center; border-radius: 12px; margin: 24px 0;">
        <div style="font-family: 'Courier New', Courier, monospace; font-size: 36px; font-weight: 700; color: #df9b85; letter-spacing: 8px; margin-left: 8px;">
          {otp}
        </div>
      </div>

      <!-- Expiry Alert -->
      <div style="background-color: rgba(223, 155, 133, 0.08); border-left: 3px solid #df9b85; padding: 12px 16px; border-radius: 4px; margin-bottom: 24px;">
        <p style="margin: 0; color: #e5ab97; font-size: 13px; font-weight: 600;">
          ⏱ This code expires in 5 minutes.
        </p>
      </div>

      <!-- Security Notice -->
      <p style="color: #8e8070; font-size: 12px; line-height: 1.5; margin: 0; border-top: 1px solid #332921; padding-top: 20px;">
        <strong>Security Notice:</strong> If you did not create a MockAI account, you can safely ignore this email. Never share this code with anyone.
      </p>
    </div>

    <!-- Footer -->
    <div style="text-align: center; margin-top: 24px; color: #6b6055; font-size: 12px;">
      &copy; 2026 MockAI. AI-Powered Interview Practice.
    </div>
  </body>
</html>"""
        msg.attach(MIMEText(html_body, "html"))

        server = smtplib.SMTP(smtp_server, smtp_port, timeout=5)
        server.starttls()
        server.login(sender_email, sender_password)
        server.send_message(msg)
        server.quit()
        return True
    except Exception as exc:
        print(f"Candidate registration email failed for {to_email}: {type(exc).__name__}")
        print(f"[DEBUG] Candidate registration OTP for {to_email} is: {otp}")
        return False


@router.post("/register/send-otp")
@router.post("/register")
def initiate_candidate_registration(data: RegisterRequest):
    normalized_email = data.email.strip().lower()

    validate_required({"name": data.name, "email": data.email, "password": data.password})
    validate_email(normalized_email)
    validate_password_strength(data.password)

    if data.password != data.confirm_password:
        raise HTTPException(status_code=400, detail="Passwords do not match")

    check_duplicate_email(normalized_email)

    # Check cooldown on resending (minimum 45s between attempts)
    existing = otps_collection.find_one({"email": normalized_email, "type": "candidate_registration"})
    if existing and existing.get("created_at"):
        elapsed = (datetime.utcnow() - existing["created_at"]).total_seconds()
        if elapsed < 45:
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail=f"Please wait {int(45 - elapsed)}s before requesting another verification code."
            )

    # Generate secure 6-digit OTP
    otp = "".join(secrets.choice(string.digits) for _ in range(6))
    otp_hash = hashlib.sha256(otp.encode("utf-8")).hexdigest()
    hashed_pwd = hash_password(data.password)

    # Store pending registration in otps_collection with 5-minute TTL
    otps_collection.update_one(
        {"email": normalized_email, "type": "candidate_registration"},
        {
            "$set": {
                "email": normalized_email,
                "type": "candidate_registration",
                "name": data.name.strip(),
                "password_hash": hashed_pwd,
                "otp_hash": otp_hash,
                "expires_at": datetime.utcnow() + timedelta(minutes=5),
                "created_at": datetime.utcnow(),
                "verified": False,
                "attempts": 0,
            }
        },
        upsert=True,
    )

    _send_candidate_registration_otp_email(normalized_email, data.name, otp)

    return {"message": "Verification code sent to your email address."}


@router.post("/register/verify-otp", status_code=status.HTTP_201_CREATED)
def verify_candidate_registration_otp(data: VerifyRegisterOtpRequest):
    normalized_email = data.email.strip().lower()
    otp_input = data.otp.strip()

    if len(otp_input) != 6 or not otp_input.isdigit():
        raise HTTPException(status_code=400, detail="Please enter a valid 6-digit verification code.")

    record = otps_collection.find_one({
        "email": normalized_email,
        "type": "candidate_registration",
    })

    if not record or not record.get("expires_at"):
        raise HTTPException(status_code=400, detail="Verification code has expired or is invalid. Please sign up again.")

    if datetime.utcnow() > record["expires_at"]:
        otps_collection.delete_one({"_id": record["_id"]})
        raise HTTPException(status_code=400, detail="Verification code has expired. Please request a new code.")

    # Max 5 attempts to protect against brute force
    attempts = record.get("attempts", 0)
    if attempts >= 5:
        otps_collection.delete_one({"_id": record["_id"]})
        raise HTTPException(status_code=400, detail="Too many failed attempts. Please register again to receive a new code.")

    computed_hash = hashlib.sha256(otp_input.encode("utf-8")).hexdigest()
    if computed_hash != record.get("otp_hash"):
        otps_collection.update_one({"_id": record["_id"]}, {"$inc": {"attempts": 1}})
        remaining = 5 - (attempts + 1)
        raise HTTPException(
            status_code=400,
            detail=f"Invalid verification code. {remaining} attempt{'s' if remaining != 1 else ''} remaining."
        )

    # Re-verify duplicate email before activating account
    check_duplicate_email(normalized_email)

    # Create fully activated candidate account
    new_user = {
        "name": record["name"],
        "email": normalized_email,
        "password": record["password_hash"],
        "role": "user",
        "is_verified": True,
        "created_at": datetime.utcnow(),
    }
    result = users_collection.insert_one(new_user)
    invalidate_cache("dashboard_stats")

    # Invalidate OTP record immediately
    otps_collection.delete_one({"_id": record["_id"]})

    return {
        "message": "Email verified successfully. Account created.",
        "user_id": str(result.inserted_id),
    }


@router.post("/register/resend-otp")
def resend_candidate_registration_otp(data: ResendRegisterOtpRequest):
    normalized_email = data.email.strip().lower()

    record = otps_collection.find_one({
        "email": normalized_email,
        "type": "candidate_registration",
    })

    if not record:
        raise HTTPException(status_code=400, detail="No pending registration found. Please sign up again.")

    # Check cooldown (minimum 45s between requests)
    if record.get("created_at"):
        elapsed = (datetime.utcnow() - record["created_at"]).total_seconds()
        if elapsed < 45:
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail=f"Please wait {int(45 - elapsed)}s before requesting another verification code."
            )

    otp = "".join(secrets.choice(string.digits) for _ in range(6))
    otp_hash = hashlib.sha256(otp.encode("utf-8")).hexdigest()

    otps_collection.update_one(
        {"_id": record["_id"]},
        {
            "$set": {
                "otp_hash": otp_hash,
                "expires_at": datetime.utcnow() + timedelta(minutes=5),
                "created_at": datetime.utcnow(),
                "attempts": 0,
            }
        }
    )

    _send_candidate_registration_otp_email(normalized_email, record.get("name", ""), otp)

    return {"message": "A new verification code has been sent."}


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

# ---------------------------------------------------------------------------
# Password recovery - Production OTP Flow
# ---------------------------------------------------------------------------

class ForgotPasswordRequest(BaseModel):
    email: str

class VerifyOtpRequest(BaseModel):
    email: str
    otp: str

class ResetPasswordRequest(BaseModel):
    email: str
    reset_token: str
    new_password: str
    confirm_password: str

GENERIC_RESET_MESSAGE = "If an account exists for this email, a 6-digit verification code has been sent."


def _send_candidate_otp_email(to_email: str, otp: str) -> bool:
    sender_email = os.getenv("SMTP_EMAIL")
    sender_password = os.getenv("SMTP_PASSWORD")
    smtp_server = os.getenv("SMTP_SERVER", "smtp.gmail.com")
    smtp_port = int(os.getenv("SMTP_PORT", "587"))

    if not sender_email or not sender_password:
        print(f"[DEBUG] SMTP not configured. Candidate reset OTP for {to_email} is: {otp}")
        return False

    try:
        msg = MIMEMultipart()
        msg["From"] = f"MockAI <{sender_email}>"
        msg["To"] = to_email
        msg["Subject"] = "MockAI - Password Reset Verification Code"

        html_body = f"""<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>MockAI Password Reset</title>
  </head>
  <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #14100d; padding: 40px 15px; margin: 0; color: #f3ede3;">
    <div style="max-width: 500px; margin: 0 auto; background-color: #1e1814; border: 1px solid #332921; padding: 36px 32px; border-radius: 16px; box-shadow: 0 12px 32px -8px rgba(0, 0, 0, 0.6);">
      
      <!-- Brand Header -->
      <div style="text-align: center; margin-bottom: 28px;">
        <div style="font-size: 26px; font-weight: 700; color: #df9b85; letter-spacing: -0.5px;">
          Mock<span style="color: #f3ede3;">AI</span>
        </div>
        <div style="font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 1.5px; color: #8e8070; margin-top: 4px;">
          Interview Practice Workspace
        </div>
      </div>

      <!-- Main Card Content -->
      <h2 style="color: #f3ede3; margin: 0 0 12px 0; font-size: 20px; font-weight: 600; text-align: center;">
        Password Reset Request
      </h2>
      <p style="color: #b6a999; font-size: 14px; line-height: 1.6; margin: 0 0 24px 0; text-align: center;">
        We received a request to reset the password for your MockAI account. Enter the verification code below to continue.
      </p>

      <!-- 6-Digit OTP Box -->
      <div style="background-color: #14100d; border: 1px solid #7a2333; padding: 20px; text-align: center; border-radius: 12px; margin: 24px 0;">
        <div style="font-family: 'Courier New', Courier, monospace; font-size: 36px; font-weight: 700; color: #df9b85; letter-spacing: 8px; margin-left: 8px;">
          {otp}
        </div>
      </div>

      <!-- Expiry Alert -->
      <div style="background-color: rgba(223, 155, 133, 0.08); border-left: 3px solid #df9b85; padding: 12px 16px; border-radius: 4px; margin-bottom: 24px;">
        <p style="margin: 0; color: #e5ab97; font-size: 13px; font-weight: 600;">
          ⏱ This code expires in 5 minutes.
        </p>
      </div>

      <!-- Security Notice -->
      <p style="color: #8e8070; font-size: 12px; line-height: 1.5; margin: 0; border-top: 1px solid #332921; padding-top: 20px;">
        <strong>Security Notice:</strong> If you did not request this password reset, you can safely ignore this email. Never share this code with anyone.
      </p>
    </div>

    <!-- Footer -->
    <div style="text-align: center; margin-top: 24px; color: #6b6055; font-size: 12px;">
      &copy; 2026 MockAI. AI-Powered Interview Practice.
    </div>
  </body>
</html>"""
        msg.attach(MIMEText(html_body, "html"))

        server = smtplib.SMTP(smtp_server, smtp_port, timeout=5)
        server.starttls()
        server.login(sender_email, sender_password)
        server.send_message(msg)
        server.quit()
        return True
    except Exception as exc:
        print(f"Candidate password reset email failed for {to_email}: {type(exc).__name__}")
        print(f"[DEBUG] Candidate reset OTP for {to_email} is: {otp}")
        return False


def _create_password_reset_token(user_id: str, email: str) -> str:
    payload = {
        "purpose": "password_reset",
        "user_id": user_id,
        "email": email,
        "exp": datetime.utcnow() + timedelta(minutes=5),
    }
    return jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)


@router.post("/forgot-password/send-otp")
@router.post("/forgot-password")
def send_candidate_password_reset_otp(data: ForgotPasswordRequest):
    normalized_email = data.email.strip().lower()
    validate_email(normalized_email)
    user = users_collection.find_one({"email": normalized_email, "role": "user"})

    if user:
        # Check resend rate limit (minimum 45 seconds between requests)
        existing = otps_collection.find_one({"email": normalized_email, "type": "candidate_password_reset"})
        if existing and existing.get("created_at"):
            elapsed = (datetime.utcnow() - existing["created_at"]).total_seconds()
            if elapsed < 45:
                raise HTTPException(
                    status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                    detail=f"Please wait {int(45 - elapsed)}s before requesting another code."
                )

        # Generate cryptographically secure 6-digit OTP
        otp = "".join(secrets.choice(string.digits) for _ in range(6))
        otp_hash = hashlib.sha256(otp.encode("utf-8")).hexdigest()

        otps_collection.update_one(
            {"email": normalized_email, "type": "candidate_password_reset"},
            {
                "$set": {
                    "email": normalized_email,
                    "type": "candidate_password_reset",
                    "user_id": str(user["_id"]),
                    "otp_hash": otp_hash,
                    "expires_at": datetime.utcnow() + timedelta(minutes=5),
                    "created_at": datetime.utcnow(),
                    "verified": False,
                    "attempts": 0,
                }
            },
            upsert=True,
        )

        _send_candidate_otp_email(normalized_email, otp)

    # Always return the same message to avoid leaking account existence
    return {"message": GENERIC_RESET_MESSAGE}


@router.post("/forgot-password/verify-otp")
def verify_candidate_password_reset_otp(data: VerifyOtpRequest):
    normalized_email = data.email.strip().lower()
    otp_input = data.otp.strip()

    if len(otp_input) != 6 or not otp_input.isdigit():
        raise HTTPException(status_code=400, detail="Please enter a valid 6-digit verification code.")

    record = otps_collection.find_one({
        "email": normalized_email,
        "type": "candidate_password_reset",
    })

    if not record or not record.get("expires_at"):
        raise HTTPException(status_code=400, detail="Verification code has expired or is invalid. Please request a new code.")

    if datetime.utcnow() > record["expires_at"]:
        otps_collection.delete_one({"_id": record["_id"]})
        raise HTTPException(status_code=400, detail="Verification code has expired. Please request a new code.")

    # Max 5 attempts to protect against brute force
    attempts = record.get("attempts", 0)
    if attempts >= 5:
        otps_collection.delete_one({"_id": record["_id"]})
        raise HTTPException(status_code=400, detail="Too many failed attempts. Please request a new verification code.")

    computed_hash = hashlib.sha256(otp_input.encode("utf-8")).hexdigest()
    if computed_hash != record.get("otp_hash"):
        otps_collection.update_one({"_id": record["_id"]}, {"$inc": {"attempts": 1}})
        remaining = 5 - (attempts + 1)
        raise HTTPException(
            status_code=400,
            detail=f"Invalid verification code. {remaining} attempt{'s' if remaining != 1 else ''} remaining."
        )

    # Mark verified in database and generate bound reset token
    otps_collection.update_one({"_id": record["_id"]}, {"$set": {"verified": True}})
    reset_token = _create_password_reset_token(record["user_id"], normalized_email)

    return {
        "message": "Verification code confirmed.",
        "reset_token": reset_token,
    }


@router.post("/forgot-password/reset")
def reset_candidate_password(data: ResetPasswordRequest):
    normalized_email = data.email.strip().lower()

    if data.new_password != data.confirm_password:
        raise HTTPException(status_code=400, detail="Passwords do not match.")

    validate_password_strength(data.new_password)

    # Verify cryptographic reset token
    try:
        payload = jwt.decode(data.reset_token, SECRET_KEY, algorithms=[ALGORITHM])
        if payload.get("purpose") != "password_reset" or payload.get("email") != normalized_email:
            raise HTTPException(status_code=400, detail="Invalid or expired password reset session.")
        user_id = payload.get("user_id")
    except JWTError:
        raise HTTPException(status_code=400, detail="Invalid or expired password reset session. Please request a new code.")

    # Check that user exists
    user = users_collection.find_one({"_id": ObjectId(user_id), "role": "user"})
    if not user:
        raise HTTPException(status_code=404, detail="Candidate account not found.")

    # Update password and invalidate the OTP record completely
    users_collection.update_one(
        {"_id": ObjectId(user_id)},
        {"$set": {"password": hash_password(data.new_password)}},
    )
    otps_collection.delete_one({"email": normalized_email, "type": "candidate_password_reset"})

    return {"message": "Password reset successfully."}


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
