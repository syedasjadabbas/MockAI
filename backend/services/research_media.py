"""
Recordings that may be reused beyond assessing their own interview (NFR 11).

A candidate's recordings are used only to assess that interview unless they
ticked the optional "Help improve MockAI" consent (recording_consent.
research_use). The calibration and rating-sheet tools read recordings through
this module only, so they never touch a recording without that permission.

The development team's own test sessions can be named explicitly with
--interview-ids (the operator confirms they own those recordings).
"""
from pathlib import Path
from typing import Iterable, Iterator, Optional, Tuple

from bson import ObjectId

from database import interviews_collection
from services.media_storage import get_media_storage


def research_consent_filter(extra_interview_ids: Iterable[str] = ()) -> dict:
    ids = [ObjectId(i) for i in extra_interview_ids if ObjectId.is_valid(i)]
    clauses = [{"recording_consent.research_use": True}]
    if ids:
        clauses.append({"_id": {"$in": ids}})
    return {"$or": clauses}


def consented_recordings(extra_interview_ids: Iterable[str] = ()) -> Iterator[Tuple[str, Path]]:
    """Yields (label, readable_path) for every stored spoken answer the
    candidate allowed to be reused. label is "<interview_id>/<question_id>"."""
    storage = get_media_storage()
    cursor = interviews_collection.find(research_consent_filter(extra_interview_ids), {"responses": 1}).sort("created_at", 1)
    for interview in cursor:
        for response in interview.get("responses") or []:
            ref = response.get("media_url")
            path: Optional[Path] = storage.resolve_path(ref) if ref else None
            if path:
                yield f"{interview['_id']}/{response.get('question_id')}", path


def parse_ids(value: Optional[str]) -> list:
    return [v.strip() for v in (value or "").split(",") if v.strip()]
