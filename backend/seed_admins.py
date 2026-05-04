import os
from dotenv import load_dotenv
from database import admins_collection
from utils.auth import hash_password
from datetime import datetime

load_dotenv()

def seed_admins():
    print("Clearing existing admins...")
    admins_collection.delete_many({})
    
    admins = [
        {
            "name": "Asjad Abbas",
            "email": "asjadabbaszaidi@gmail.com",
            "password": hash_password("admin123"),
            "role": "admin",
            "created_at": datetime.utcnow()
        },
        {
            "name": "Hassan Kazmi",
            "email": "hassankazmi2004@gmail.com",
            "password": hash_password("admin"),
            "role": "admin",
            "created_at": datetime.utcnow()
        }
    ]
    
    result = admins_collection.insert_many(admins)
    print(f"Inserted {len(result.inserted_ids)} admins successfully.")

if __name__ == "__main__":
    seed_admins()
