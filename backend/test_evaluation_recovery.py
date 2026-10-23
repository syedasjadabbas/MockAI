"""
Tests for recovering evaluations stuck in "processing" (the background job
died with a restart or crash). Uses the separate test database.

Run with: ../.venv311/Scripts/python.exe test_evaluation_recovery.py
"""
import os
from datetime import datetime, timedelta
from unittest.mock import patch

os.environ["TESTING"] = "1"

from database import interviews_collection, DATABASE_NAME
from services import evaluation_worker as W

passed = 0


def expect(cond, msg):
    global passed
    if not cond:
        raise AssertionError(msg)
    passed += 1
    print(f"[PASS] {msg}")


def make(minutes_ago, attempts=0, status="processing"):
    doc = {
        "user_id": "recovery-test",
        "status": "Completed",
        "evaluation_status": status,
        "evaluation": {"started_at": datetime.utcnow() - timedelta(minutes=minutes_ago), "recovery_attempts": attempts},
        "questions": [],
        "responses": [],
    }
    doc["_id"] = interviews_collection.insert_one(doc).inserted_id
    return doc


def fetch(doc):
    return interviews_collection.find_one({"_id": doc["_id"]})


def run():
    expect(DATABASE_NAME.endswith("_test"), f"Running against the test database ({DATABASE_NAME})")
    dispatched = []
    with patch.object(W, "_run_in_background", side_effect=lambda iid: dispatched.append(iid)):
        stuck = make(60)
        expect(W.recover_stuck_evaluation(fetch(stuck)) == "redispatched", "Job stuck for 60 min is re-dispatched")
        after = fetch(stuck)
        expect(after["evaluation"]["recovery_attempts"] == 1, "Recovery attempt is counted")
        expect((datetime.utcnow() - after["evaluation"]["started_at"]).total_seconds() < 60, "started_at refreshed on claim")
        expect(W.recover_stuck_evaluation(after) is None, "Just-claimed job is not re-dispatched again by the next poll")
        expect(W.recover_stuck_evaluation(fetch(stuck) | {"evaluation": stuck["evaluation"]}) is None,
               "A stale copy cannot claim the job twice (atomic claim)")

        fresh = make(2)
        expect(W.recover_stuck_evaluation(fetch(fresh)) is None, "Job running for 2 min is left alone")

        exhausted = make(60, attempts=W.MAX_RECOVERY_ATTEMPTS)
        expect(W.recover_stuck_evaluation(fetch(exhausted)) == "failed", "After the retry limit the evaluation is marked failed")
        doc = fetch(exhausted)
        expect(doc["evaluation_status"] == "failed" and "did not finish" in doc["evaluation"]["failed_reason"],
               "Failed evaluation carries a reason for the candidate")

        busy = make(60)
        W._active_jobs.add(str(busy["_id"]))
        try:
            expect(W.recover_stuck_evaluation(fetch(busy)) is None, "Job still queued in this process is not duplicated")
        finally:
            W._active_jobs.discard(str(busy["_id"]))

        done = make(60, status="completed")
        expect(W.recover_stuck_evaluation(fetch(done)) is None, "Completed evaluations are never touched")

        dispatched.clear()
        orphan = make(1)  # restart: even a 1-minute-old job is orphaned
        recovered = W.recover_stuck_evaluations(stale_minutes=0)
        expect(str(orphan["_id"]) in recovered, "Startup sweep resumes every orphaned evaluation")
        expect(str(fresh["_id"]) in recovered, "Startup sweep also resumes the 2-minute-old job")

    interviews_collection.delete_many({"user_id": "recovery-test"})
    print(f"\nALL {passed} EVALUATION RECOVERY CHECKS PASSED SUCCESSFULLY!")


if __name__ == "__main__":
    run()
