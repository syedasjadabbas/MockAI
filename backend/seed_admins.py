import os
from dotenv import load_dotenv
from database import admins_collection
from utils.auth import hash_password
from datetime import datetime

load_dotenv()

DEFAULT_ADMINS = [
    {
        "name": "System Admin",
        "email": "admin@mockai.com",
        "password": "admin123",
        "role": "admin",
    },
    {
        "name": "Asjad Abbas",
        "email": "asjadabbaszaidi@gmail.com",
        "password": "admin123",
        "role": "admin",
    },
    {
        "name": "Hassan Kazmi",
        "email": "hassankazmi2004@gmail.com",
        "password": "admin",
        "role": "admin",
    },
]

def seed_admins():
    print("Checking and ensuring standard admin accounts...")
    inserted_count = 0
    for adm in DEFAULT_ADMINS:
        email = adm["email"].strip().lower()
        existing = admins_collection.find_one({"email": email})
        if not existing:
            doc = {
                "name": adm["name"],
                "email": email,
                "password": hash_password(adm["password"]),
                "role": adm["role"],
                "created_at": datetime.utcnow(),
            }
            admins_collection.insert_one(doc)
            inserted_count += 1
            print(f"Created admin account: {email}")
        else:
            if existing.get("role") != "admin":
                admins_collection.update_one(
                    {"_id": existing["_id"]},
                    {"$set": {"role": "admin"}}
                )
            print(f"Admin account already exists: {email}")
            
    print(f"Admin synchronization complete. {inserted_count} new admin(s) added.")

if __name__ == "__main__":
    seed_admins()

