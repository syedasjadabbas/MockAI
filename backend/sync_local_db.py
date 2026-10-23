"""
Fills the LOCAL MongoDB used by MONGO_TARGET=local (see database.py).

Copy everything from Atlas (needs a network that allows port 27017, e.g. a
phone hotspot):
    python sync_local_db.py
    python sync_local_db.py --yes           # overwrite a non-empty local DB

Offline / blocked network - seed the local DB without Atlas (question bank,
mentors and the standard admin accounts; no candidate data):
    python sync_local_db.py --seed-only
  Admin accounts get the password in ADMIN_BOOTSTRAP_PASSWORD, or you are
  prompted for one.

The local mongod must be running (start-mockai.bat local starts it).
Data created while running in local mode stays local - it is NOT copied back
to Atlas.
"""
import argparse
import getpass
import os
import sys
from datetime import datetime

from pymongo import MongoClient
from pymongo.errors import PyMongoError

# Read Atlas / local URIs without connecting through database.py.
os.environ.setdefault("MONGO_TARGET", "local")
from dotenv import load_dotenv  # noqa: E402

load_dotenv(os.path.join(os.path.dirname(os.path.abspath(__file__)), ".env"))
ATLAS_URI = os.getenv("MONGO_URI") or os.getenv("MONGODB_URI")
LOCAL_URI = os.getenv("LOCAL_MONGO_URI", "mongodb://127.0.0.1:27017")
DB_NAME = os.getenv("DATABASE_NAME", "mockai")


def connect(uri: str, label: str, timeout_ms: int):
    client = MongoClient(uri, serverSelectionTimeoutMS=timeout_ms)
    try:
        client.admin.command("ping")
        return client
    except PyMongoError as e:
        print(f"[ERROR] Cannot reach {label}: {type(e).__name__}")
        return None


def copy_from_atlas(force: bool) -> int:
    local = connect(LOCAL_URI, f"local MongoDB ({LOCAL_URI}) - is it running?", 5000)
    if not local:
        return 1
    if not ATLAS_URI:
        print("[ERROR] MONGO_URI is not set in backend/.env")
        return 1
    print("Connecting to Atlas...")
    atlas = connect(ATLAS_URI, "MongoDB Atlas. This network may block port 27017 - try a phone hotspot, "
                               "or run with --seed-only", 15000)
    if not atlas:
        return 1

    src, dst = atlas[DB_NAME], local[DB_NAME]
    existing = dst.list_collection_names()
    if existing and not force:
        counts = {c: dst[c].estimated_document_count() for c in existing}
        print(f"[STOP] Local database '{DB_NAME}' already has data: {counts}")
        print("       Re-run with --yes to replace it with the Atlas copy. The current local")
        print("       data is backed up to a separate database first, so nothing is lost.")
        return 1
    if existing:
        backup_name = f"{DB_NAME}_backup_{datetime.now().strftime('%Y%m%d_%H%M%S')}"
        backup = local[backup_name]
        for name in existing:
            docs = list(dst[name].find({}))
            if docs:
                backup[name].insert_many(docs)
        print(f"Backed up the existing local '{DB_NAME}' to '{backup_name}'.")

    print(f"Copying '{DB_NAME}' Atlas -> local")
    for name in sorted(src.list_collection_names()):
        docs = list(src[name].find({}))
        dst[name].delete_many({})
        if docs:
            dst[name].insert_many(docs)
        print(f"  {name:20s} {len(docs)}")
    _finish_local()
    print("Done. Start MockAI with:  start-mockai.bat local")
    return 0


def seed_offline() -> int:
    local = connect(LOCAL_URI, f"local MongoDB ({LOCAL_URI}) - is it running?", 5000)
    if not local:
        return 1
    if not os.getenv("ADMIN_BOOTSTRAP_PASSWORD"):
        pw = getpass.getpass("Password for the local admin accounts: ").strip()
        if not pw:
            print("[ERROR] A password is required.")
            return 1
        os.environ["ADMIN_BOOTSTRAP_PASSWORD"] = pw

    os.environ["MONGO_TARGET"] = "local"
    from seed_mentors import ensure_default_mentors
    from seed_question_bank import seed_question_bank
    from utils.admin_bootstrap import ensure_default_admins

    print(f"Seeding local database '{DB_NAME}' (no Atlas needed)")
    print("  question bank:", seed_question_bank(force=False).get("message"))
    ensure_default_mentors(force_refresh=False)
    ensure_default_admins()
    _finish_local()
    print("Done. Candidate data is not included - run without --seed-only on an open network to copy it.")
    return 0


def _finish_local():
    os.environ["MONGO_TARGET"] = "local"
    import database
    assert database.MONGO_TARGET == "local", "refusing to touch a non-local database"
    database.init_db_indexes()


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Fill the local MongoDB for MONGO_TARGET=local")
    parser.add_argument("--seed-only", action="store_true", help="seed without Atlas (offline)")
    parser.add_argument("--yes", action="store_true", help="overwrite a non-empty local database")
    args = parser.parse_args()
    sys.exit(seed_offline() if args.seed_only else copy_from_atlas(args.yes))
