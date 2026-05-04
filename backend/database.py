import os
import sys
from pymongo import MongoClient
from pymongo.errors import ConnectionFailure
from dotenv import load_dotenv

# Load environment variables from .env
load_dotenv()

MONGO_URI = os.getenv("MONGO_URI", "mongodb://localhost:27017")
DATABASE_NAME = os.getenv("DATABASE_NAME", "admin_panel")

try:
    # Create MongoDB client
    client = MongoClient(MONGO_URI, serverSelectionTimeoutMS=5000)
    # Verify the connection
    client.admin.command('ping')
except ConnectionFailure as e:
    print(f"MongoDB connection failed: {e}")
    sys.exit(1)

# Database instance
db = client[DATABASE_NAME]

# Collections
users_collection = db["users"]
interviews_collection = db["interviews"]
admin_logs_collection = db["admin_logs"]
admins_collection = db["admins"]
otps_collection = db["otps"]

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
