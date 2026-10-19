"""
Per-account login lockout - FR 2-03 ("prevent unauthorized login attempts")
and NFR 8-02, test case TC-06 ("Multiple failed attempts -> Account
protection triggered").

The existing per-IP rate limiters in routes/candidate.py and routes/admin.py
slow down a single client, but an attacker rotating IPs could still keep
guessing one account's password. This adds protection on the account itself:
after MAX_FAILED_ATTEMPTS consecutive wrong passwords the account is locked
for LOCKOUT_MINUTES, regardless of which IP the attempts came from.

State lives on the account document itself (users or admins collection):
  failed_login_attempts: int
  locked_until: datetime | None
so it survives restarts and is shared across worker processes, unlike the
in-memory IP limiter.
"""
import os
from datetime import datetime, timedelta

from fastapi import HTTPException, status

MAX_FAILED_ATTEMPTS = int(os.getenv("LOGIN_MAX_FAILED_ATTEMPTS", "5"))
LOCKOUT_MINUTES = int(os.getenv("LOGIN_LOCKOUT_MINUTES", "15"))


def _minutes_remaining(locked_until: datetime) -> int:
    seconds = (locked_until - datetime.utcnow()).total_seconds()
    return max(1, int(seconds // 60) + (1 if seconds % 60 else 0))


def ensure_not_locked(account: dict) -> None:
    """Raises HTTP 423 if the account is currently locked."""
    locked_until = account.get("locked_until")
    if isinstance(locked_until, datetime) and locked_until > datetime.utcnow():
        raise HTTPException(
            status_code=status.HTTP_423_LOCKED,
            detail=(
                "This account is temporarily locked after repeated failed sign-in attempts. "
                f"Try again in {_minutes_remaining(locked_until)} minute(s) or reset your password."
            ),
        )


def register_failed_attempt(collection, account: dict) -> bool:
    """
    Records one failed password attempt. Returns True if this attempt
    triggered a lock. A lock that has already expired starts a fresh count.
    """
    locked_until = account.get("locked_until")
    previous = account.get("failed_login_attempts", 0) or 0
    if isinstance(locked_until, datetime) and locked_until <= datetime.utcnow():
        previous = 0

    attempts = previous + 1
    update = {"failed_login_attempts": attempts, "last_failed_login_at": datetime.utcnow()}
    triggered = attempts >= MAX_FAILED_ATTEMPTS
    if triggered:
        update["locked_until"] = datetime.utcnow() + timedelta(minutes=LOCKOUT_MINUTES)
        update["failed_login_attempts"] = 0
    else:
        update["locked_until"] = None

    collection.update_one({"_id": account["_id"]}, {"$set": update})
    return triggered


def clear_failed_attempts(collection, account: dict) -> None:
    """Resets the counter after a successful login or a password reset."""
    if account.get("failed_login_attempts") or account.get("locked_until"):
        collection.update_one(
            {"_id": account["_id"]},
            {"$set": {"failed_login_attempts": 0, "locked_until": None}},
        )
