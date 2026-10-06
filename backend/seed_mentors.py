"""
Seed verified technical mentors into MongoDB mentors_collection.
Covers multiple MockAI domains:
- AI & Machine Learning
- Backend & Distributed Systems
- Frontend Development
- Engineering Leadership & Behavioral
- Data Science & Analytics
"""

from datetime import datetime, timedelta
from database import mentors_collection


def get_default_mentors():
    today = datetime.utcnow().date()
    d1 = (today + timedelta(days=1)).isoformat()
    d2 = (today + timedelta(days=2)).isoformat()
    d3 = (today + timedelta(days=3)).isoformat()
    d4 = (today + timedelta(days=4)).isoformat()
    d5 = (today + timedelta(days=5)).isoformat()

    return [
        {
            "name": "Dr. Elena Rostova",
            "title": "Staff ML Engineer & AI System Architect",
            "company": "Google DeepMind",
            "avatar": "",
            "bio": "Staff Machine Learning Engineer with 12+ years designing foundation models and production inference pipelines. Expert in technical interview coaching, behavioral depth, and system design for AI workloads.",
            "specialization": ["AI & Machine Learning", "Python", "Deep Learning", "System Design"],
            "experience_years": 12,
            "rating": 4.98,
            "sessions_completed": 142,
            "hourly_rate": "$140/hr",
            "availability_status": "Available",
            "is_active": True,
            "available_slots": [
                {"id": f"elena_{d1}_10am", "date": d1, "start_time": "10:00 AM", "end_time": "11:00 AM", "is_booked": False},
                {"id": f"elena_{d1}_02pm", "date": d1, "start_time": "02:00 PM", "end_time": "03:00 PM", "is_booked": False},
                {"id": f"elena_{d2}_11am", "date": d2, "start_time": "11:00 AM", "end_time": "12:00 PM", "is_booked": False},
                {"id": f"elena_{d3}_04pm", "date": d3, "start_time": "04:00 PM", "end_time": "05:00 PM", "is_booked": False},
            ],
            "created_at": datetime.utcnow(),
        },
        {
            "name": "Marcus Vance",
            "title": "Principal Distributed Systems Engineer",
            "company": "Amazon Web Services",
            "avatar": "",
            "bio": "Principal Infrastructure Architect specializing in high-throughput distributed systems, fault-tolerant consensus, and microservice resilience. Over 14 years conducting L6/L7 technical bar-raiser interviews.",
            "specialization": ["Backend & Distributed Systems", "Go", "Cloud & DevOps", "System Design"],
            "experience_years": 14,
            "rating": 4.95,
            "sessions_completed": 188,
            "hourly_rate": "$150/hr",
            "availability_status": "Available",
            "is_active": True,
            "available_slots": [
                {"id": f"marcus_{d1}_09am", "date": d1, "start_time": "09:00 AM", "end_time": "10:00 AM", "is_booked": False},
                {"id": f"marcus_{d2}_01pm", "date": d2, "start_time": "01:00 PM", "end_time": "02:00 PM", "is_booked": False},
                {"id": f"marcus_{d3}_10am", "date": d3, "start_time": "10:00 AM", "end_time": "11:00 AM", "is_booked": False},
                {"id": f"marcus_{d4}_03pm", "date": d4, "start_time": "03:00 PM", "end_time": "04:00 PM", "is_booked": False},
            ],
            "created_at": datetime.utcnow(),
        },
        {
            "name": "Sarah Jenkins",
            "title": "Staff Frontend Architect",
            "company": "Stripe",
            "avatar": "",
            "bio": "Staff Frontend Architect focused on large-scale web applications, state management architectures, browser rendering performance, and accessible UI engineering. Veteran hiring panelist.",
            "specialization": ["Frontend Development", "React", "TypeScript", "Web Performance"],
            "experience_years": 9,
            "rating": 4.92,
            "sessions_completed": 115,
            "hourly_rate": "$120/hr",
            "availability_status": "Available",
            "is_active": True,
            "available_slots": [
                {"id": f"sarah_{d1}_11am", "date": d1, "start_time": "11:00 AM", "end_time": "12:00 PM", "is_booked": False},
                {"id": f"sarah_{d2}_03pm", "date": d2, "start_time": "03:00 PM", "end_time": "04:00 PM", "is_booked": False},
                {"id": f"sarah_{d3}_01pm", "date": d3, "start_time": "01:00 PM", "end_time": "02:00 PM", "is_booked": False},
                {"id": f"sarah_{d5}_10am", "date": d5, "start_time": "10:00 AM", "end_time": "11:00 AM", "is_booked": False},
            ],
            "created_at": datetime.utcnow(),
        },
        {
            "name": "David Okafor",
            "title": "Engineering Director & Career Coach",
            "company": "Meta",
            "avatar": "",
            "bio": "Engineering Director with 16+ years of leadership at Tier-1 tech organizations. Specializes in behavioral interview mastery, executive presence, cross-functional conflict resolution, and leadership framing.",
            "specialization": ["Engineering Leadership", "Behavioral", "System Design", "Executive Presence"],
            "experience_years": 16,
            "rating": 4.99,
            "sessions_completed": 230,
            "hourly_rate": "$160/hr",
            "availability_status": "Available",
            "is_active": True,
            "available_slots": [
                {"id": f"david_{d1}_04pm", "date": d1, "start_time": "04:00 PM", "end_time": "05:00 PM", "is_booked": False},
                {"id": f"david_{d2}_05pm", "date": d2, "start_time": "05:00 PM", "end_time": "06:00 PM", "is_booked": False},
                {"id": f"david_{d4}_02pm", "date": d4, "start_time": "02:00 PM", "end_time": "03:00 PM", "is_booked": False},
            ],
            "created_at": datetime.utcnow(),
        },
        {
            "name": "Priya Sharma",
            "title": "Senior Data & ML Infrastructure Engineer",
            "company": "Netflix",
            "avatar": "",
            "bio": "Senior ML Platform Engineer building real-time telemetry processing and recommendation data pipelines. Mentoring candidates on end-to-end data systems, coding clarity, and interview composure.",
            "specialization": ["Data Science & Analytics", "AI & Machine Learning", "Python", "Distributed Systems"],
            "experience_years": 8,
            "rating": 4.91,
            "sessions_completed": 94,
            "hourly_rate": "$130/hr",
            "availability_status": "Available",
            "is_active": True,
            "available_slots": [
                {"id": f"priya_{d1}_01pm", "date": d1, "start_time": "01:00 PM", "end_time": "02:00 PM", "is_booked": False},
                {"id": f"priya_{d3}_03pm", "date": d3, "start_time": "03:00 PM", "end_time": "04:00 PM", "is_booked": False},
                {"id": f"priya_{d4}_11am", "date": d4, "start_time": "11:00 AM", "end_time": "12:00 PM", "is_booked": False},
            ],
            "created_at": datetime.utcnow(),
        },
    ]


def ensure_default_mentors(force_refresh: bool = False):
    """
    Ensure the mentors collection has seed mentors.
    If empty or force_refresh is True, populate with verified mentors.
    """
    count = mentors_collection.count_documents({})
    if count == 0 or force_refresh:
        mentors = get_default_mentors()
        for mentor in mentors:
            mentors_collection.update_one(
                {"name": mentor["name"]},
                {"$set": mentor},
                upsert=True,
            )
        print(f"[SeedMentors] Seeded {len(mentors)} mentors into database.")
        return len(mentors)
    return count


if __name__ == "__main__":
    ensure_default_mentors(force_refresh=True)
