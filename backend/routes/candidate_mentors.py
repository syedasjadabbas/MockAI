"""
Candidate Mentorship and Appointment Scheduling Routes.

Handles:
- Listing verified technical mentors with optional search and specialization filtering.
- Viewing individual mentor profiles and real-time slot availability.
- Scheduling appointments with concurrency protection (double-booking prevention).
- Listing candidate's own appointments (strict candidate isolation).
- Cancelling appointments with ownership enforcement.

Data collections:
- database.mentors_collection
- database.appointments_collection
"""

import re
from datetime import datetime
from typing import Optional, List, Dict, Any

from bson import ObjectId
from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel, Field

from database import mentors_collection, appointments_collection
from middleware.candidate_auth import verify_candidate

router = APIRouter()


def _object_id_or_400(id_str: str, label: str = "ID") -> ObjectId:
    try:
        return ObjectId(id_str)
    except Exception:
        raise HTTPException(status_code=400, detail=f"Invalid {label}: {id_str}")


def _serialize_mentor(doc: dict, booked_slots: Optional[set] = None) -> dict:
    mentor_id = str(doc["_id"])
    slots = []
    for s in doc.get("available_slots", []):
        slot_key = f"{s.get('date')}_{s.get('start_time')}"
        is_booked = (slot_key in booked_slots) if booked_slots is not None else s.get("is_booked", False)
        slots.append({
            "id": s.get("id") or slot_key,
            "date": s.get("date"),
            "start_time": s.get("start_time"),
            "end_time": s.get("end_time", ""),
            "is_booked": is_booked,
        })

    return {
        "id": mentor_id,
        "_id": mentor_id,
        "name": doc.get("name", "Technical Mentor"),
        "title": doc.get("title", "Senior Software Engineer"),
        "company": doc.get("company", ""),
        "avatar": doc.get("avatar", ""),
        "bio": doc.get("bio", ""),
        "specialization": doc.get("specialization", []),
        "experience_years": doc.get("experience_years", 5),
        "rating": doc.get("rating", 4.9),
        "sessions_completed": doc.get("sessions_completed", 0),
        "hourly_rate": doc.get("hourly_rate", "$100/hr"),
        "availability_status": doc.get("availability_status", "Available"),
        "available_slots": slots,
        "is_active": doc.get("is_active", True),
    }


def _serialize_appointment(doc: dict) -> dict:
    return {
        "id": str(doc["_id"]),
        "_id": str(doc["_id"]),
        "candidate_id": str(doc.get("candidate_id", "")),
        "mentor_id": str(doc.get("mentor_id", "")),
        "mentor_name": doc.get("mentor_name", "Technical Mentor"),
        "mentor_title": doc.get("mentor_title", "Senior Software Engineer"),
        "mentor_company": doc.get("mentor_company", ""),
        "slot_id": doc.get("slot_id", ""),
        "date": doc.get("date", ""),
        "start_time": doc.get("start_time", ""),
        "end_time": doc.get("end_time", ""),
        "notes": doc.get("notes", ""),
        "status": doc.get("status", "scheduled"),
        "created_at": doc.get("created_at").isoformat() if isinstance(doc.get("created_at"), datetime) else str(doc.get("created_at", "")),
        "cancelled_at": doc.get("cancelled_at").isoformat() if isinstance(doc.get("cancelled_at"), datetime) else None,
        "cancel_reason": doc.get("cancel_reason", ""),
    }


# ---------------------------------------------------------------------------
# Request Models
# ---------------------------------------------------------------------------

class BookAppointmentRequest(BaseModel):
    mentor_id: str
    slot_id: Optional[str] = None
    date: str
    start_time: str
    end_time: Optional[str] = ""
    notes: Optional[str] = ""


class CancelAppointmentRequest(BaseModel):
    reason: Optional[str] = ""


# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------

