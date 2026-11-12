"""
Deleting interview recordings (NFR 11 - Controlled Data Usage).

Recordings exist only to assess the interview. Once the evaluation is
finished they can be deleted by the candidate at any time. If the operator
sets MEDIA_RETENTION_DAYS, recordings older than that are also deleted
automatically at start-up (off unless set, so existing data is never removed
by surprise). Scores, transcripts and feedback stay; only the audio/video
files are removed.
"""
import logging
import os
from datetime import datetime, timedelta

from database import interviews_collection
from services.media_storage import get_media_storage

logger = logging.getLogger(__name__)

# Evaluation states in which the recordings are no longer needed.
FINISHED_EVALUATION_STATES = ("completed", "failed")


def delete_interview_recordings(interview: dict, reason: str) -> int:
    """Removes every recording of one interview and marks its responses.
    Returns the number of files deleted."""
    interview_id = str(interview["_id"])
    removed = get_media_storage().delete_interview(interview_id)
    responses = []
    for r in interview.get("responses") or []:
        r = dict(r)
        if r.get("media_url"):
            r["media_url"] = None
            r["media_deleted"] = True
        responses.append(r)
    interviews_collection.update_one(
        {"_id": interview["_id"]},
        {"$set": {
            "responses": responses,
            "recordings_deleted_at": datetime.utcnow(),
            "recordings_deleted_reason": reason,
        }},
    )
    return removed


def retention_days():
    """Configured retention in days, or None when automatic deletion is off."""
    value = (os.getenv("MEDIA_RETENTION_DAYS") or "").strip()
    try:
        return max(1, int(value)) if value else None
    except ValueError:
        return None


def purge_expired_recordings(days: int = None) -> int:
    """Deletes recordings of interviews finished more than `days` ago.
    Returns the number of interviews purged."""
    days = days or retention_days()
    if not days:
        return 0
    cutoff = datetime.utcnow() - timedelta(days=days)
    cursor = interviews_collection.find({
        "status": "Completed",
        "completed_at": {"$lt": cutoff},
        "evaluation_status": {"$in": list(FINISHED_EVALUATION_STATES)},
        "recordings_deleted_at": {"$exists": False},
        "responses.media_url": {"$nin": [None, ""]},
    })
    purged = 0
    for interview in cursor:
        try:
            delete_interview_recordings(interview, f"retention ({days} days)")
            purged += 1
        except Exception as err:  # never block startup on one bad folder
            logger.warning("Retention purge skipped %s: %s", interview.get("_id"), err)
    return purged
