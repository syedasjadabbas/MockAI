"""
Candidate Interview Session API.

Scope for this phase: category/question retrieval (read-only, candidate-safe
subset of the existing Question Bank), starting an interview, saving
per-question response metadata, completing an interview, and listing a
candidate's own interview history. Evaluation/AI (scoring, confidence,
stress, transcripts, feedback generation) is explicitly NOT implemented
here - those fields exist on the schema as reserved/nullable so this phase
never has to be revisited to "make room" for them, but nothing in this file
ever computes or fabricates a value for them.

Reuses existing infrastructure rather than duplicating it:
- database.py's categories_collection / questions_collection - the SAME
  Question Bank the Admin Panel manages. No second copy of this data
  exists; candidates only ever get a read-only, active-only, answer-key-
  stripped view of it.
- database.py's interviews_collection - already defined and already read
  by routes/admin.py (dashboard stats, /admin/interviews, /admin/results),
  which expects exactly {user_id, role, status, score, confidence, stress,
  created_at, transcript}. This module is the first real writer to that
  collection; every document it creates conforms to that existing shape
  (plus additional candidate/interview-flow fields Admin simply doesn't
  project) so nothing already built on the Admin side needs to change.
  Status values are the exact strings the Admin frontend already filters
  on ("In Progress" / "Completed" - see frontend/src/pages/Interviews.jsx),
  not new casing invented here.
- middleware/candidate_auth.py's verify_candidate for auth, identical
  pattern to routes/candidate.py.

Mounted at prefix /candidate in main.py, alongside routes/candidate.py's
router - same namespace, separate file for readability.
"""
from datetime import datetime
from typing import Optional

from bson import ObjectId
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel

from database import categories_collection, questions_collection, interviews_collection
from middleware.candidate_auth import verify_candidate

router = APIRouter()

# How many active questions make up one interview session. Not defined by
# the report or the existing Question Bank (which has no per-interview
# question count concept) - kept consistent with the number the frontend
# has used since the Candidate Panel frontend phase.
QUESTIONS_PER_INTERVIEW = 5


def _object_id_or_400(id_str: str, label: str = "ID") -> ObjectId:
    try:
        return ObjectId(id_str)
    except Exception:
        raise HTTPException(status_code=400, detail=f"Invalid {label}")


# ---------------------------------------------------------------------------
# Categories - FR07/FR08 (candidate-safe read of the existing Question Bank)
# ---------------------------------------------------------------------------

def _public_category(cat: dict) -> dict:
    return {
        "id": str(cat["_id"]),
        "name": cat.get("name"),
        "description": cat.get("description", ""),
        "icon": cat.get("icon", "Folder"),
    }


@router.get("/categories")
def list_candidate_categories(token_payload: dict = Depends(verify_candidate)):
    """
    Only active categories, and only the fields a candidate needs to pick
    one - no question_count/active_question_count admin bookkeeping, no
    archived categories, no admin CRUD surface.
    """
    categories = categories_collection.find({"status": "active"}).sort("created_at", 1)
    return [_public_category(c) for c in categories]


# ---------------------------------------------------------------------------
# Questions - FR08 (load predefined, consistent question sets)
# ---------------------------------------------------------------------------

def _public_question(q: dict) -> dict:
    """
    Deliberately excludes expected_answer (the admin-only answer key) and
    admin bookkeeping fields (created_at/updated_at/status) - a candidate
    taking the interview should never see the grading criteria.
    """
    return {
        "id": str(q["_id"]),
        "question_text": q.get("question_text"),
        "difficulty": q.get("difficulty", "Medium"),
        "type": q.get("type", "Technical"),
        "tags": q.get("tags", []),
    }


def _load_active_questions(category_id: str, limit: int = QUESTIONS_PER_INTERVIEW) -> list:
    """
    Deterministic order: ascending by _id (== insertion order), matching
    the existing Question Bank's own natural creation order. Not
    randomized - FR08-02 asks for consistent, predefined sets, not a
    shuffled quiz.
    """
    cursor = questions_collection.find(
        {"category_id": category_id, "status": "active"}
    ).sort("_id", 1).limit(limit)
    return list(cursor)


