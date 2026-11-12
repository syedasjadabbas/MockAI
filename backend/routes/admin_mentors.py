"""
Admin management of the mentorship module (Objective 6).

Administrators add, edit and deactivate mentors, publish their available
time slots and meeting link, and see every booking. Candidates only see
active mentors and slots that are still in the future.
"""
import re
from datetime import date, datetime
from typing import List, Optional

from bson import ObjectId
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field

from database import admins_collection, appointments_collection, mentors_collection, users_collection
from middleware.admin_auth import verify_admin

router = APIRouter()

TIME_RE = re.compile(r"^(0?[1-9]|1[0-2]):[0-5][0-9] (AM|PM)$")


def _oid(value: str, label: str) -> ObjectId:
    try:
        return ObjectId(value)
    except Exception:
        raise HTTPException(status_code=400, detail=f"Invalid {label}")


def _admin_email(token_payload: dict) -> str:
    try:
        admin = admins_collection.find_one({"_id": ObjectId(token_payload.get("user_id"))}, {"email": 1})
    except Exception:
        admin = None
    return (admin or {}).get("email", "Unknown Admin")


def _log(action: str, token_payload: dict, target: str):
    from routes.admin import log_action
    log_action(action, _admin_email(token_payload), target)


def _serialize(doc: dict) -> dict:
    booked = {
        (a.get("date"), a.get("start_time"))
        for a in appointments_collection.find(
            {"mentor_id": str(doc["_id"]), "status": {"$in": ["scheduled", "confirmed"]}}, {"date": 1, "start_time": 1}
        )
    }
    today = date.today().isoformat()
    slots = sorted(
        (
            {
                "id": s.get("id"),
                "date": s.get("date"),
                "start_time": s.get("start_time"),
                "end_time": s.get("end_time", ""),
                "is_booked": (s.get("date"), s.get("start_time")) in booked,
                "is_past": (s.get("date") or "") < today,
            }
            for s in doc.get("available_slots", [])
        ),
        key=lambda s: (s["date"] or "", s["start_time"] or ""),
    )
    return {
        "id": str(doc["_id"]),
        "name": doc.get("name", ""),
        "title": doc.get("title", ""),
        "company": doc.get("company", ""),
        "email": doc.get("email", ""),
        "meeting_link": doc.get("meeting_link", ""),
        "bio": doc.get("bio", ""),
        "specialization": doc.get("specialization", []),
        "experience_years": doc.get("experience_years", 0),
        "hourly_rate": doc.get("hourly_rate", ""),
        "is_active": doc.get("is_active", True),
        "sessions_completed": doc.get("sessions_completed", 0),
        "available_slots": slots,
    }


class MentorRequest(BaseModel):
    name: str = Field(..., min_length=2, max_length=80)
    title: str = Field("", max_length=120)
    company: str = Field("", max_length=80)
    email: Optional[str] = ""
    meeting_link: Optional[str] = ""
    bio: str = Field("", max_length=1000)
    specialization: List[str] = []
    experience_years: int = Field(0, ge=0, le=60)
    hourly_rate: str = Field("", max_length=30)
    is_active: bool = True


class SlotRequest(BaseModel):
    date: str  # YYYY-MM-DD
    start_time: str  # e.g. "10:00 AM"
    end_time: str


def _validate_mentor(data: MentorRequest) -> dict:
    email = (data.email or "").strip().lower()
    if email and not re.match(r"^[^@\s]+@[^@\s]+\.[^@\s]+$", email):
        raise HTTPException(status_code=400, detail="Mentor e-mail is not valid")
    link = (data.meeting_link or "").strip()
    if link and not link.startswith("https://"):
        raise HTTPException(status_code=400, detail="Meeting link must start with https://")
    return {
        "name": data.name.strip(),
        "title": data.title.strip(),
        "company": data.company.strip(),
        "email": email,
        "meeting_link": link,
        "bio": data.bio.strip(),
        "specialization": [s.strip() for s in data.specialization if s and s.strip()],
        "experience_years": data.experience_years,
        "hourly_rate": data.hourly_rate.strip(),
        "is_active": data.is_active,
        "availability_status": "Available" if data.is_active else "Unavailable",
    }


@router.get("/mentors")
def admin_list_mentors(token_payload: dict = Depends(verify_admin)):
    return [_serialize(m) for m in mentors_collection.find({}).sort("name", 1)]


@router.post("/mentors", status_code=status.HTTP_201_CREATED)
def admin_create_mentor(data: MentorRequest, token_payload: dict = Depends(verify_admin)):
    doc = _validate_mentor(data)
    doc.update({"available_slots": [], "rating": None, "sessions_completed": 0, "created_at": datetime.utcnow()})
    res = mentors_collection.insert_one(doc)
    _log("CREATE_MENTOR", token_payload, f"Mentor: {doc['name']}")
    return _serialize(mentors_collection.find_one({"_id": res.inserted_id}))


@router.put("/mentors/{mentor_id}")
def admin_update_mentor(mentor_id: str, data: MentorRequest, token_payload: dict = Depends(verify_admin)):
    oid = _oid(mentor_id, "mentor ID")
    if not mentors_collection.find_one({"_id": oid}):
        raise HTTPException(status_code=404, detail="Mentor not found")
    fields = _validate_mentor(data)
    fields["updated_at"] = datetime.utcnow()
    mentors_collection.update_one({"_id": oid}, {"$set": fields})
    _log("UPDATE_MENTOR", token_payload, f"Mentor: {fields['name']}")
    return _serialize(mentors_collection.find_one({"_id": oid}))


