"""
Candidate Feedback Survey API - Objective 7 of the FYP-I report:
"Practical testing, user survey and accuracy testing to evaluate the
efficacy of the system and ensure reliability and usability."

After an interview has been evaluated, the candidate can rate the
experience (1-5 Likert items) and give their own estimate of how well they
did. The self-rating is what makes accuracy testing possible: comparing it
with MockAI's score shows how closely the automated evaluation matches the
candidate's own judgement (see routes/admin.py get_survey_summary and
backend/evaluate_accuracy.py).

One survey per candidate per interview; submitting again updates it.
Mounted at prefix /candidate in main.py.
"""
from datetime import datetime
from typing import Optional

from bson import ObjectId
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field

from database import interviews_collection, surveys_collection
from middleware.candidate_auth import verify_candidate

router = APIRouter()

SURVEY_VERSION = "2026-10-v1"


class SurveyRequest(BaseModel):
    usefulness: int = Field(..., ge=1, le=5, description="How useful was the feedback?")
    accuracy: int = Field(..., ge=1, le=5, description="How accurate did your score feel?")
    ease_of_use: int = Field(..., ge=1, le=5, description="How easy was the platform to use?")
    confidence_gain: int = Field(..., ge=1, le=5, description="Do you feel more prepared for interviews?")
    would_recommend: bool
    self_rated_score: Optional[int] = Field(None, ge=0, le=100, description="Candidate's own estimate of their performance")
    comments: Optional[str] = Field(None, max_length=1000)


def _owned_interview_or_404(interview_id: str, user_id: str) -> dict:
    try:
        obj_id = ObjectId(interview_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid interview ID")
    interview = interviews_collection.find_one({"_id": obj_id, "user_id": user_id})
    if not interview:
        raise HTTPException(status_code=404, detail="Interview not found")
    return interview


def _public_survey(doc: Optional[dict]) -> Optional[dict]:
    if not doc:
        return None
    return {
        "id": str(doc["_id"]),
        "interview_id": doc.get("interview_id"),
        "usefulness": doc.get("usefulness"),
        "accuracy": doc.get("accuracy"),
        "ease_of_use": doc.get("ease_of_use"),
        "confidence_gain": doc.get("confidence_gain"),
        "would_recommend": doc.get("would_recommend"),
        "self_rated_score": doc.get("self_rated_score"),
        "comments": doc.get("comments"),
        "created_at": doc.get("created_at"),
        "updated_at": doc.get("updated_at"),
    }


@router.get("/interviews/{interview_id}/survey")
def get_my_survey(interview_id: str, token_payload: dict = Depends(verify_candidate)):
    user_id = token_payload.get("user_id")
    _owned_interview_or_404(interview_id, user_id)
    doc = surveys_collection.find_one({"interview_id": interview_id, "user_id": user_id})
    return {"survey": _public_survey(doc)}


@router.post("/interviews/{interview_id}/survey")
def submit_survey(interview_id: str, data: SurveyRequest, token_payload: dict = Depends(verify_candidate)):
    user_id = token_payload.get("user_id")
    interview = _owned_interview_or_404(interview_id, user_id)

    if interview.get("evaluation_status") != "completed":
        raise HTTPException(status_code=400, detail="The survey opens once your interview has been evaluated.")

    now = datetime.utcnow()
    evaluation = interview.get("evaluation") or {}
    fields = {
        "usefulness": data.usefulness,
        "accuracy": data.accuracy,
        "ease_of_use": data.ease_of_use,
        "confidence_gain": data.confidence_gain,
        "would_recommend": data.would_recommend,
        "self_rated_score": data.self_rated_score,
        "comments": (data.comments or "").strip() or None,
        # Snapshot of the system's result at survey time, so accuracy
        # analysis compares like with like even if the interview is re-run.
        "system_score": evaluation.get("overall_score", interview.get("score")),
        "system_confidence_level": evaluation.get("confidence_level"),
        "system_stress_level": evaluation.get("stress_level"),
        "interview_role": interview.get("role"),
        "survey_version": SURVEY_VERSION,
        "updated_at": now,
    }
    surveys_collection.update_one(
        {"interview_id": interview_id, "user_id": user_id},
        {"$set": fields, "$setOnInsert": {"created_at": now}},
        upsert=True,
    )
    doc = surveys_collection.find_one({"interview_id": interview_id, "user_id": user_id})
    return {"survey": _public_survey(doc)}
