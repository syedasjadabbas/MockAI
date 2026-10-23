import os
import sys
from pymongo import MongoClient
from pymongo.errors import ConnectionFailure, OperationFailure, PyMongoError
from dotenv import load_dotenv

# Load environment variables reliably from backend directory
env_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), ".env")
load_dotenv(dotenv_path=env_path)

# Every entry point (server, worker scripts, tests) imports this module early:
# keep Hugging Face offline when the profile's models are already cached.
try:
    from services.hf_cache import prefer_offline_hub
    prefer_offline_hub()
except Exception:
    pass

# Database target switch:
#   MONGO_TARGET=atlas  (default) - MongoDB Atlas cloud cluster from MONGO_URI
#   MONGO_TARGET=local            - a local mongod (LOCAL_MONGO_URI), for
#                                   offline demos or networks that block
#                                   Atlas's port 27017. Fill it from Atlas with
#                                   `python sync_local_db.py`.
ATLAS_MONGO_URI = os.getenv("MONGO_URI") or os.getenv("MONGODB_URI") or "mongodb://localhost:27017"
LOCAL_MONGO_URI = os.getenv("LOCAL_MONGO_URI", "mongodb://127.0.0.1:27017")
MONGO_TARGET = "local" if (os.getenv("MONGO_TARGET") or "").strip().lower() == "local" else "atlas"
MONGO_URI = LOCAL_MONGO_URI if MONGO_TARGET == "local" else ATLAS_MONGO_URI

# Automated test scripts (backend/test_*.py, or TESTING=1) use a separate
# database so test users, interviews and surveys never appear in the real
# Admin dashboard. Override its name with TEST_DATABASE_NAME. Seed it once
# with `python setup_test_db.py`.
IS_TEST_RUN = os.getenv("TESTING") == "1" or os.path.basename(sys.argv[0] or "").startswith("test_")
_REAL_DATABASE_NAME = os.getenv("DATABASE_NAME", "mockai")
DATABASE_NAME = (
    os.getenv("TEST_DATABASE_NAME", f"{_REAL_DATABASE_NAME}_test") if IS_TEST_RUN else _REAL_DATABASE_NAME
)

import time
from typing import Any, Optional, Callable

# Simple fast thread-safe in-memory cache with TTL
_cache_store = {}
_cache_ttl = {}

def get_cached(key: str) -> Optional[Any]:
    now = time.time()
    if key in _cache_store:
        if now < _cache_ttl.get(key, 0):
            return _cache_store[key]
        else:
            _cache_store.pop(key, None)
            _cache_ttl.pop(key, None)
    return None

def set_cached(key: str, value: Any, ttl_seconds: int = 30):
    _cache_store[key] = value
    _cache_ttl[key] = time.time() + ttl_seconds

def invalidate_cache(pattern: str = ""):
    global _cache_store, _cache_ttl
    if not pattern:
        _cache_store.clear()
        _cache_ttl.clear()
    else:
        keys_to_del = [k for k in _cache_store.keys() if pattern in k]
        for k in keys_to_del:
            _cache_store.pop(k, None)
            _cache_ttl.pop(k, None)

# Ensure reliable DNS resolution for MongoDB Atlas SRV records
try:
    import dns.resolver
    try:
        _default_res = dns.resolver.get_default_resolver()
        for _ns in ['8.8.8.8', '1.1.1.1']:
            if _ns not in _default_res.nameservers:
                _default_res.nameservers.insert(0, _ns)
    except Exception:
        dns.resolver.default_resolver = dns.resolver.Resolver(configure=False)
        dns.resolver.default_resolver.nameservers = ['8.8.8.8', '1.1.1.1']
except Exception:
    pass

try:
    # Create MongoDB client with optimized connection pooling
    client = MongoClient(
        MONGO_URI,
        serverSelectionTimeoutMS=12000,
        connectTimeoutMS=10000,
        socketTimeoutMS=10000,
        maxPoolSize=50,
        minPoolSize=5,
        maxIdleTimeMS=45000,
        retryWrites=True
    )
    # Verify the connection
    client.admin.command('ping')
