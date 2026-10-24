"""
Background Evaluation Worker (Phase 5).

Asynchronously orchestrates the end-to-end evaluation pipeline for a completed interview:
1. Loads interview document & question bank criteria.
2. Ingests candidate response recordings & genuine speech transcripts.
3. Analyzes each response via Question-Level Evaluator (NLP + Delivery).
4. Synthesizes overall performance via Aggregate Evaluator.
5. Persists the complete evaluation record and updates evaluation_status ("completed" or "failed").
6. Denormalizes top-level score, confidence, and stress for Admin reporting compatibility.

Spoken answers are also analysed one by one as soon as they are uploaded
(schedule_answer_analysis), while the candidate moves on to the next
question. The final job reuses those results, so after the last answer only
the remaining work and the aggregation are left.
"""
import gc
import logging
import threading
from concurrent.futures import Future, ThreadPoolExecutor
from dataclasses import asdict
from datetime import datetime
from typing import Dict, List, Optional, Tuple
from bson import ObjectId

from database import interviews_collection, questions_collection
from services.asr_google import GoogleSpeechASRService
from services.question_evaluator import evaluate_question_response
from services.aggregate_evaluator import aggregate_interview_evaluation

logger = logging.getLogger("mockai.evaluation_worker")

# Serialization lock to prevent concurrent evaluation overlap within the process
_evaluation_lock = threading.Lock()

# Interviews queued or running in THIS process, so recovery never re-dispatches
# a job that is only waiting for the lock.
_active_jobs: set = set()
_active_guard = threading.Lock()

# Recovery of evaluations left in "processing" (the job died with a restart or
# crash, so nothing would ever finish them). After MAX_RECOVERY_ATTEMPTS the
# interview is marked failed with a reason instead of retrying forever.
STALE_PROCESSING_MINUTES = 15
MAX_RECOVERY_ATTEMPTS = 2

# Per-answer analysis during the interview: one worker thread, results kept on
# the interview under answer_analysis.<question_id> until the final job runs.
_answer_executor = ThreadPoolExecutor(max_workers=1, thread_name_prefix="answer-analysis")
_pending_answers: Dict[Tuple[str, str], Future] = {}
_pending_guard = threading.Lock()
ANSWER_WAIT_SECONDS = 180


def evaluate_interview_job(interview_id: str) -> Dict:
    """
    Executes the full evaluation pipeline for the given interview ID.
    Can be run as a background task or synchronously in tests.
    Serialized via _evaluation_lock to prevent concurrent evaluation memory surges.
    """
    with _active_guard:
        _active_jobs.add(str(interview_id))
    try:
        # Let answers still being analysed finish first (outside the lock,
        # which each of them takes), so their results are reused.
        _wait_for_answer_analysis(str(interview_id))
        with _evaluation_lock:
            try:
                return _evaluate_interview_job_unlocked(interview_id)
            finally:
                gc.collect()
    finally:
        with _active_guard:
            _active_jobs.discard(str(interview_id))


def schedule_answer_analysis(interview_id: str, question_id: str, media_url: str) -> None:
    """Transcribe and score one spoken answer in the background, right after
    its upload. Safe to call again when the answer is re-recorded: a result is
    only reused when its media_url still matches the stored response."""
    key = (str(interview_id), question_id)
    future = _answer_executor.submit(_analyse_answer, str(interview_id), question_id, media_url)
    with _pending_guard:
        _pending_answers[key] = future
    future.add_done_callback(lambda f: _forget_answer(key, f))


def _forget_answer(key: Tuple[str, str], future: Future) -> None:
    with _pending_guard:
        if _pending_answers.get(key) is future:
            del _pending_answers[key]


def _wait_for_answer_analysis(interview_id: str) -> None:
    with _pending_guard:
        futures = [f for (iid, _), f in _pending_answers.items() if iid == interview_id]
    for future in futures:
        try:
            future.result(timeout=ANSWER_WAIT_SECONDS)
        except Exception as err:  # the final job simply redoes that answer
            logger.warning(f"Answer analysis for {interview_id} did not finish: {err}")


def _question_criteria(q: Dict) -> Tuple[Optional[str], List]:
    """Expected answer and tags, falling back to the Question Bank."""
    q_id = q.get("question_id") or q.get("id")
    expected_answer = q.get("expected_answer")
    tags = q.get("tags", [])
    try:
        if q_id and not expected_answer:
            q_db = questions_collection.find_one({"_id": ObjectId(q_id)})
            if q_db:
                expected_answer = q_db.get("expected_answer")
                if not tags:
                    tags = q_db.get("tags", [])
    except Exception:
        pass
    return expected_answer, tags


