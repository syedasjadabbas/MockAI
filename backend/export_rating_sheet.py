"""
Blind rating sheet for Objective 7 accuracy testing (see
docs/EVALUATION_VALIDATION_PLAN.md, step 2 "Annotate").

Writes one row per answered question of every evaluated interview: the
question, the transcript and the recording to watch, plus empty columns for
the human raters. MockAI's own scores are deliberately left out so raters are
not anchored by them. Fill the sheet (one copy per rater, or one row per
rater per answer), then run:

    python evaluate_accuracy.py --ratings filled_sheet.csv

Usage (from backend/):
    python export_rating_sheet.py --out ../scratch/rating_sheet.csv [--rater "Name"]

Read-only: never modifies the database. The sheet contains candidates'
transcripts - keep it out of git.
"""
import argparse
import csv
import sys

from database import interviews_collection
from services.media_storage import get_media_storage

RATER_COLUMNS = [
    "human_score",             # 0-100 overall quality of the answer
    "confidence_1to5",         # perceived confidence, 1 (very low) - 5 (very high)
    "stress_1to5",             # perceived stress / nervousness, 1 (calm) - 5 (very stressed)
    "expression_consistency",  # steady / some change / frequent change
    "dominant_expression",     # neutral, happiness, surprise, sadness, anger, disgust, fear, contempt, other
    "usable",                  # yes / no (audible speech, face visible)
    "rater",
]


def build_rows(rater: str = ""):
    storage = get_media_storage()
    rows = []
    cursor = interviews_collection.find(
        {"evaluation_status": "completed"},
        {"user_id": 1, "role": 1, "target_role": 1, "questions": 1, "responses": 1, "evaluation.per_question": 1, "created_at": 1},
    ).sort("created_at", 1)
    for interview in cursor:
        questions = {q.get("question_id"): q for q in interview.get("questions") or []}
        responses = {r.get("question_id"): r for r in interview.get("responses") or []}
        for evaluated in (interview.get("evaluation") or {}).get("per_question") or []:
            qid = evaluated.get("question_id")
            response = responses.get(qid) or {}
            if not response:
                continue  # skipped question - nothing to rate
            media_path = storage.resolve_path(response.get("media_url")) if response.get("media_url") else None
            rows.append({
                "interview_id": str(interview["_id"]),
                "question_id": qid,
                "candidate_ref": str(interview.get("user_id") or "")[-6:],
                "role": interview.get("target_role") or interview.get("role") or "",
                "difficulty": (questions.get(qid) or {}).get("difficulty") or evaluated.get("difficulty") or "",
                "question_text": (questions.get(qid) or {}).get("question_text") or "",
                "answer_mode": evaluated.get("response_mode") or response.get("response_mode") or ("spoken" if response.get("media_url") else "text"),
                "duration_seconds": response.get("duration_seconds") or "",
                "recording_file": str(media_path) if media_path else ("" if not response.get("media_url") else "not on this computer"),
                "transcript": ((evaluated.get("asr") or {}).get("transcript") or ""),
                **{column: "" for column in RATER_COLUMNS},
                "rater": rater,
            })
    return rows


def main() -> int:
    parser = argparse.ArgumentParser(description="Export a blind human-rating sheet (Objective 7)")
    parser.add_argument("--out", required=True, metavar="CSV", help="where to write the sheet")
    parser.add_argument("--rater", default="", help="pre-fill the rater column")
    args = parser.parse_args()

    rows = build_rows(args.rater)
    if not rows:
        print("No evaluated answers found.")
        return 1
    with open(args.out, "w", newline="", encoding="utf-8-sig") as f:
        writer = csv.DictWriter(f, fieldnames=list(rows[0].keys()))
        writer.writeheader()
        writer.writerows(rows)
    with_media = sum(1 for r in rows if r["recording_file"] and r["recording_file"] != "not on this computer")
    interviews = len({r["interview_id"] for r in rows})
    print(f"Wrote {len(rows)} answers from {interviews} interviews to {args.out}")
    print(f"  {with_media} have their recording on this computer; "
          f"{sum(1 for r in rows if r['answer_mode'] == 'text')} are typed answers.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
