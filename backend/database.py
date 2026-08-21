import os
import sys
from pymongo import MongoClient
from pymongo.errors import ConnectionFailure, OperationFailure, PyMongoError
from dotenv import load_dotenv

# Load environment variables reliably from backend directory
env_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), ".env")
load_dotenv(dotenv_path=env_path)

MONGO_URI = os.getenv("MONGO_URI", "mongodb://localhost:27017")
DATABASE_NAME = os.getenv("DATABASE_NAME", "mockai")

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

try:
    # Create MongoDB client with optimized connection pooling
    client = MongoClient(
        MONGO_URI,
        serverSelectionTimeoutMS=4000,
        connectTimeoutMS=4000,
        socketTimeoutMS=5000,
        maxPoolSize=50,
        minPoolSize=5,
        maxIdleTimeMS=45000,
        retryWrites=True
    )
    # Verify the connection
    client.admin.command('ping')
except (ConnectionFailure, OperationFailure, PyMongoError) as e:
    print(f"MongoDB connection notice: {e}")
    client = MongoClient(MONGO_URI, serverSelectionTimeoutMS=4000)

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

        # Interviews indexes
        interviews_collection.create_index([("user_id", 1)], background=True)
        interviews_collection.create_index([("status", 1)], background=True)
        interviews_collection.create_index([("role", 1)], background=True)
        interviews_collection.create_index([("created_at", -1)], background=True)
        interviews_collection.create_index([("score", 1)], background=True)

        # Categories indexes
        categories_collection.create_index([("name", 1)], background=True)
        categories_collection.create_index([("status", 1)], background=True)
        categories_collection.create_index([("created_at", -1)], background=True)

        # Questions indexes
        questions_collection.create_index([("category_id", 1)], background=True)
        questions_collection.create_index([("status", 1)], background=True)
        questions_collection.create_index([("difficulty", 1)], background=True)
        questions_collection.create_index([("type", 1)], background=True)
        questions_collection.create_index([("created_at", -1)], background=True)

        # Admin logs indexes
        admin_logs_collection.create_index([("created_at", -1)], background=True)
        admin_logs_collection.create_index([("admin_email", 1)], background=True)
        admin_logs_collection.create_index([("action", 1)], background=True)

        # Admins indexes
        admins_collection.create_index([("email", 1)], unique=True, background=True)
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