@router.delete("/mentors/{mentor_id}")
def admin_delete_mentor(mentor_id: str, token_payload: dict = Depends(verify_admin)):
    """Deletes a mentor with no upcoming bookings; otherwise asks the admin
    to deactivate instead, so booked candidates are not left without a session."""
    oid = _oid(mentor_id, "mentor ID")
    mentor = mentors_collection.find_one({"_id": oid})
    if not mentor:
        raise HTTPException(status_code=404, detail="Mentor not found")
    upcoming = appointments_collection.count_documents({
        "mentor_id": mentor_id, "status": {"$in": ["scheduled", "confirmed"]}, "date": {"$gte": date.today().isoformat()},
    })
    if upcoming:
        raise HTTPException(status_code=409, detail=f"This mentor has {upcoming} upcoming booking(s). Deactivate the mentor instead.")
    mentors_collection.delete_one({"_id": oid})
    _log("DELETE_MENTOR", token_payload, f"Mentor: {mentor.get('name')}")
    return {"deleted": True}


@router.post("/mentors/{mentor_id}/slots", status_code=status.HTTP_201_CREATED)
def admin_add_slot(mentor_id: str, data: SlotRequest, token_payload: dict = Depends(verify_admin)):
    oid = _oid(mentor_id, "mentor ID")
    mentor = mentors_collection.find_one({"_id": oid})
    if not mentor:
        raise HTTPException(status_code=404, detail="Mentor not found")
    try:
        slot_date = datetime.strptime(data.date.strip(), "%Y-%m-%d").date()
    except ValueError:
        raise HTTPException(status_code=400, detail="Date must be YYYY-MM-DD")
    if slot_date < date.today():
        raise HTTPException(status_code=400, detail="Slots must be today or later")
    start, end = data.start_time.strip().upper(), data.end_time.strip().upper()
    if not TIME_RE.match(start) or not TIME_RE.match(end):
        raise HTTPException(status_code=400, detail="Times must look like 10:00 AM")
    if datetime.strptime(end, "%I:%M %p") <= datetime.strptime(start, "%I:%M %p"):
        raise HTTPException(status_code=400, detail="End time must be after the start time")
    if any(s.get("date") == slot_date.isoformat() and s.get("start_time") == start for s in mentor.get("available_slots", [])):
        raise HTTPException(status_code=409, detail="This mentor already has a slot at that time")
    slot = {
        "id": f"{mentor_id}_{slot_date.isoformat()}_{start.replace(':', '').replace(' ', '').lower()}",
        "date": slot_date.isoformat(), "start_time": start, "end_time": end, "is_booked": False,
    }
    mentors_collection.update_one({"_id": oid}, {"$push": {"available_slots": slot}})
    _log("ADD_MENTOR_SLOT", token_payload, f"{mentor.get('name')}: {slot['date']} {start}")
    return _serialize(mentors_collection.find_one({"_id": oid}))


@router.delete("/mentors/{mentor_id}/slots/{slot_id}")
def admin_remove_slot(mentor_id: str, slot_id: str, token_payload: dict = Depends(verify_admin)):
    oid = _oid(mentor_id, "mentor ID")
    mentor = mentors_collection.find_one({"_id": oid})
    if not mentor:
        raise HTTPException(status_code=404, detail="Mentor not found")
    slot = next((s for s in mentor.get("available_slots", []) if s.get("id") == slot_id), None)
    if not slot:
        raise HTTPException(status_code=404, detail="Slot not found")
    if appointments_collection.find_one({"mentor_id": mentor_id, "date": slot["date"], "start_time": slot["start_time"],
                                         "status": {"$in": ["scheduled", "confirmed"]}}):
        raise HTTPException(status_code=409, detail="This slot is booked. Ask the candidate to cancel first.")
    mentors_collection.update_one({"_id": oid}, {"$pull": {"available_slots": {"id": slot_id}}})
    _log("REMOVE_MENTOR_SLOT", token_payload, f"{mentor.get('name')}: {slot['date']} {slot['start_time']}")
    return _serialize(mentors_collection.find_one({"_id": oid}))


@router.get("/appointments")
def admin_list_appointments(token_payload: dict = Depends(verify_admin)):
    apts = list(appointments_collection.find({}).sort([("date", -1), ("start_time", -1)]).limit(500))
    ids = {a.get("candidate_id") for a in apts if a.get("candidate_id")}
    names = {}
    valid = [ObjectId(i) for i in ids if ObjectId.is_valid(i)]
    for u in users_collection.find({"_id": {"$in": valid}}, {"name": 1, "email": 1}):
        names[str(u["_id"])] = u.get("name") or u.get("email") or "Candidate"
    return [{
        "id": str(a["_id"]),
        "candidate": names.get(a.get("candidate_id"), "Deleted account"),
        "mentor_name": a.get("mentor_name", ""),
        "date": a.get("date", ""),
        "start_time": a.get("start_time", ""),
        "end_time": a.get("end_time", ""),
        "status": a.get("status", ""),
        "notes": a.get("notes", ""),
        "notification": a.get("notification_status", ""),
    } for a in apts]
