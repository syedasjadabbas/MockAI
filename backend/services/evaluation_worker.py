"""
Background Evaluation Worker (Phase 5).

Asynchronously orchestrates the end-to-end evaluation pipeline for a completed interview:
1. Loads interview document & question bank criteria.
2. Ingests candidate response recordings & genuine speech transcripts.
3. Analyzes each response via Question-Level Evaluator (NLP + Delivery).
4. Synthesizes overall performance via Aggregate Evaluator.
5. Persists the complete evaluation record and updates evaluation_status ("completed" or "failed").
6. Denormalizes top-level score, confidence, and stress for Admin reporting compatibility.
"""
import logging
from datetime import datetime
from typing import Dict, List, Optional
from bson import ObjectId

from database import interviews_collection, questions_collection
from services.asr_google import GoogleSpeechASRService
from services.question_evaluator import evaluate_question_response
from services.aggregate_evaluator import aggregate_interview_evaluation

logger = logging.getLogger("mockai.evaluation_worker")


def evaluate_interview_job(interview_id: str) -> Dict:
    """
    Executes the full evaluation pipeline for the given interview ID.
    Can be run as a background task or synchronously in tests.
    """
    try:
        obj_id = ObjectId(interview_id)
    except Exception as err:
        logger.error(f"Invalid interview ID format: {interview_id} ({err})")
        raise ValueError(f"Invalid interview ID: {interview_id}")

    interview = interviews_collection.find_one({"_id": obj_id})
    if not interview:
        logger.error(f"Interview {interview_id} not found for evaluation.")
        raise ValueError(f"Interview not found: {interview_id}")

    try:
        now = datetime.utcnow()
        # Mark as processing if not already marked
        if interview.get("evaluation_status") != "processing":
            existing_eval = interview.get("evaluation") or {}
            interviews_collection.update_one(
                {"_id": obj_id},
                {"$set": {
                    "evaluation_status": "processing",
                    "evaluation.started_at": existing_eval.get("started_at") or now,
                }}
            )
            interview = interviews_collection.find_one({"_id": obj_id})

        questions = interview.get("questions", [])
        responses = {r.get("question_id"): r for r in interview.get("responses", [])}
        existing_evaluation = interview.get("evaluation") or {}
        existing_per_q = {q.get("question_id"): q for q in (existing_evaluation.get("per_question") or [])}

        per_question_results: List[Dict] = []

        for q in questions:
            q_id = q.get("question_id")
            q_text = q.get("question_text", "")
            q_difficulty = q.get("difficulty", "Medium")

            # Look up criteria from questions_collection for expected_answer and tags
            expected_answer = None
            tags = q.get("tags", [])
            try:
                if q_id:
                    q_db = questions_collection.find_one({"_id": ObjectId(q_id)})
                    if q_db:
                        expected_answer = q_db.get("expected_answer")
                        if not tags:
                            tags = q_db.get("tags", [])
            except Exception:
                pass

            resp = responses.get(q_id)
            duration_seconds = resp.get("duration_seconds") if resp else None
            media_url = resp.get("media_url") if resp else None

            # Retrieve transcript: from per_question ASR or run ASR on media_url if available
            transcript = None
            asr_status = "empty"
            asr_provider = None

            per_q_saved = existing_per_q.get(q_id)
            if per_q_saved and per_q_saved.get("asr"):
                asr_info = per_q_saved["asr"]
                transcript = asr_info.get("transcript")
                asr_status = asr_info.get("status", "completed" if transcript else "empty")
                asr_provider = asr_info.get("provider")
            elif media_url:
                try:
                    asr_res = GoogleSpeechASRService().transcribe(media_url, duration_seconds)
                    transcript = asr_res.transcript
                    asr_status = asr_res.status
                    asr_provider = asr_res.provider
                except Exception as asr_err:
                    logger.warning(f"ASR execution notice for {q_id}: {asr_err}")
                    asr_status = "failed"

            # Run Question-level evaluation
            q_eval = evaluate_question_response(
                question_id=q_id,
                question_text=q_text,
                expected_answer=expected_answer,
                tags=tags,
                difficulty=q_difficulty,
                transcript=transcript,
                duration_seconds=duration_seconds,
                media_url=media_url,
                asr_status=asr_status,
                asr_provider=asr_provider,
                rubric=q.get("rubric"),
            )
            per_question_results.append(q_eval)

        # Aggregate results
        aggregate_res = aggregate_interview_evaluation(per_question_results)

        completed_at = datetime.utcnow()
        evaluation_doc = {
            "started_at": (interview.get("evaluation") or {}).get("started_at") or now,
            "completed_at": completed_at,
            "per_question": per_question_results,
            "overall_score": aggregate_res["overall_score"],
            "confidence_score": aggregate_res["confidence_score"],
            "stress_level": aggregate_res["stress_level"],
            "interpretation": aggregate_res["interpretation"],
            "strengths": aggregate_res["strengths"],
            "weaknesses": aggregate_res["weaknesses"],
            "suggestions": aggregate_res["suggestions"],
            "facial_summary": aggregate_res.get("facial_summary"),
            "failed_reason": None,
        }

        # Persist completed evaluation
        interviews_collection.update_one(
            {"_id": obj_id},
            {"$set": {
                "evaluation_status": "completed",
                "evaluation": evaluation_doc,
                # Denormalize top-level fields for Admin's existing views
                "score": aggregate_res["overall_score"],
                "confidence": aggregate_res["confidence_score"],
                "stress": aggregate_res["stress_level"],
            }}
        )
        logger.info(f"Evaluation successfully completed for interview {interview_id}: score={aggregate_res['overall_score']}")
        return evaluation_doc

    except Exception as e:
        logger.error(f"Evaluation pipeline failed for interview {interview_id}: {e}", exc_info=True)
        interviews_collection.update_one(
            {"_id": obj_id},
            {"$set": {
                "evaluation_status": "failed",
                "evaluation.completed_at": datetime.utcnow(),
                "evaluation.failed_reason": str(e),
            }}
        )
        raise e
