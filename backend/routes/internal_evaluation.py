"""
Internal Evaluation Results API - the write side of the pipeline contract.

This is where a future AI worker (once ASRService/NLPService/VisionService/
FusionService in services/ai_interfaces.py have real implementations, and
services/evaluation_pipeline.py is actually invoked against real media)
would submit results. It is deliberately NOT reachable with a Candidate or
Admin JWT - see middleware/internal_auth.py for why a third credential
exists. No route in this file is called anywhere in this codebase yet;
it exists so the contract (Phase 4) is real and testable before a worker
exists to use it.

On a successful "completed" submission, this also updates the interview's
existing top-level score/confidence/stress fields (denormalized copies,
not a second source of truth) purely so Admin's already-existing
projections (routes/admin.py's INTERVIEW_LIST_PROJECTION/
INTERVIEW_DETAIL_PROJECTION, which read those exact field names) start
showing real numbers the moment real evaluation exists, with zero changes
to any Admin code.
"""
from datetime import datetime
from typing import List, Optional

from bson import ObjectId
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from database import interviews_collection
from middleware.internal_auth import verify_internal_service

router = APIRouter()


class PerQuestionEvaluationPayload(BaseModel):
    question_id: str
    asr: dict
    text_analysis: dict
    facial_analysis: dict
    multimodal: dict


class SubmitEvaluationRequest(BaseModel):
    status: str  # "completed" | "failed"
    per_question: Optional[List[PerQuestionEvaluationPayload]] = None
    overall_score: Optional[float] = None
    confidence_score: Optional[float] = None
    stress_level: Optional[str] = None
    interpretation: Optional[str] = None
    strengths: Optional[List[str]] = None
    weaknesses: Optional[List[str]] = None
    suggestions: Optional[List[str]] = None
    failed_reason: Optional[str] = None


@router.put("/evaluations/{interview_id}")
def submit_evaluation(
    interview_id: str,
    data: SubmitEvaluationRequest,
    _: bool = Depends(verify_internal_service),
):
    try:
        obj_id = ObjectId(interview_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid interview ID")

    interview = interviews_collection.find_one({"_id": obj_id})
    if not interview:
        raise HTTPException(status_code=404, detail="Interview not found")

    if interview.get("evaluation_status") != "processing":
        raise HTTPException(
            status_code=409,
            detail=f"Cannot submit results - evaluation is not currently processing (current state: {interview.get('evaluation_status')})",
        )

    if data.status not in ("completed", "failed"):
        raise HTTPException(status_code=400, detail="status must be 'completed' or 'failed'")

    now = datetime.utcnow()

    if data.status == "failed":
        if not data.failed_reason:
            raise HTTPException(status_code=400, detail="failed_reason is required when status is 'failed'")
        interviews_collection.update_one(
            {"_id": obj_id},
            {"$set": {
                "evaluation_status": "failed",
                "evaluation.completed_at": now,
                "evaluation.failed_reason": data.failed_reason,
            }},
        )
        return {"evaluation_status": "failed"}

    # status == "completed" - require the minimum a real evaluation must have.
    if data.overall_score is None or data.confidence_score is None or data.stress_level is None:
        raise HTTPException(status_code=400, detail="overall_score, confidence_score, and stress_level are required for a completed evaluation")

    evaluation_doc = {
        "started_at": (interview.get("evaluation") or {}).get("started_at"),
        "completed_at": now,
        "per_question": [q.model_dump() for q in data.per_question] if data.per_question else None,
        "overall_score": data.overall_score,
        "confidence_score": data.confidence_score,
        "stress_level": data.stress_level,
        "interpretation": data.interpretation,
        "strengths": data.strengths,
        "weaknesses": data.weaknesses,
        "suggestions": data.suggestions,
        "failed_reason": None,
    }

    interviews_collection.update_one(
        {"_id": obj_id},
        {"$set": {
            "evaluation_status": "completed",
            "evaluation": evaluation_doc,
            # Denormalized for Admin's existing projections - see module docstring.
            "score": data.overall_score,
            "confidence": data.confidence_score,
            "stress": data.stress_level,
        }},
    )
    return {"evaluation_status": "completed"}
