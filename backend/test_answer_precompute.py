"""
Tests for analysing each spoken answer right after upload and reusing that
result in the final evaluation job. Uses the separate test database; the
speech and scoring engines are mocked so only the reuse logic is exercised.

Run with: ../.venv311/Scripts/python.exe test_answer_precompute.py
"""
import os
from datetime import datetime, timedelta
from types import SimpleNamespace
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


class FakeASR:
    calls = 0

    def transcribe(self, media_url, duration_seconds=None):
        FakeASR.calls += 1
        return SimpleNamespace(transcript="a real answer", status="completed", provider="fake", __dataclass_fields__={})


def fake_asdict(asr):
    return {"transcript": asr.transcript, "status": asr.status, "provider": asr.provider}


scored = []


def fake_evaluate(**kw):
    scored.append(kw["question_id"])
    return {"question_id": kw["question_id"], "transcript": kw["transcript"], "final_score": 50.0}


def fake_aggregate(per_question):
    return {"overall_score": 50.0, "confidence_score": 60.0, "stress_level": "Low", "interpretation": "",
            "strengths": [], "weaknesses": [], "suggestions": []}


def make_interview(n=3):
    taken = datetime.utcnow().replace(microsecond=0)
    qs = [{"question_id": f"q{i}", "question_text": f"Question {i}", "expected_answer": "x"} for i in range(n)]
    rs = [{"question_id": f"q{i}", "sequence": i, "media_url": f"interviews/t/q{i}/response.webm",
           "recorded_at": taken, "duration_seconds": 10.0, "response_mode": "spoken"} for i in range(n)]
    doc = {"user_id": "precompute-test", "status": "In Progress", "evaluation_status": "pending_evaluation",
           "questions": qs, "responses": rs}
    doc["_id"] = interviews_collection.insert_one(doc).inserted_id
    return str(doc["_id"])


def run():
    expect(DATABASE_NAME.endswith("_test"), f"Running against the test database ({DATABASE_NAME})")
    with patch.object(W, "GoogleSpeechASRService", FakeASR), patch.object(W, "asdict", fake_asdict), \
            patch.object(W, "evaluate_question_response", side_effect=fake_evaluate), \
            patch.object(W, "aggregate_interview_evaluation", side_effect=fake_aggregate):
        iid = make_interview()
        for i in range(3):
            W.schedule_answer_analysis(iid, f"q{i}", f"interviews/t/q{i}/response.webm")
        W._wait_for_answer_analysis(iid)
        doc = interviews_collection.find_one({"_id": W.ObjectId(iid)})
        expect(set(doc.get("answer_analysis", {})) == {"q0", "q1", "q2"}, "Every uploaded answer is analysed in the background")
        expect(FakeASR.calls == 3 and scored == ["q0", "q1", "q2"], "Each answer is transcribed and scored once")

        # The candidate re-records q1 after it was analysed: same file path, new take.
        interviews_collection.update_one({"_id": W.ObjectId(iid), "responses.question_id": "q1"},
                                         {"$set": {"responses.$.recorded_at": datetime.utcnow() + timedelta(seconds=5)}})
        scored.clear()
        FakeASR.calls = 0
        W.evaluate_interview_job(iid)
        doc = interviews_collection.find_one({"_id": W.ObjectId(iid)})
        expect(scored == ["q1"], "Final job reuses the analysed answers and only redoes the re-recorded one")
        expect(FakeASR.calls == 1, "Only the re-recorded answer is transcribed again")
        expect(doc["evaluation_status"] == "completed" and len(doc["evaluation"]["per_question"]) == 3,
               "Evaluation completes with one result per question")
        expect([q["question_id"] for q in doc["evaluation"]["per_question"]] == ["q0", "q1", "q2"],
               "Results keep the question order")
        expect("answer_analysis" not in doc, "Temporary per-answer results are cleared once the evaluation is stored")

        # A stale job for an answer that no longer matches is skipped.
        iid2 = make_interview(1)
        scored.clear()
        W.schedule_answer_analysis(iid2, "q0", "interviews/t/old/response.webm")
        W._wait_for_answer_analysis(iid2)
        doc2 = interviews_collection.find_one({"_id": W.ObjectId(iid2)})
        expect(not scored and "answer_analysis" not in doc2, "A job for a replaced recording does nothing")

    interviews_collection.delete_many({"user_id": "precompute-test"})
    print(f"\nALL {passed} ANSWER PRE-ANALYSIS TESTS PASSED")


if __name__ == "__main__":
    run()
