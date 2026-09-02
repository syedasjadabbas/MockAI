from datetime import datetime
from database import users_collection
from utils.auth import hash_password

email = "e2e.candidate@mockai.com"
user = users_collection.find_one({"email": email})
if not user:
    users_collection.insert_one({
        "name": "E2E Test Candidate",
        "email": email,
        "password": hash_password("Candidate123!"),
        "role": "user",
        "is_verified": True,
        "created_at": datetime.utcnow(),
    })
    print(f"Created candidate {email}")
else:
    users_collection.update_one(
        {"email": email},
        {"$set": {
            "name": "E2E Test Candidate",
            "password": hash_password("Candidate123!"),
            "role": "user",
            "is_verified": True,
        }}
    )
    print(f"Updated candidate {email}")
