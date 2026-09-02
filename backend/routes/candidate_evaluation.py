"""
Candidate Evaluation API - foundation only (FR15-FR27 architecture).

No AI runs here. These endpoints manage the evaluation_status lifecycle
(pending_evaluation -> processing -> completed | failed) and expose
whatever evaluation data actually exists in MongoDB - never a fabricated
number. Real scoring is written by a future worker via the separate
internal endpoint (routes/internal_evaluation.py), never by a candidate
request.

Reuses existing infrastructure:
- interviews_collection - the same document routes/candidate_interview.py
  already creates, which already carries `evaluation_status` (set to
  "pending_evaluation" on completion) and `evaluation` (always None until
  now). Nothing here duplicates that collection or adds a new one - see
  the accompanying report for why embedding was chosen over a separate
  evaluations collection.
- middleware/candidate_auth.py's verify_candidate - identical ownership
  pattern to every other candidate interview endpoint: the target
  interview is always looked up by (interview_id, caller's own user_id
  from the JWT), so cross-candidate access is structurally impossible.

Mounted at prefix /candidate in main.py, alongside the other candidate
routers.
"""
from datetime import datetime

from bson import ObjectId
from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException

from database import interviews_collection
from middleware.candidate_auth import verify_candidate
from services.evaluation_worker import evaluate_interview_job

router = APIRouter()

EVALUATION_STATES = {"pending_evaluation", "processing", "completed", "failed"}


def _object_id_or_400(id_str: str, label: str = "ID") -> ObjectId:
    try:
        return ObjectId(id_str)
    except Exception:
        raise HTTPException(status_code=400, detail=f"Invalid {label}")


def _get_owned_interview_or_404(interview_id: str, user_id: str) -> dict:
    obj_id = _object_id_or_400(interview_id, "interview ID")
    interview = interviews_collection.find_one({"_id": obj_id, "user_id": user_id})
    if not interview:
        raise HTTPException(status_code=404, detail="Interview not found")
    return interview


# ---------------------------------------------------------------------------
# Start evaluation - FR10-03 / Use Case 12 "End Interview Session"
# (postcondition: "analysis is initiated"), FR20's aggregation prerequisite.
#
# Transitions evaluation_status: pending_evaluation -> processing, and
# asynchronously dispatches the real AI evaluation worker to process responses.
# ---------------------------------------------------------------------------

@router.post("/interviews/{interview_id}/evaluation/start")
def start_evaluation(
    interview_id: str,
    background_tasks: BackgroundTasks,
    token_payload: dict = Depends(verify_candidate),
):
    interview = _get_owned_interview_or_404(interview_id, token_payload.get("user_id"))

    if interview.get("status") != "Completed":
        raise HTTPException(status_code=400, detail="The interview must be completed before evaluation can start")

    current_status = interview.get("evaluation_status", "pending_evaluation")
    if current_status != "pending_evaluation":
        raise HTTPException(status_code=400, detail=f"Evaluation cannot be started from its current state: {current_status}")

    now = datetime.utcnow()
    existing_evaluation = interview.get("evaluation") or {}
    merged_evaluation = {
        "started_at": now,
        "completed_at": None,
        "per_question": existing_evaluation.get("per_question"),
        "overall_score": None,
        "confidence_score": None,
        "stress_level": None,
        "interpretation": None,
        "strengths": None,
        "weaknesses": None,
        "suggestions": None,
        "failed_reason": None,
    }

    interviews_collection.update_one(
        {"_id": interview["_id"]},
        {"$set": {"evaluation_status": "processing", "evaluation": merged_evaluation}},
    )

    # Launch evaluation worker in the background
    background_tasks.add_task(evaluate_interview_job, str(interview["_id"]))

    return {"evaluation_status": "processing"}


# ---------------------------------------------------------------------------
# Get evaluation - FR21-FR28's read side, and the status-check contract
# (no separate "check status" endpoint - this single GET always reflects
# whatever is actually in MongoDB, including while pending/processing/
# failed, per "do not create redundant endpoints").
# ---------------------------------------------------------------------------

@router.get("/interviews/{interview_id}/evaluation")
def get_evaluation(interview_id: str, token_payload: dict = Depends(verify_candidate)):
    interview = _get_owned_interview_or_404(interview_id, token_payload.get("user_id"))
    return {
        "evaluation_status": interview.get("evaluation_status", "pending_evaluation"),
        "evaluation": interview.get("evaluation"),
    }