@router.get("/categories/{category_id}/questions")
def list_candidate_questions(category_id: str, token_payload: dict = Depends(verify_candidate)):
    cat_obj_id = _object_id_or_400(category_id, "category ID")
    category = categories_collection.find_one({"_id": cat_obj_id, "status": "active"})
    if not category:
        raise HTTPException(status_code=404, detail="Category not found")

    questions = _load_active_questions(category_id)
    return [_public_question(q) for q in questions]


# ---------------------------------------------------------------------------
# Interview record shaping
#
# Every document created here conforms to what routes/admin.py already
# expects to read from interviews_collection (user_id, role, status,
# score, confidence, stress, created_at, transcript), plus the fields the
# Candidate flow and the future Evaluation phase need. score/confidence/
# stress/transcript/evaluation start and remain null until a real
# evaluation backend exists - evaluation_status stays "pending_evaluation"
# the whole time this phase is active.
# ---------------------------------------------------------------------------

def _public_interview(doc: dict, include_questions: bool = True) -> dict:
    result = {
        "id": str(doc["_id"]),
        "role": doc.get("role"),
        "category_id": doc.get("category_id"),
        "type": doc.get("type"),
        "status": doc.get("status"),
        "evaluation_status": doc.get("evaluation_status", "pending_evaluation"),
        "score": doc.get("score"),
        "confidence": doc.get("confidence"),
        "stress": doc.get("stress"),
        "created_at": doc.get("created_at"),
        "completed_at": doc.get("completed_at"),
    }
    if include_questions:
        result["questions"] = doc.get("questions", [])
        result["responses"] = doc.get("responses", [])
    return result


# ---------------------------------------------------------------------------
# Start interview - FR06/FR08
# ---------------------------------------------------------------------------

class StartInterviewRequest(BaseModel):
    category_id: str
    type: Optional[str] = "technical"


@router.post("/interviews", status_code=status.HTTP_201_CREATED)
def start_interview(data: StartInterviewRequest, token_payload: dict = Depends(verify_candidate)):
    cat_obj_id = _object_id_or_400(data.category_id, "category ID")

    category = categories_collection.find_one({"_id": cat_obj_id})
    if not category:
        raise HTTPException(status_code=404, detail="Category not found")
    if category.get("status") != "active":
        raise HTTPException(status_code=400, detail="This category is not currently available for interviews")

    questions = _load_active_questions(data.category_id)
    if not questions:
        raise HTTPException(status_code=400, detail="No active questions are available for this category yet")

    # Snapshotted into this interview document (not a second collection) so
    # a candidate's record stays stable even if the underlying question is
    # later edited/archived/deleted by an admin.
    question_snapshot = [
        {
            "question_id": str(q["_id"]),
            "question_text": q.get("question_text"),
            "difficulty": q.get("difficulty", "Medium"),
            "type": q.get("type", "Technical"),
            "order": idx,
        }
        for idx, q in enumerate(questions)
    ]

    now = datetime.utcnow()
    # Candidate identity always comes from the verified JWT, never from the
    # request body - there is no user_id field anywhere in this schema.
    new_interview = {
        "user_id": token_payload.get("user_id"),
        "role": category.get("name"),
        "category_id": data.category_id,
        "type": data.type or "technical",
        "status": "In Progress",
        "questions": question_snapshot,
        "responses": [],
        "created_at": now,
        "completed_at": None,
        # Reserved for the Evaluation phase - never populated here.
        "score": None,
        "confidence": None,
        "stress": None,
        "transcript": None,
        "evaluation": None,
        "evaluation_status": "pending_evaluation",
    }

    result = interviews_collection.insert_one(new_interview)
    created = interviews_collection.find_one({"_id": result.inserted_id})
    return _public_interview(created)


# ---------------------------------------------------------------------------
# Fetch one interview - used to resume an in-progress session and to load
# data for Results/Feedback. Ownership is structural: the query always
# filters by the caller's own user_id, so a candidate can never even prove
# another candidate's interview exists (404, not 403).
# ---------------------------------------------------------------------------