def _analyse_answer(interview_id: str, question_id: str, media_url: str) -> None:
    interview = interviews_collection.find_one({"_id": ObjectId(interview_id)})
    if not interview:
        return
    resp = next((r for r in interview.get("responses", []) if r.get("question_id") == question_id), None)
    q = next((q for q in interview.get("questions", []) if (q.get("question_id") or q.get("id")) == question_id), None)
    if not resp or not q or resp.get("media_url") != media_url:
        return  # re-recorded or removed since it was scheduled

    duration_seconds = resp.get("duration_seconds")
    expected_answer, tags = _question_criteria(q)
    with _evaluation_lock:
        try:
            asr = GoogleSpeechASRService().transcribe(media_url, duration_seconds)
            result = evaluate_question_response(
                question_id=question_id,
                question_text=q.get("question_text") or q.get("question") or "",
                expected_answer=expected_answer,
                tags=tags,
                difficulty=q.get("difficulty", "Medium"),
                transcript=asr.transcript,
                duration_seconds=duration_seconds,
                media_url=media_url,
                asr_status=asr.status,
                asr_provider=asr.provider,
                rubric=q.get("rubric"),
                response_mode="spoken",
            )
        finally:
            gc.collect()
    interviews_collection.update_one(
        {"_id": interview["_id"]},
        {"$set": {f"answer_analysis.{question_id}": {
            "media_url": media_url,
            "recorded_at": resp.get("recorded_at"),  # tells re-recordings apart (same path)
            "asr": asdict(asr),
            "result": result,
            "analysed_at": datetime.utcnow(),
        }}},
    )


def _run_in_background(interview_id: str) -> None:
    def _target():
        try:
            evaluate_interview_job(interview_id)
        except Exception as err:  # the job records its own failure state
            logger.warning(f"Recovered evaluation {interview_id} ended with: {err}")
    threading.Thread(target=_target, name=f"eval-recovery-{interview_id}", daemon=True).start()


def recover_stuck_evaluation(interview: Dict, stale_minutes: float = STALE_PROCESSING_MINUTES) -> Optional[str]:
    """Re-dispatches one interview whose evaluation is stuck in "processing".
    Returns "redispatched", "failed" (attempts exhausted) or None (not stuck)."""
    if not interview or interview.get("evaluation_status") != "processing":
        return None
    iid = str(interview["_id"])
    with _active_guard:
        if iid in _active_jobs:
            return None
    evaluation = interview.get("evaluation") or {}
    started = evaluation.get("started_at")
    now = datetime.utcnow()
    if stale_minutes and isinstance(started, datetime) and (now - started).total_seconds() < stale_minutes * 60:
        return None

    attempts = int(evaluation.get("recovery_attempts") or 0)
    if attempts >= MAX_RECOVERY_ATTEMPTS:
        interviews_collection.update_one(
            {"_id": interview["_id"], "evaluation_status": "processing"},
            {"$set": {
                "evaluation_status": "failed",
                "evaluation.failed_reason": f"Evaluation did not finish after {attempts + 1} attempts. Please contact support.",
                "evaluation.completed_at": now,
            }},
        )
        logger.error(f"Evaluation {iid} marked failed after {attempts} recovery attempts")
        return "failed"

    # Claim atomically (same started_at we read) so two recoveries cannot both dispatch.
    claimed = interviews_collection.update_one(
        {"_id": interview["_id"], "evaluation_status": "processing", "evaluation.started_at": started},
        {"$set": {"evaluation.started_at": now, "evaluation.recovered_at": now},
         "$inc": {"evaluation.recovery_attempts": 1}},
    )
    if claimed.modified_count != 1:
        return None
    logger.warning(f"Re-dispatching evaluation {iid} stuck in processing (attempt {attempts + 1})")
    _run_in_background(iid)
    return "redispatched"


def recover_stuck_evaluations(stale_minutes: float = 0) -> List[str]:
    """Startup sweep: every "processing" evaluation is orphaned when the server
    starts (background jobs do not survive a restart), so stale_minutes=0."""
    recovered = []
    for interview in interviews_collection.find({"evaluation_status": "processing"}):
        if recover_stuck_evaluation(interview, stale_minutes=stale_minutes) == "redispatched":
            recovered.append(str(interview["_id"]))
    return recovered


