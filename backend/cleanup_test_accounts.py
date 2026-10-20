"""
Removes accounts created by the automated test suites from the REAL database
(before tests had their own database, see database.py IS_TEST_RUN), together
with their interviews, surveys, appointments and OTP records, plus
interviews whose owner account no longer exists.

A test account is one whose email is @example.com / @test.com, or whose
local part contains a 10+ digit timestamp (what every test generator uses,
e.g. "sysint.a.1792500890788@mockai.com"). Everything else is kept.

Dry run by default - prints what would be deleted:
    python cleanup_test_accounts.py
Delete for real:
    python cleanup_test_accounts.py --apply
"""
import re
import sys

from database import DATABASE_NAME, IS_TEST_RUN, db

TEST_EMAIL = re.compile(r"@(example\.com|test\.com)$", re.I)
TIMESTAMP = re.compile(r"\d{10,}")


def is_test_email(email: str) -> bool:
    email = (email or "").lower()
    return bool(TEST_EMAIL.search(email) or TIMESTAMP.search(email.split("@")[0]))


def main(apply: bool) -> None:
    if IS_TEST_RUN:
        sys.exit("Run this against the real database (not as a test).")
    users = list(db.users.find({}, {"email": 1, "name": 1}))
    test_users = [u for u in users if is_test_email(u.get("email"))]
    kept = [u for u in users if not is_test_email(u.get("email"))]
    test_ids = [str(u["_id"]) for u in test_users]
    test_emails = [u["email"] for u in test_users]
    kept_ids = [str(u["_id"]) for u in kept]

    plan = {
        "users": ({"_id": {"$in": [u["_id"] for u in test_users]}}, db.users),
        "interviews (test users)": ({"user_id": {"$in": test_ids}}, db.interviews),
        "interviews (owner deleted)": ({"user_id": {"$nin": kept_ids + test_ids}}, db.interviews),
        "surveys": ({"user_id": {"$in": test_ids}}, db.surveys),
        "appointments": ({"user_id": {"$in": test_ids}}, db.appointments),
        "otps": ({"email": {"$in": test_emails}}, db.otps),
    }

    print(f"Database: {DATABASE_NAME}")
    print(f"Keeping {len(kept)} accounts:")
    for u in kept:
        print(f"   {u.get('email')}  ({u.get('name')})")
    print("\nTo delete:")
    for label, (query, coll) in plan.items():
        print(f"   {label:28s} {coll.count_documents(query)}")

    if not apply:
        print("\nDry run only. Re-run with --apply to delete.")
        return
    for label, (query, coll) in plan.items():
        res = coll.delete_many(query)
        print(f"Deleted {res.deleted_count} {label}")
    print("Done. Media files on disk are not removed.")


if __name__ == "__main__":
    main(apply="--apply" in sys.argv)
