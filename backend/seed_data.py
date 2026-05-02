import random
from datetime import datetime, timedelta
from database import users_collection, interviews_collection
from utils.auth import hash_password

def seed_data():
    print("Starting seed process...")
    
    users_data = [
        {"name": "Ali Khan", "email": "ali.khan@example.pk"},
        {"name": "Ahmed Raza", "email": "ahmed.raza@example.pk"},
        {"name": "Usman Tariq", "email": "usman.tariq@example.pk"},
        {"name": "Hassan Ali", "email": "hassan.ali@example.pk"},
        {"name": "Bilal Ahmed", "email": "bilal.ahmed@example.pk"},
        {"name": "Zain Abbas", "email": "zain.abbas@example.pk"},
        {"name": "Hamza Shah", "email": "hamza.shah@example.pk"},
        {"name": "Saad Malik", "email": "saad.malik@example.pk"},
        {"name": "Farhan Qureshi", "email": "farhan.qureshi@example.pk"},
        {"name": "Umar Farooq", "email": "umar.farooq@example.pk"},
    ]
    
    # Pairs of (Role, Transcript) to ensure realistic text per role
    roles_transcripts = [
        # Tech
        ("Frontend Developer", "Q: Explain React Hooks. A: Candidate demonstrated excellent understanding of useState and useEffect but struggled slightly with useMemo."),
        ("Backend Developer", "Q: How do you design a RESTful API? A: Strong understanding of endpoints and database indexing. Needs to improve on microservices architecture concepts."),
        ("AI Engineer", "Q: Explain the difference between CNN and RNN. A: Very confident in explaining neural networks. Demonstrated good practical model deployment skills."),
        ("Data Analyst", "Q: How do you handle missing data? A: Explained imputation well. Good knowledge of SQL and Pandas, though visualization concepts were basic."),
        # Non-tech
        ("CSS Candidate (Central Superior Services, Pakistan)", "Q: What is the significance of the 18th Amendment? A: Showed great analytical skills and deep knowledge of constitutional history. Very articulate."),
        ("Graphic Designer", "Q: Walk me through your design process. A: Creative problem solver. Walked through the process clearly, though color theory concepts were a bit rushed."),
        ("Teacher", "Q: How do you handle disruptive students? A: Excellent communication and patience. Lesson plan demonstration was engaging and well-structured."),
        ("Lecturer", "Q: Explain a complex topic to a beginner. A: Delivered a complex topic with clarity. Strong academic background and great presentation skills."),
        ("HR Manager", "Q: How do you handle a conflict between two employees? A: Handled the conflict resolution scenario perfectly. Showed deep understanding of employee relations and empathy."),
        ("Customer Support", "Q: Deal with an angry customer demanding a refund. A: Very empathetic tone. Managed the angry-customer simulation professionally without getting flustered."),
        ("Sales Executive", "Q: Sell me this pen. A: Great persuasion skills. Confidently closed the mock sale and handled objections smoothly.")
    ]
    
    statuses = ["Completed", "In Progress", "Pending"]
    
    # Clear previous seed data for these exact users to prevent clutter
    print("Clearing old seed data...")
    users_collection.delete_many({"role": {"$ne": "admin"}})
    interviews_collection.delete_many({})

    user_ids = []
    
    # 1. Seed Users
    for u_data in users_data:
        new_user = {
            "name": u_data["name"],
            "email": u_data["email"],
            "password": hash_password("password123"),
            "role": "user",
            "created_at": datetime.utcnow() - timedelta(days=random.randint(1, 30))
        }
        result = users_collection.insert_one(new_user)
        user_ids.append((result.inserted_id, u_data["name"]))
        print(f"Inserted user {u_data['name']}")

    # 2. Seed Interviews
    print("\nProcessing interviews...")
    interviews_inserted = 0
    
    for user_id, user_name in user_ids:
        # Give each user 2 to 3 interviews
        num_interviews = random.randint(2, 3)
        for _ in range(num_interviews):
            role, transcript = random.choice(roles_transcripts)
            status = random.choice(statuses)
            
            # If not completed, score/confidence/stress might not be applicable or 0, but for mock data we can leave them
            # Let's widen the score range to trigger the < 50 case (35-95)
            score = random.randint(40, 95) if status == "Completed" else None
            
            interview = {
                "user_id": str(user_id),
                "role": role,
                "status": status,
                "score": score,
                "confidence": random.randint(50, 90) if status == "Completed" else None,
                "stress": random.randint(10, 90) if status == "Completed" else None,
                "transcript": transcript,
                # Randomize strictly to make sure recent sorting mixes different domains
                "created_at": datetime.utcnow() - timedelta(days=random.randint(0, 10), hours=random.randint(1, 24))
            }
            interviews_collection.insert_one(interview)
            interviews_inserted += 1
            
    print(f"\nSeed process complete. Inserted {len(user_ids)} users and {interviews_inserted} interviews.")

if __name__ == "__main__":
    seed_data()