def _get_owned_interview_or_404(interview_id: str, user_id: str) -> dict:
    obj_id = _object_id_or_400(interview_id, "interview ID")
    interview = interviews_collection.find_one({"_id": obj_id, "user_id": user_id})
    if not interview:
        raise HTTPException(status_code=404, detail="Interview not found")
    return interview


@router.get("/interviews/{interview_id}")
def get_interview(interview_id: str, token_payload: dict = Depends(verify_candidate)):
    interview = _get_owned_interview_or_404(interview_id, token_payload.get("user_id"))
    return _public_interview(interview)


# ---------------------------------------------------------------------------
# Save a response - FR12/FR33 (metadata only, see module docstring)
#
# No raw audio/video is ever sent to or stored by this endpoint. The
# frontend's MediaRecorder output stays entirely local to the browser for
# this phase; only what the report and future multimodal analysis need to
# key off of - which question, which attempt, how long, roughly how large
# - is persisted. media_url is an explicit, documented integration point:
# whichever future storage system (e.g. S3, a media microservice) is added
# for the Evaluation phase writes its reference there; nothing here
# pretends a file was uploaded when it wasn't.
# ---------------------------------------------------------------------------

class SaveResponseRequest(BaseModel):
    question_id: str
    duration_seconds: Optional[float] = None
    size_bytes: Optional[int] = None


@router.post("/interviews/{interview_id}/responses")
def save_response(interview_id: str, data: SaveResponseRequest, token_payload: dict = Depends(verify_candidate)):
    interview = _get_owned_interview_or_404(interview_id, token_payload.get("user_id"))

    if interview.get("status") == "Completed":
        raise HTTPException(status_code=400, detail="This interview has already been completed")

    question_ids = {q["question_id"] for q in interview.get("questions", [])}
    if data.question_id not in question_ids:
        raise HTTPException(status_code=400, detail="This question does not belong to this interview")

    existing_responses = interview.get("responses", [])
    sequence = next(
        (r["sequence"] for r in existing_responses if r["question_id"] == data.question_id),
        len(existing_responses),
    )

    new_response = {
        "question_id": data.question_id,
        "sequence": sequence,
        "status": "recorded",
        "duration_seconds": data.duration_seconds,
        "size_bytes": data.size_bytes,
        "recorded_at": datetime.utcnow(),
        # Deferred to the future media-storage integration - see the
        # module docstring. Deliberately null, not fabricated.
        "media_url": None,
    }

    # Re-recording the same question replaces its prior response rather
    # than appending a duplicate, matching the Simulator's "Re-record
    # Answer" UX.
    remaining = [r for r in existing_responses if r["question_id"] != data.question_id]
    updated_responses = remaining + [new_response]

    interviews_collection.update_one(
        {"_id": interview["_id"]},
        {"$set": {"responses": updated_responses}},
    )

    updated = interviews_collection.find_one({"_id": interview["_id"]})
    return _public_interview(updated)


# ---------------------------------------------------------------------------
# Complete interview - FR10
# ---------------------------------------------------------------------------

@router.post("/interviews/{interview_id}/complete")
def complete_interview(interview_id: str, token_payload: dict = Depends(verify_candidate)):
    interview = _get_owned_interview_or_404(interview_id, token_payload.get("user_id"))

    if interview.get("status") == "Completed":
        raise HTTPException(status_code=400, detail="This interview has already been completed")

    now = datetime.utcnow()
    interviews_collection.update_one(
        {"_id": interview["_id"]},
        {"$set": {"status": "Completed", "completed_at": now, "evaluation_status": "pending_evaluation"}},
    )

    updated = interviews_collection.find_one({"_id": interview["_id"]})
    # Honest about what has and hasn't happened: status reflects that the
    # candidate is done, evaluation_status makes clear no real scoring has
    # run - never "score": <fabricated number> here.
    return _public_interview(updated)


# ---------------------------------------------------------------------------
# History - FR27/FR31
# ---------------------------------------------------------------------------

@router.get("/interviews")
def list_my_interviews(token_payload: dict = Depends(verify_candidate)):
    interviews = interviews_collection.find(
        {"user_id": token_payload.get("user_id")}
    ).sort("created_at", -1)
    return [_public_interview(doc, include_questions=False) for doc in interviews]
