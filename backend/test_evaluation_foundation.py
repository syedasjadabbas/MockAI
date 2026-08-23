"""
Evaluation Foundation backend test suite.

Covers: the evaluation_pipeline module composing the four AI interfaces
honestly (Null services -> "not_implemented", never fabricated data), the
candidate-facing lifecycle endpoints (start/get), the internal
results-submission endpoint's own auth boundary and state-machine rules,
ownership enforcement, invalid-ID handling, and - explicitly - that no
fake score is ever persisted by anything in this phase.

Run with: ../.venv/Scripts/python.exe test_evaluation_foundation.py
"""
import os
import time

from bson import ObjectId
from fastapi.testclient import TestClient

from main import app
from database import interviews_collection
from services.ai_interfaces import (
    NullASRService, NullNLPService, NullVisionService, NullFusionService,
)
from services.evaluation_pipeline import run_evaluation_pipeline, analyze_response

client = TestClient(app)


def expect(condition, message):
    if not condition:
        raise AssertionError(message)
    print(f"[PASS] {message}")


def register_and_login(label: str):
    email = f"eval.{label}.{int(time.time() * 1000)}@example.com"
    password = "EvalTest123"
    reg = client.post("/candidate/register", json={
        "name": f"Eval Candidate {label}", "email": email,
        "password": password, "confirm_password": password,
    })
    expect(reg.status_code == 201, f"Candidate {label} registers successfully")
    return reg.json()["access_token"]


def complete_a_real_interview(headers):
    """Uses the real, already-tested interview flow to get a genuinely
    Completed interview to evaluate - no shortcuts into interviews_collection."""
    cats = client.get("/candidate/categories", headers=headers).json()
    category_id = cats[0]["id"]
    start = client.post("/candidate/interviews", json={"category_id": category_id, "type": "technical"}, headers=headers)
    interview = start.json()
    for q in interview["questions"]:
        client.post(f"/candidate/interviews/{interview['id']}/responses", json={
            "question_id": q["question_id"], "duration_seconds": 10, "size_bytes": 1000,
        }, headers=headers)
    client.post(f"/candidate/interviews/{interview['id']}/complete", headers=headers)
    return interview["id"]


def test_evaluation_pipeline_unit():
    print("--- Unit: evaluation_pipeline composes the Null services honestly ---\n")

    result = analyze_response("q1", None, None, NullASRService(), NullNLPService(), NullVisionService(), NullFusionService())
    expect(result["asr"]["status"] == "not_implemented", "analyze_response: ASR stage reports not_implemented")
    expect(result["asr"]["transcript"] is None, "analyze_response: no fabricated transcript")
    expect(result["text_analysis"]["status"] == "not_implemented", "analyze_response: NLP stage reports not_implemented")
    expect(result["facial_analysis"]["status"] == "not_implemented", "analyze_response: Vision stage reports not_implemented")
    expect(result["multimodal"]["status"] == "not_implemented", "analyze_response: Fusion stage reports not_implemented")
    expect(result["multimodal"]["integrated_score"] is None, "analyze_response: no fabricated integrated_score")

    fake_interview_doc = {
        "questions": [{"question_id": "q1"}, {"question_id": "q2"}],
        "responses": [
            {"question_id": "q1", "media_url": None, "duration_seconds": 5},
            {"question_id": "q2", "media_url": None, "duration_seconds": 7},
        ],
    }
    pipeline_result = run_evaluation_pipeline(fake_interview_doc)
    expect(len(pipeline_result["per_question"]) == 2, "run_evaluation_pipeline: produces one entry per question")
    expect(pipeline_result["status"] == "not_implemented", "run_evaluation_pipeline: aggregate honestly reports not_implemented")
    expect(pipeline_result["overall_score"] is None, "run_evaluation_pipeline: no fabricated overall_score")
    expect(pipeline_result["strengths"] is None, "run_evaluation_pipeline: no fabricated strengths")

    print()


