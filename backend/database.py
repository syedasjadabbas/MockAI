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

try:
    # Create MongoDB client with 5s timeout
    client = MongoClient(MONGO_URI, serverSelectionTimeoutMS=5000)
    # Verify the connection
    client.admin.command('ping')
except (ConnectionFailure, OperationFailure, PyMongoError) as e:
    print(f"MongoDB connection notice: {e}")
    client = MongoClient(MONGO_URI, serverSelectionTimeoutMS=5000)

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
