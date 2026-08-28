from database import admins_collection
from utils.auth import hash_password
from datetime import datetime

def seed_admin():
    email = "admin@mockai.com"
    raw_password = "admin123"
    role = "admin"

    existing_user = admins_collection.find_one({"email": email})
    
    if not existing_user:
        hashed_pw = hash_password(raw_password)
        admin_document = {
            "email": email,
            "password": hashed_pw,
            "role": role,
            "name": "System Admin",
            "created_at": datetime.utcnow()
        }
        admins_collection.insert_one(admin_document)
        print(f"Successfully inserted default admin user: {email}")
    else:
        print(f"Admin user already exists: {email}")

if __name__ == "__main__":
    seed_admin()