def test_evaluation_api():
    print("--- API: candidate lifecycle + internal results endpoint ---\n")

    token_a = register_and_login("A")
    token_b = register_and_login("B")
    headers_a = {"Authorization": f"Bearer {token_a}"}
    headers_b = {"Authorization": f"Bearer {token_b}"}
    internal_headers = {"X-Internal-Key": os.getenv("INTERNAL_SERVICE_KEY", "")}

    admin_login = client.post("/admin/login", json={"email": "admin@mockai.com", "password": "admin123"})
    admin_headers = {"Authorization": f"Bearer {admin_login.json()['access_token']}"}

    # -----------------------------------------------------------------
    # Unauthorized / invalid access
    # -----------------------------------------------------------------
    no_auth = client.get("/candidate/interviews/000000000000000000000000/evaluation")
    expect(no_auth.status_code == 401, "GET evaluation with no token returns 401")

    admin_on_candidate = client.get("/candidate/interviews/000000000000000000000000/evaluation", headers=admin_headers)
    expect(admin_on_candidate.status_code == 401, "An Admin's token is REJECTED on the candidate evaluation route")

    bad_id = client.get("/candidate/interviews/not-an-id/evaluation", headers=headers_a)
    expect(bad_id.status_code == 400, "Malformed interview ID returns 400")

    missing = client.get("/candidate/interviews/000000000000000000000000/evaluation", headers=headers_a)
    expect(missing.status_code == 404, "Well-formed but non-existent interview ID returns 404")

    # -----------------------------------------------------------------
    # Start requires a completed interview
    # -----------------------------------------------------------------
    cats = client.get("/candidate/categories", headers=headers_a).json()
    in_progress = client.post("/candidate/interviews", json={"category_id": cats[0]["id"], "type": "technical"}, headers=headers_a).json()
    start_too_early = client.post(f"/candidate/interviews/{in_progress['id']}/evaluation/start", headers=headers_a)
    expect(start_too_early.status_code == 400, "Starting evaluation on a not-yet-completed interview is rejected with 400")

    # -----------------------------------------------------------------
    # Full real flow: complete an interview, then run the lifecycle
    # -----------------------------------------------------------------
    interview_id = complete_a_real_interview(headers_a)

    initial_eval = client.get(f"/candidate/interviews/{interview_id}/evaluation", headers=headers_a)
    expect(initial_eval.status_code == 200, "GET evaluation right after completion returns 200")
    expect(initial_eval.json()["evaluation_status"] == "pending_evaluation", "evaluation_status is 'pending_evaluation' right after completion (preserved from the interview phase)")

    # Candidate B can never touch Candidate A's evaluation
    b_start_attempt = client.post(f"/candidate/interviews/{interview_id}/evaluation/start", headers=headers_b)
    expect(b_start_attempt.status_code == 404, "Candidate B cannot start Candidate A's evaluation")
    b_get_attempt = client.get(f"/candidate/interviews/{interview_id}/evaluation", headers=headers_b)
    expect(b_get_attempt.status_code == 404, "Candidate B cannot read Candidate A's evaluation")

    start_resp = client.post(f"/candidate/interviews/{interview_id}/evaluation/start", headers=headers_a)
    expect(start_resp.status_code == 200, f"Starting evaluation succeeds (got {start_resp.status_code}: {start_resp.text})")
    expect(start_resp.json()["evaluation_status"] == "processing", "evaluation_status becomes 'processing'")

    double_start = client.post(f"/candidate/interviews/{interview_id}/evaluation/start", headers=headers_a)
    expect(double_start.status_code == 400, "Starting evaluation a second time (already processing) is rejected with 400")

    # Nothing fake has been written anywhere while processing
    db_doc = interviews_collection.find_one({"_id": ObjectId(interview_id)})
    expect(db_doc["score"] is None, "score is still null in MongoDB while evaluation is only 'processing' - nothing fabricated")
    expect(db_doc["evaluation"]["overall_score"] is None, "evaluation.overall_score is still null while processing")
    history_entry = next(i for i in client.get("/candidate/interviews", headers=headers_a).json() if i["id"] == interview_id)
    expect(history_entry["score"] is None, "History list still shows a null score while evaluation is only 'processing'")

    # -----------------------------------------------------------------
    # Internal endpoint - auth boundary
    # -----------------------------------------------------------------
    no_key = client.put(f"/internal/evaluations/{interview_id}", json={"status": "completed", "overall_score": 80, "confidence_score": 75, "stress_level": "Low"})
    expect(no_key.status_code == 401, "Internal endpoint with no key returns 401")

    wrong_key = client.put(f"/internal/evaluations/{interview_id}", json={"status": "completed", "overall_score": 80, "confidence_score": 75, "stress_level": "Low"}, headers={"X-Internal-Key": "wrong"})
    expect(wrong_key.status_code == 401, "Internal endpoint with a wrong key returns 401")

    candidate_key_attempt = client.put(f"/internal/evaluations/{interview_id}", json={"status": "completed", "overall_score": 80, "confidence_score": 75, "stress_level": "Low"}, headers=headers_a)
    expect(candidate_key_attempt.status_code == 401, "A Candidate JWT alone (no internal key) cannot reach the internal endpoint")

    admin_key_attempt = client.put(f"/internal/evaluations/{interview_id}", json={"status": "completed", "overall_score": 80, "confidence_score": 75, "stress_level": "Low"}, headers=admin_headers)
    expect(admin_key_attempt.status_code == 401, "An Admin JWT alone (no internal key) cannot reach the internal endpoint")

    # -----------------------------------------------------------------
    # Internal endpoint - state machine + validation
    # -----------------------------------------------------------------
    bad_status = client.put(f"/internal/evaluations/{interview_id}", json={"status": "bogus"}, headers=internal_headers)
    expect(bad_status.status_code == 400, "Internal endpoint rejects an invalid status value")

    incomplete_payload = client.put(f"/internal/evaluations/{interview_id}", json={"status": "completed"}, headers=internal_headers)
    expect(incomplete_payload.status_code == 400, "Internal endpoint rejects a 'completed' submission missing required score fields")

    missing_interview = client.put("/internal/evaluations/000000000000000000000000", json={"status": "completed", "overall_score": 1, "confidence_score": 1, "stress_level": "Low"}, headers=internal_headers)
    expect(missing_interview.status_code == 404, "Internal endpoint returns 404 for a non-existent interview")

    submit_resp = client.put(f"/internal/evaluations/{interview_id}", json={
        "status": "completed",
        "overall_score": 82.5,
        "confidence_score": 77.0,
        "stress_level": "Low",
        "interpretation": "Strong technical communication overall.",
        "strengths": ["Clear explanations"],
        "weaknesses": ["Could use more concrete examples"],
        "suggestions": ["Prepare 2-3 project stories in advance"],
        "per_question": [],
    }, headers=internal_headers)
    expect(submit_resp.status_code == 200, f"Internal endpoint accepts a valid completed submission (got {submit_resp.status_code}: {submit_resp.text})")
    expect(submit_resp.json()["evaluation_status"] == "completed", "evaluation_status becomes 'completed'")

    # Now, and only now, real values exist
    final_doc = interviews_collection.find_one({"_id": ObjectId(interview_id)})
    expect(final_doc["score"] == 82.5, "Top-level score is set for Admin compatibility ONLY after a real submission")
    expect(final_doc["confidence"] == 77.0, "Top-level confidence is set for Admin compatibility")
    expect(final_doc["stress"] == "Low", "Top-level stress is set for Admin compatibility")
    expect(final_doc["evaluation"]["overall_score"] == 82.5, "Nested evaluation.overall_score matches the submission")

    final_get = client.get(f"/candidate/interviews/{interview_id}/evaluation", headers=headers_a)
    expect(final_get.json()["evaluation"]["strengths"] == ["Clear explanations"], "Candidate can now read the real (non-fabricated) evaluation")

    # Cannot re-submit once completed
    resubmit = client.put(f"/internal/evaluations/{interview_id}", json={
        "status": "completed", "overall_score": 1, "confidence_score": 1, "stress_level": "Low",
    }, headers=internal_headers)
    expect(resubmit.status_code == 409, "Internal endpoint rejects a second submission once already 'completed'")

    # Admin regression check while real evaluation data now exists
    admin_interviews = client.get("/admin/interviews", headers=admin_headers)
    expect(admin_interviews.status_code == 200, "Admin's existing /admin/interviews still works with a real evaluated interview present")

    # -----------------------------------------------------------------
    # Failed path
    # -----------------------------------------------------------------
    second_interview_id = complete_a_real_interview(headers_a)
    client.post(f"/candidate/interviews/{second_interview_id}/evaluation/start", headers=headers_a)

    fail_missing_reason = client.put(f"/internal/evaluations/{second_interview_id}", json={"status": "failed"}, headers=internal_headers)
    expect(fail_missing_reason.status_code == 400, "Internal endpoint requires failed_reason when status is 'failed'")

    fail_resp = client.put(f"/internal/evaluations/{second_interview_id}", json={"status": "failed", "failed_reason": "ASR provider unavailable"}, headers=internal_headers)
    expect(fail_resp.status_code == 200, "Internal endpoint accepts a valid 'failed' submission")
    expect(fail_resp.json()["evaluation_status"] == "failed", "evaluation_status becomes 'failed'")

    failed_doc = interviews_collection.find_one({"_id": ObjectId(second_interview_id)})
    expect(failed_doc["score"] is None, "A failed evaluation never sets a fabricated top-level score")

    print("\nALL EVALUATION FOUNDATION TESTS PASSED SUCCESSFULLY!")
    return True


if __name__ == "__main__":
    test_evaluation_pipeline_unit()
    test_evaluation_api()
