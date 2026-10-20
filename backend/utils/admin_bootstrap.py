"""
Bootstrap of the standard admin accounts.

No password is stored in source code. A missing admin account is created
only when ADMIN_BOOTSTRAP_PASSWORD is set in the environment (.env locally,
the Render dashboard in production); that password is meant to be changed
on first login. Existing accounts are never modified - their passwords are
never reset - so changing a password in the Admin Panel is permanent.

The isolated test database (see database.py IS_TEST_RUN) uses a fixed test
password so the automated test suites can sign in; it never touches the
real database.
"""
import os
from datetime import datetime

from database import IS_TEST_RUN, admins_collection
from utils.auth import hash_password

STANDARD_ADMINS = [
    {"name": "System Admin", "email": "admin@mockai.com"},
    {"name": "Asjad Abbas", "email": "asjadabbaszaidi@gmail.com"},
    {"name": "Hassan Kazmi", "email": "hassankazmi2004@gmail.com"},
]

TEST_ADMIN_PASSWORD = "admin123"  # test database only


def _bootstrap_password():
    if IS_TEST_RUN:
        return TEST_ADMIN_PASSWORD
    return (os.getenv("ADMIN_BOOTSTRAP_PASSWORD") or "").strip() or None


def ensure_default_admins(log=print) -> int:
    """Creates missing standard admins (if a bootstrap password is configured)
    and repairs a wrong role. Returns how many accounts were created."""
    password = _bootstrap_password()
    created = 0
    for adm in STANDARD_ADMINS:
        email = adm["email"].strip().lower()
        existing = admins_collection.find_one({"email": email})
        if existing:
            if existing.get("role") != "admin":
                admins_collection.update_one({"_id": existing["_id"]}, {"$set": {"role": "admin"}})
            log(f"Startup check: Standard admin '{email}' verified.")
            continue
        if not password:
            log(f"Startup check: admin '{email}' is missing; set ADMIN_BOOTSTRAP_PASSWORD to create it.")
            continue
        admins_collection.insert_one({
            "name": adm["name"],
            "email": email,
            "password": hash_password(password),
            "role": "admin",
            "created_at": datetime.utcnow(),
        })
        created += 1
        log(f"Startup check: Created admin account '{email}'.")
    return created
