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
import os
from dataclasses import asdict
from datetime import datetime
from typing import Optional

from bson import ObjectId
from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile, status
from pydantic import BaseModel

from database import categories_collection, questions_collection, interviews_collection
from middleware.candidate_auth import verify_candidate
from services.asr_google import GoogleSpeechASRService
from services.media_storage import get_media_storage

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
    role: Optional[str] = None
    target_role: Optional[str] = None


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
    target_role_name = (data.role or data.target_role or "").strip()
    role_name = target_role_name if target_role_name else category.get("name")

    new_interview = {
        "user_id": token_payload.get("user_id"),
        "role": role_name,
        "target_role": role_name,
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
# Upload response media - FR12 (record & store audio), FR13 (capture &
# store visual data), FR14 (controlled capture), FR15 (speech to text).
#
# This is the real counterpart to save_response() above: that endpoint
# only ever recorded metadata a client claimed about a recording; this one
# receives the actual recording, stores it via the storage abstraction
# (services/media_storage.py - local filesystem today, S3-shaped interface
# for later), and updates the SAME response entry with the real,
# server-derived size and a genuine media_url. save_response() is left
# entirely as-is for any caller that only has metadata (e.g. tests, or a
# future retry-metadata-only path) - this is additive, not a replacement.
#
# Ownership/validation, all enforced before a single byte is written:
#   - Candidate JWT required; interview looked up by (id, caller's own
#     user_id) exactly like every other interview endpoint - a candidate
#     can structurally never write into another candidate's interview.
#   - The interview must still be "In Progress" (not yet Completed) -
#     matches save_response()'s existing rule, and FR14's "collect data
#     only during active interview sessions."
#   - question_id must already exist in this interview's own question
#     snapshot - never trusted blindly.
#   - Content-type is checked against an allow-list (webm variants only -
#     see the empirically-confirmed MediaRecorder output format in the
#     accompanying report); actual byte size is checked against
#     MAX_RESPONSE_MEDIA_MB after reading, not trusted from headers.
#   - The stored filename is never derived from the browser-supplied
#     filename - see media_storage.py's module docstring for the full
#     path-traversal argument.
#
# After storing, this synchronously calls the real ASR service (FR15).
# There is no background worker in this phase, so "synchronous in the
# upload request" is the simplest honest choice available - documented as
# a known scalability limitation in the accompanying report, not hidden.
# The result (a real transcript, or a real "failed: not configured"/
# "failed: <reason>" outcome - NEVER a fabricated transcript) is written
# into interview.evaluation.per_question, without ever marking the whole
# evaluation "completed" - ASR is stage one of many; see
# routes/candidate_evaluation.py for why evaluation_status is left alone
# here entirely.
# ---------------------------------------------------------------------------

ALLOWED_MEDIA_CONTENT_TYPES = ("video/webm", "audio/webm")


def _upsert_evaluation_per_question_asr(interview: dict, question_id: str, asr_result: dict) -> None:
    evaluation = interview.get("evaluation") or {
        "started_at": None, "completed_at": None, "per_question": [],
        "overall_score": None, "confidence_score": None, "stress_level": None,
        "interpretation": None, "strengths": None, "weaknesses": None,
        "suggestions": None, "failed_reason": None,
    }
    per_question = [q for q in (evaluation.get("per_question") or []) if q.get("question_id") != question_id]
    per_question.append({"question_id": question_id, "asr": asr_result})
    evaluation["per_question"] = per_question

    interviews_collection.update_one({"_id": interview["_id"]}, {"$set": {"evaluation": evaluation}})


@router.post("/interviews/{interview_id}/responses/{question_id}/media")
async def upload_response_media(
    interview_id: str,
    question_id: str,
    file: UploadFile = File(...),
    duration_seconds: Optional[float] = Form(None),
    token_payload: dict = Depends(verify_candidate),
):
    interview = _get_owned_interview_or_404(interview_id, token_payload.get("user_id"))

    if interview.get("status") == "Completed":
        raise HTTPException(status_code=400, detail="This interview has already been completed")

    question_ids = {q["question_id"] for q in interview.get("questions", [])}
    if question_id not in question_ids:
        raise HTTPException(status_code=400, detail="This question does not belong to this interview")

    content_type = (file.content_type or "").split(";")[0].strip().lower()
    if content_type not in ALLOWED_MEDIA_CONTENT_TYPES:
        raise HTTPException(status_code=400, detail=f"Unsupported media type: {file.content_type!r}. Expected webm audio/video.")

    data = await file.read()
    max_bytes = int(os.getenv("MAX_RESPONSE_MEDIA_MB", "25")) * 1024 * 1024
    if len(data) == 0:
        raise HTTPException(status_code=400, detail="Uploaded file is empty")
    if len(data) > max_bytes:
        raise HTTPException(status_code=413, detail=f"Recording exceeds the {max_bytes // (1024 * 1024)}MB limit for a single response")

    media_ref = get_media_storage().save(interview_id, question_id, "webm", data)

    existing_responses = interview.get("responses", [])
    sequence = next(
        (r["sequence"] for r in existing_responses if r["question_id"] == question_id),
        len(existing_responses),
    )
    new_response = {
        "question_id": question_id,
        "sequence": sequence,
        "status": "recorded",
        "duration_seconds": duration_seconds,
        "size_bytes": len(data),  # server-measured, never trusted from the client
        "recorded_at": datetime.utcnow(),
        "media_url": media_ref,
    }
    updated_responses = [r for r in existing_responses if r["question_id"] != question_id] + [new_response]
    interviews_collection.update_one({"_id": interview["_id"]}, {"$set": {"responses": updated_responses}})

    # Re-fetch so the ASR upsert below (and the final response) reflect the
    # response write we just made.
    interview = interviews_collection.find_one({"_id": interview["_id"]})

    asr_result = GoogleSpeechASRService().transcribe(media_ref, duration_seconds)
    _upsert_evaluation_per_question_asr(interview, question_id, asdict(asr_result))

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


# ---------------------------------------------------------------------------
# Statistics - Phase 2C
# ---------------------------------------------------------------------------

@router.get("/stats")
def get_candidate_statistics(token_payload: dict = Depends(verify_candidate)):
    """
    Computes rigorous candidate performance analytics directly from MongoDB.
    Strictly scoped to the authenticated candidate.
    Excludes pending, processing, failed, or incomplete evaluations.
    Deduplicates duplicate sessions to prevent statistical skew.
    Uses numeric evaluation.stress_score and genuine system stress levels (Low, Moderate, Elevated).
    """
    user_id = token_payload.get("user_id") or token_payload.get("sub")
    if not user_id:
        raise HTTPException(status_code=401, detail="Invalid user authentication")

    # Fetch all candidate interviews sorted by created_at ascending for trend analysis
    all_interviews = list(interviews_collection.find({"user_id": str(user_id)}).sort("created_at", 1))

    total_interviews = len(all_interviews)

    # Filter to completed evaluated sessions only, deduplicating if identical session IDs exist
    seen_ids = set()
    completed_scored = []

    for doc in all_interviews:
        doc_id = str(doc["_id"])
        if doc_id in seen_ids:
            continue
        seen_ids.add(doc_id)

        # Must be status == "Completed" and evaluation_status == "completed" and have real score
        if doc.get("status") != "Completed":
            continue
        if doc.get("evaluation_status") != "completed":
            continue
        if doc.get("score") is None:
            continue

        completed_scored.append(doc)

    completed_count = len(completed_scored)

    if completed_count == 0:
        return {
            "total_interviews": total_interviews,
            "completed_interviews": 0,
            "average_score": None,
            "best_score": None,
            "dimension_averages": {
                "content_score": None,
                "delivery_score": None,
                "facial_score": None,
            },
            "average_confidence": None,
            "average_stress": None,
            "stress_distribution": {"Low": 0, "Moderate": 0, "Elevated": 0},
            "score_trend": [],
            "confidence_trend": [],
            "stress_trend": [],
            "by_category": [],
            "recent": [_public_interview(doc, include_questions=False) for doc in reversed(all_interviews[-5:])],
        }

    scores = [float(doc["score"]) for doc in completed_scored]
    avg_score = round(sum(scores) / completed_count, 1)
    best_score = round(max(scores), 1)

    # Dimension scores
    nlp_scores = []
    speech_scores = []
    vision_scores = []

    # Stress & confidence
    confidence_scores = []
    stress_scores = []
    stress_dist = {"Low": 0, "Moderate": 0, "Elevated": 0}

    # Trends
    score_trend = []
    confidence_trend = []
    stress_trend = []
    category_map = {}

    for doc in completed_scored:
        evaluation = doc.get("evaluation") or {}
        dim_scores = evaluation.get("dimension_scores") or {}

        # Content / NLP
        c_score = dim_scores.get("nlp_score") if dim_scores.get("nlp_score") is not None else dim_scores.get("content_score")
        if c_score is not None:
            nlp_scores.append(float(c_score))

        # Delivery / Speech
        d_score = dim_scores.get("speech_score") if dim_scores.get("speech_score") is not None else dim_scores.get("delivery_score")
        if d_score is not None:
            speech_scores.append(float(d_score))

        # Facial / Vision
        f_score = dim_scores.get("vision_score") if dim_scores.get("vision_score") is not None else dim_scores.get("facial_score")
        if f_score is not None:
            vision_scores.append(float(f_score))

        # Confidence
        conf = evaluation.get("confidence_score")
        if conf is None and isinstance(doc.get("confidence"), (int, float)):
            conf = float(doc.get("confidence"))
        if conf is not None:
            confidence_scores.append(float(conf))

        # Stress score
        str_val = evaluation.get("stress_score")
        if str_val is None and isinstance(doc.get("stress_score"), (int, float)):
            str_val = float(doc.get("stress_score"))
        if str_val is not None:
            stress_scores.append(float(str_val))

        # Discrete Stress Level (Low, Moderate, Elevated)
        str_lvl = evaluation.get("stress_level") or doc.get("stress") or "Low"
        if str_lvl in stress_dist:
            stress_dist[str_lvl] += 1
        elif str_lvl == "Medium":
            stress_dist["Moderate"] += 1
        elif str_lvl == "High":
            stress_dist["Elevated"] += 1

        # Date formatting
        c_at = doc.get("created_at")
        date_str = c_at.isoformat() if hasattr(c_at, "isoformat") else str(c_at)
        role = doc.get("role") or doc.get("target_role") or "Technical"

        score_trend.append({
            "date": date_str,
            "score": round(float(doc["score"]), 1),
            "label": role,
            "confidence": round(float(conf), 1) if conf is not None else None,
            "stress": round(float(str_val), 1) if str_val is not None else None,
        })

        if conf is not None:
            confidence_trend.append({
                "date": date_str,
                "confidence": round(float(conf), 1),
                "label": role,
            })

        if str_val is not None:
            stress_trend.append({
                "date": date_str,
                "stress": round(float(str_val), 1),
                "stress_level": str_lvl,
                "label": role,
            })

        # By category aggregation
        if role not in category_map:
            category_map[role] = {"category": role, "count": 0, "totalScore": 0.0, "scores": []}
        category_map[role]["count"] += 1
        category_map[role]["totalScore"] += float(doc["score"])
        category_map[role]["scores"].append(float(doc["score"]))

    by_category = []
    for cat_name, cat_data in category_map.items():
        by_category.append({
            "category": cat_name,
            "count": cat_data["count"],
            "avgScore": round(cat_data["totalScore"] / cat_data["count"], 1),
            "totalScore": round(cat_data["totalScore"], 1),
            "bestScore": round(max(cat_data["scores"]), 1),
        })

    avg_nlp = round(sum(nlp_scores) / len(nlp_scores), 1) if nlp_scores else None
    avg_speech = round(sum(speech_scores) / len(speech_scores), 1) if speech_scores else None
    avg_vision = round(sum(vision_scores) / len(vision_scores), 1) if vision_scores else None

    avg_conf = round(sum(confidence_scores) / len(confidence_scores), 1) if confidence_scores else None
    avg_str = round(sum(stress_scores) / len(stress_scores), 1) if stress_scores else None

    return {
        "total_interviews": total_interviews,
        "completed_interviews": completed_count,
        "average_score": avg_score,
        "best_score": best_score,
        "dimension_averages": {
            "content_score": avg_nlp,
            "delivery_score": avg_speech,
            "facial_score": avg_vision,
        },
        "average_confidence": avg_conf,
        "average_stress": avg_str,
        "stress_distribution": stress_dist,
        "score_trend": score_trend,
        "confidence_trend": confidence_trend,
        "stress_trend": stress_trend,
        "by_category": by_category,
        "recent": [_public_interview(doc, include_questions=False) for doc in reversed(all_interviews[-5:])],
    }