def _evaluate_interview_job_unlocked(interview_id: str) -> Dict:
    """
    Internal execution implementation of the evaluation pipeline.
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
            existing_eval = interview.get("evaluation")
            if not isinstance(existing_eval, dict):
                set_doc = {
                    "evaluation_status": "processing",
                    "evaluation": {"started_at": now},
                }
            else:
                set_doc = {
                    "evaluation_status": "processing",
                    "evaluation.started_at": existing_eval.get("started_at") or now,
                }
            interviews_collection.update_one({"_id": obj_id}, {"$set": set_doc})
            interview = interviews_collection.find_one({"_id": obj_id})

        questions = interview.get("questions", [])
        responses = {r.get("question_id"): r for r in interview.get("responses", [])}
        existing_evaluation = interview.get("evaluation") or {}
        existing_per_q = {q.get("question_id"): q for q in (existing_evaluation.get("per_question") or [])}
        answer_analysis = interview.get("answer_analysis") or {}

        per_question_results: List[Dict] = []

        for q in questions:
            q_id = q.get("question_id") or q.get("id")
            q_text = q.get("question_text") or q.get("question") or ""
            q_difficulty = q.get("difficulty", "Medium")

            resp = responses.get(q_id)
            duration_seconds = resp.get("duration_seconds") if resp else None
            media_url = resp.get("media_url") if resp else None
            response_mode = (resp.get("response_mode") if resp else None) or "spoken"

            # Already analysed right after upload (same recording) - reuse it.
            ready = answer_analysis.get(q_id) or {}
            same_take = (
                bool(media_url)
                and ready.get("media_url") == media_url
                and ready.get("recorded_at") == (resp or {}).get("recorded_at")
            )
            if response_mode != "text" and same_take and ready.get("result"):
                per_question_results.append(ready["result"])
                continue

            # Look up criteria from questions_collection for expected_answer and tags
            expected_answer, tags = _question_criteria(q)

            # Retrieve transcript: from per_question ASR or run ASR on media_url if available
            transcript = None
            asr_status = "empty"
            asr_provider = None

            per_q_saved = existing_per_q.get(q_id)
            if response_mode == "text":
                # Typed answer (Objective 1): the candidate's own text is the
                # transcript; no ASR is involved.
                transcript = resp.get("text_response") or ""
                asr_status = "typed" if transcript.strip() else "empty"
                asr_provider = "typed_input"
                media_url = None
            elif same_take and ready.get("asr"):
                asr_info = ready["asr"]
                transcript = asr_info.get("transcript")
                asr_status = asr_info.get("status", "completed" if transcript else "empty")
                asr_provider = asr_info.get("provider")
            elif per_q_saved and per_q_saved.get("asr"):
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
                response_mode=response_mode,
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
            "confidence_level": aggregate_res.get("confidence_level"),
            "stress_score": aggregate_res.get("stress_score"),
            "stress_level": aggregate_res["stress_level"],
            "confidence_and_stress_summary": aggregate_res.get("confidence_and_stress_summary"),
            "interpretation": aggregate_res["interpretation"],
            "strengths": aggregate_res["strengths"],
            "weaknesses": aggregate_res["weaknesses"],
            "suggestions": aggregate_res["suggestions"],
            "facial_summary": aggregate_res.get("facial_summary"),
            "aggregate_analysis": aggregate_res.get("aggregate_analysis"),
            "scoring_formula": aggregate_res.get("scoring_formula"),
            "dimension_scores": aggregate_res.get("dimension_scores"),
            "insights": aggregate_res.get("insights"),
            "summary_report": aggregate_res.get("summary_report"),
            "language_summary": aggregate_res.get("language_summary"),
            "camera_conduct": aggregate_res.get("camera_conduct"),
            "failed_reason": None,
        }

        # Persist completed evaluation (the per-answer results now live in it)
        interviews_collection.update_one(
            {"_id": obj_id},
            {"$unset": {"answer_analysis": ""}, "$set": {
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
        fail_now = datetime.utcnow()
        doc_now = interviews_collection.find_one({"_id": obj_id})
        existing_eval = doc_now.get("evaluation") if isinstance(doc_now, dict) else None
        if not isinstance(existing_eval, dict):
            fail_set = {
                "evaluation_status": "failed",
                "evaluation": {
                    "completed_at": fail_now,
                    "failed_reason": str(e),
                },
            }
        else:
            fail_set = {
                "evaluation_status": "failed",
                "evaluation.completed_at": fail_now,
                "evaluation.failed_reason": str(e),
            }
        interviews_collection.update_one({"_id": obj_id}, {"$set": fail_set})
        raise e