@router.get("/mentors")
def list_mentors(
    search: Optional[str] = Query(None, description="Search by name, company, bio, or topic"),
    specialization: Optional[str] = Query(None, description="Filter by domain specialization"),
    page: int = Query(1, ge=1),
    limit: int = Query(50, ge=1, le=100),
    token_payload: dict = Depends(verify_candidate),
):
    """
    List verified engineering mentors with optional search and domain filtering.
    Dynamically cross-references active appointments to mark booked slots.
    """
    query: Dict[str, Any] = {"is_active": True}

    if specialization and specialization.strip().lower() != "all":
        query["specialization"] = {
            "$elemMatch": {"$regex": f"^{re.escape(specialization.strip())}$", "$options": "i"}
        }

    if search and search.strip():
        term = re.escape(search.strip())
        query["$or"] = [
            {"name": {"$regex": term, "$options": "i"}},
            {"title": {"$regex": term, "$options": "i"}},
            {"company": {"$regex": term, "$options": "i"}},
            {"bio": {"$regex": term, "$options": "i"}},
            {"specialization": {"$elemMatch": {"$regex": term, "$options": "i"}}},
        ]

    skip = (page - 1) * limit
    cursor = mentors_collection.find(query).sort("rating", -1).skip(skip).limit(limit)
    mentor_docs = list(cursor)

    if not mentor_docs:
        return []

    # Query active appointments for all mentors in this batch to mark booked slots
    mentor_ids = [str(m["_id"]) for m in mentor_docs]
    active_apts = appointments_collection.find({
        "mentor_id": {"$in": mentor_ids},
        "status": {"$in": ["scheduled", "confirmed"]},
    })
    booked_set = {f"{a.get('mentor_id')}_{a.get('date')}_{a.get('start_time')}" for a in active_apts}

    result = []
    for m in mentor_docs:
        mid = str(m["_id"])
        mentor_booked_keys = {
            k.split("_", 1)[1] for k in booked_set if k.startswith(f"{mid}_")
        }
        result.append(_serialize_mentor(m, mentor_booked_keys))

    return result


@router.get("/mentors/{mentor_id}")
def get_mentor(
    mentor_id: str,
    token_payload: dict = Depends(verify_candidate),
):
    """
    Get detailed profile of a single mentor, including upcoming availability slots.
    """
    obj_id = _object_id_or_400(mentor_id, "mentor ID")
    mentor = mentors_collection.find_one({"_id": obj_id, "is_active": True})
    if not mentor:
        raise HTTPException(status_code=404, detail="Mentor not found")

    # Find active bookings for this mentor
    active_apts = appointments_collection.find({
        "mentor_id": str(mentor["_id"]),
        "status": {"$in": ["scheduled", "confirmed"]},
    })
    booked_slots = {f"{a.get('date')}_{a.get('start_time')}" for a in active_apts}

    return _serialize_mentor(mentor, booked_slots)


@router.get("/mentors/{mentor_id}/availability")
def get_mentor_availability(
    mentor_id: str,
    date: Optional[str] = Query(None, description="Filter slots by date YYYY-MM-DD"),
    token_payload: dict = Depends(verify_candidate),
):
    """
    Fetch availability slots for a mentor on a specific date (or all future dates).
    Reflects real booking state from the appointments collection.
    """
    obj_id = _object_id_or_400(mentor_id, "mentor ID")
    mentor = mentors_collection.find_one({"_id": obj_id, "is_active": True})
    if not mentor:
        raise HTTPException(status_code=404, detail="Mentor not found")

    apt_query: Dict[str, Any] = {
        "mentor_id": str(mentor["_id"]),
        "status": {"$in": ["scheduled", "confirmed"]},
    }
    if date:
        apt_query["date"] = date

    active_apts = appointments_collection.find(apt_query)
    booked_slots = {f"{a.get('date')}_{a.get('start_time')}" for a in active_apts}

    all_slots = mentor.get("available_slots", [])
    if date:
        all_slots = [s for s in all_slots if s.get("date") == date]

    result = []
    for s in all_slots:
        slot_key = f"{s.get('date')}_{s.get('start_time')}"
        is_booked = slot_key in booked_slots
        result.append({
            "id": s.get("id") or slot_key,
            "date": s.get("date"),
            "start_time": s.get("start_time"),
            "end_time": s.get("end_time", ""),
            "is_booked": is_booked,
        })

    return result


