"""
Prepares the isolated test database used by backend/test_*.py
(DATABASE_NAME + "_test", see database.py IS_TEST_RUN).

- Copies the Question Bank (categories, questions) and mentors from the real
  database with their original ids, so tests see exactly the production
  question set (some tests reference real question ids).
- Copies the fixture interviews the AI test suites re-evaluate (listed in
  FIXTURE_INTERVIEW_IDS; their recordings live in backend/media/) and the
  candidate accounts that own them.
- Creates the standard admin accounts with the fixed test password
  (utils/admin_bootstrap.py) and the indexes.

Only READS the real database. Safe to re-run; it refreshes the copies.

    ../.venv311/Scripts/python.exe setup_test_db.py
"""
import os

from bson import ObjectId
from pymongo import MongoClient

os.environ["TESTING"] = "1"  # must be set before database is imported

from database import DATABASE_NAME, IS_TEST_RUN, MONGO_URI, _REAL_DATABASE_NAME, db, init_db_indexes  # noqa: E402
from utils.admin_bootstrap import ensure_default_admins  # noqa: E402

FIXTURE_INTERVIEW_IDS = ["6a96c6df4fe22d4bad7fc5a7"]
COPIED_COLLECTIONS = ["categories", "questions", "mentors"]


def main():
    assert IS_TEST_RUN and DATABASE_NAME.endswith("_test") and DATABASE_NAME != _REAL_DATABASE_NAME, \
        f"Refusing to write to non-test database {DATABASE_NAME!r}"
    real = MongoClient(MONGO_URI, serverSelectionTimeoutMS=12000)[_REAL_DATABASE_NAME]
    print(f"Copying reference data {_REAL_DATABASE_NAME} -> {DATABASE_NAME}")

    for name in COPIED_COLLECTIONS:
        docs = list(real[name].find({}))
        db[name].delete_many({})
        if docs:
            db[name].insert_many(docs)
        print(f"  {name}: {len(docs)}")

    for iid in FIXTURE_INTERVIEW_IDS:
        doc = real.interviews.find_one({"_id": ObjectId(iid)})
        if not doc:
            print(f"  fixture interview {iid}: not found in real database (skipped)")
            continue
        db.interviews.replace_one({"_id": doc["_id"]}, doc, upsert=True)
        owner = None
        try:
            owner = real.users.find_one({"_id": ObjectId(doc.get("user_id"))})
        except Exception:
            pass
        if owner:
            db.users.replace_one({"_id": owner["_id"]}, owner, upsert=True)
        print(f"  fixture interview {iid}: copied (owner {'copied' if owner else 'missing'})")

    init_db_indexes()
    ensure_default_admins()
    print("Test database ready.")


if __name__ == "__main__":
    main()
