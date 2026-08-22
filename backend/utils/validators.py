"""
Shared request-validation helpers for user-facing registration/profile flows.

These mirror the validators already defined inline in routes/admin.py
(validate_required, validate_email, check_duplicate_email) exactly, so that
Candidate routes enforce identical rules without duplicating logic that
diverges over time. routes/admin.py is left untouched and keeps its own
local copies - this module is additive, used only by the new candidate
routes.
"""
import re
from fastapi import HTTPException
from database import users_collection, admins_collection


def validate_required(fields: dict):
    for key, value in fields.items():
        if not value or (isinstance(value, str) and not value.strip()):
            raise HTTPException(status_code=400, detail=f"{key} is required")


def validate_email(email: str):
    if not re.match(r"[^@]+@[^@]+\.[^@]+", email):
        raise HTTPException(status_code=400, detail="Invalid email format")


def validate_password_strength(password: str, min_length: int = 6):
    if not password or len(password) < min_length:
        raise HTTPException(status_code=400, detail=f"Password must be at least {min_length} characters")


def check_duplicate_email(email: str, exclude_user_id: str = None):
    """
    Cross-checks both users_collection and admins_collection so a candidate
    can never register with an email already in use by an admin, or vice
    versa - matches the same cross-collection check routes/admin.py already
    performs for admin-created users.
    """
    from bson import ObjectId

    user_query = {"email": email}
    if exclude_user_id:
        user_query["_id"] = {"$ne": ObjectId(exclude_user_id)}
    if users_collection.find_one(user_query) or admins_collection.find_one({"email": email}):
        raise HTTPException(status_code=400, detail="Email already exists")
