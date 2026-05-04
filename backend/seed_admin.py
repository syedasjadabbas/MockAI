from database import admins_collection
from utils.auth import hash_password

def seed_admin():
    email = "admin@mockai.com"
    raw_password = "admin123" # Set a default password
    role = "admin"

    # Check if user already exists to avoid duplicates
    existing_user = admins_collection.find_one({"email": email})
    
    if existing_user:
        print(f"User with email {email} already exists. Deleting it.")
        admins_collection.delete_one({"email": email})

    # Hash the password using the utility function we created
    hashed_pw = hash_password(raw_password)

    # Prepare the admin document
    admin_document = {
        "email": email,
        "password": hashed_pw,
        "role": role,
        "name": "System Admin"
    }

    # Insert into the database
    admins_collection.insert_one(admin_document)
    print(f"Successfully inserted default admin user.")
    print(f"Email: {email}")
    print(f"Password: {raw_password}")

if __name__ == "__main__":
    seed_admin()