except (ConnectionFailure, OperationFailure, PyMongoError, Exception) as e:
    print(f"MongoDB connection notice: {e}")
    client = MongoClient(MONGO_URI, serverSelectionTimeoutMS=12000, connectTimeoutMS=10000)

# Database instance
db = client[DATABASE_NAME]

# Collections
users_collection = db["users"]
interviews_collection = db["interviews"]
admin_logs_collection = db["admin_logs"]
admins_collection = db["admins"]
admin_collection = admins_collection  # alias for backward compatibility
otps_collection = db["otps"]
categories_collection = db["categories"]
questions_collection = db["questions"]
mentors_collection = db["mentors"]
appointments_collection = db["appointments"]
surveys_collection = db["surveys"]  # Objective 7 - user satisfaction / accuracy survey

def init_db_indexes():
    """
    Ensure all critical MongoDB indexes are created in the background
    to guarantee sub-millisecond query execution.
    """
    try:
        # Users indexes
        users_collection.create_index([("email", 1)], unique=True, sparse=True, background=True)
        users_collection.create_index([("role", 1)], background=True)
        users_collection.create_index([("created_at", -1)], background=True)
        users_collection.create_index([("role", 1), ("created_at", -1)], background=True)

        # Interviews indexes
        interviews_collection.create_index([("user_id", 1)], background=True)
        interviews_collection.create_index([("status", 1)], background=True)
        interviews_collection.create_index([("role", 1)], background=True)
        interviews_collection.create_index([("created_at", -1)], background=True)
        interviews_collection.create_index([("score", 1)], background=True)
        interviews_collection.create_index([("status", 1), ("created_at", -1)], background=True)
        interviews_collection.create_index([("role", 1), ("created_at", -1)], background=True)

        # Categories indexes
        categories_collection.create_index([("name", 1)], background=True)
        categories_collection.create_index([("status", 1)], background=True)
        categories_collection.create_index([("created_at", -1)], background=True)
        categories_collection.create_index([("status", 1), ("created_at", -1)], background=True)

        # Questions indexes
        questions_collection.create_index([("category_id", 1)], background=True)
        questions_collection.create_index([("status", 1)], background=True)
        questions_collection.create_index([("difficulty", 1)], background=True)
        questions_collection.create_index([("type", 1)], background=True)
        questions_collection.create_index([("created_at", -1)], background=True)
        questions_collection.create_index([("category_id", 1), ("status", 1)], background=True)

        # Admin logs indexes
        admin_logs_collection.create_index([("created_at", -1)], background=True)
        admin_logs_collection.create_index([("admin_email", 1)], background=True)
        admin_logs_collection.create_index([("action", 1)], background=True)

        # Admins indexes
        admins_collection.create_index([("email", 1)], unique=True, background=True)

        # Survey indexes (one survey per candidate per interview)
        surveys_collection.create_index([("interview_id", 1), ("user_id", 1)], unique=True, background=True)
        surveys_collection.create_index([("created_at", -1)], background=True)

        # Mentors indexes
        mentors_collection.create_index([("specialization", 1)], background=True)
        mentors_collection.create_index([("name", 1)], background=True)
        mentors_collection.create_index([("is_active", 1)], background=True)

        # Appointments indexes
        appointments_collection.create_index([("candidate_id", 1)], background=True)
        appointments_collection.create_index([("mentor_id", 1)], background=True)
        appointments_collection.create_index([("date", 1), ("start_time", 1)], background=True)
        appointments_collection.create_index([("mentor_id", 1), ("date", 1), ("start_time", 1)], background=True)
        appointments_collection.create_index([("status", 1)], background=True)
        appointments_collection.create_index([("mentor_id", 1), ("date", 1), ("start_time", 1), ("status", 1)], background=True)
        appointments_collection.create_index([("candidate_id", 1), ("date", 1), ("start_time", 1), ("status", 1)], background=True)
        print("Database indexes initialized successfully.")
    except Exception as e:
        print(f"Database index creation notice: {e}")

def serialize_mongo(document: dict) -> dict:
    """
    Converts MongoDB document to a JSON-ready object by stringifying _id.
    """
    if not document:
        return document
        
    doc = dict(document)
    if "_id" in doc:
        doc["_id"] = str(doc["_id"])
        
    return doc

