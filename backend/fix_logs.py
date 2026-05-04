from pymongo import MongoClient
import os
from dotenv import load_dotenv

load_dotenv()

MONGO_URI = os.getenv("MONGO_URI", "mongodb://localhost:27017")
DATABASE_NAME = os.getenv("DATABASE_NAME", "admin_panel")
client = MongoClient(MONGO_URI)
db = client[DATABASE_NAME]
admin_logs_collection = db.admin_logs

def update_logs():
    updates = {
        "Admin logged in": "LOGIN",
        "User deleted": "DELETE_USER",
        "Interview deleted": "DELETE_INTERVIEW",
        "Password changed": "UPDATE",
        "Interview reviewed": "UPDATE",
        "Created User": "CREATE_USER",
        "Admin Password": "UPDATE"
    }
    
    for old_action, new_action in updates.items():
        result = admin_logs_collection.update_many(
            {"action": old_action},
            {"$set": {"action": new_action}}
        )
        print(f"Updated {result.modified_count} logs from '{old_action}' to '{new_action}'")

if __name__ == "__main__":
    update_logs()
    print("Log standardization complete.")
