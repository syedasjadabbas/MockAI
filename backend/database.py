from pymongo import MongoClient
import os

MONGO_URI = "mongodb+srv://asjadabbaszaidi_db_user:admin123@cluster0.dn3rofl.mongodb.net/mockai"
client = MongoClient(MONGO_URI)
db = client["mockai"]

admin_collection = db["admin"]
users_collection = db["users"]
interviews_collection = db["interviews"]
responses_collection = db["responses"]
analysis_collection = db["analysis"]
interview_result_collection = db["interview_result"]
admin_log_collection = db["admin_log"]