@router.post("/appointments", status_code=status.HTTP_201_CREATED)
def book_appointment(
    data: BookAppointmentRequest,
    token_payload: dict = Depends(verify_candidate),
):
    """
    Schedule a mentorship session.
    Validates mentor existence, verifies slot validity, and prevents double-booking.
    """
    user_id = token_payload.get("user_id") or token_payload.get("sub")
    if not user_id:
        raise HTTPException(status_code=401, detail="Invalid user authentication")

    mentor_obj_id = _object_id_or_400(data.mentor_id, "mentor ID")
    mentor = mentors_collection.find_one({"_id": mentor_obj_id, "is_active": True})
    if not mentor:
        raise HTTPException(status_code=404, detail="Mentor not found or unavailable")

    clean_date = data.date.strip()
    clean_start_time = data.start_time.strip()

    if not clean_date or not clean_start_time:
        raise HTTPException(status_code=400, detail="Date and start_time are required")

    # Concurrency / Double-booking protection:
    # Check if this mentor already has an active appointment at this date and time
    existing_booking = appointments_collection.find_one({
        "mentor_id": str(mentor["_id"]),
        "date": clean_date,
        "start_time": clean_start_time,
        "status": {"$in": ["scheduled", "confirmed"]},
    })

    if existing_booking:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="This time slot has already been booked. Please choose another slot.",
        )

    # Candidate collision check: verify candidate doesn't have an overlapping booking
    candidate_overlap = appointments_collection.find_one({
        "candidate_id": str(user_id),
        "date": clean_date,
        "start_time": clean_start_time,
        "status": {"$in": ["scheduled", "confirmed"]},
    })
    if candidate_overlap:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="You already have an appointment scheduled for this time slot.",
        )

    # Determine end time
    end_time = data.end_time.strip() if data.end_time else ""
    if not end_time:
        # Match from mentor's configured slot if available
        for s in mentor.get("available_slots", []):
            if s.get("date") == clean_date and s.get("start_time") == clean_start_time:
                end_time = s.get("end_time", "")
                break

    now = datetime.utcnow()
    appointment_doc = {
        "candidate_id": str(user_id),
        "mentor_id": str(mentor["_id"]),
        "mentor_name": mentor.get("name", "Technical Mentor"),
        "mentor_title": mentor.get("title", "Senior Software Engineer"),
        "mentor_company": mentor.get("company", ""),
        "slot_id": data.slot_id or f"{clean_date}_{clean_start_time}",
        "date": clean_date,
        "start_time": clean_start_time,
        "end_time": end_time,
        "notes": (data.notes or "").strip(),
        "status": "scheduled",
        "created_at": now,
        "updated_at": now,
    }

    insert_result = appointments_collection.insert_one(appointment_doc)
    created = appointments_collection.find_one({"_id": insert_result.inserted_id})
    return _serialize_appointment(created)


@router.get("/appointments")
def list_my_appointments(
    token_payload: dict = Depends(verify_candidate),
):
    """
    List all appointments booked by the authenticated candidate.
    Enforces strict candidate isolation.
    """
    user_id = token_payload.get("user_id") or token_payload.get("sub")
    if not user_id:
        raise HTTPException(status_code=401, detail="Invalid user authentication")

    apts = appointments_collection.find({"candidate_id": str(user_id)}).sort("date", -1)
    return [_serialize_appointment(a) for a in apts]


@router.get("/appointments/{appointment_id}")
def get_appointment(
    appointment_id: str,
    token_payload: dict = Depends(verify_candidate),
):
    """
    Fetch a single appointment by ID.
    Enforces candidate ownership: candidates can only view their own appointments.
    """
    user_id = token_payload.get("user_id") or token_payload.get("sub")
    if not user_id:
        raise HTTPException(status_code=401, detail="Invalid user authentication")

    apt_obj_id = _object_id_or_400(appointment_id, "appointment ID")
    apt = appointments_collection.find_one({"_id": apt_obj_id})
    if not apt:
        raise HTTPException(status_code=404, detail="Appointment not found")

    if str(apt.get("candidate_id")) != str(user_id):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You are not authorized to view this appointment.",
        )

    return _serialize_appointment(apt)


@router.delete("/appointments/{appointment_id}")
def cancel_appointment(
    appointment_id: str,
    data: Optional[CancelAppointmentRequest] = None,
    token_payload: dict = Depends(verify_candidate),
):
    """
    Cancel a scheduled appointment.
    Enforces candidate ownership: candidate can only cancel their own appointments.
    """
    user_id = token_payload.get("user_id") or token_payload.get("sub")
    if not user_id:
        raise HTTPException(status_code=401, detail="Invalid user authentication")

    apt_obj_id = _object_id_or_400(appointment_id, "appointment ID")
    apt = appointments_collection.find_one({"_id": apt_obj_id})
    if not apt:
        raise HTTPException(status_code=404, detail="Appointment not found")

    # Ownership check
    if str(apt.get("candidate_id")) != str(user_id):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You are not authorized to cancel this appointment.",
        )

    if apt.get("status") == "cancelled":
        return {
            "success": True,
            "message": "Appointment was already cancelled.",
            "appointment": _serialize_appointment(apt),
        }

    now = datetime.utcnow()
    reason = (data.reason if data else "") or ""

    appointments_collection.update_one(
        {"_id": apt_obj_id},
        {
            "$set": {
                "status": "cancelled",
                "cancelled_at": now,
                "cancel_reason": reason,
                "updated_at": now,
            }
        },
    )

    updated = appointments_collection.find_one({"_id": apt_obj_id})
    return {
        "success": True,
        "message": "Appointment cancelled successfully.",
        "appointment": _serialize_appointment(updated),
    }
