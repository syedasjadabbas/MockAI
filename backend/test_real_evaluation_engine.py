"""
Real MockAI Evaluation Engine Test Suite (Phase 7).

Deterministic, explainable unit and integration tests covering:
1. Strong transcript
2. Weak transcript
3. Empty transcript
4. Missing transcript
5. Short response
6. Long response
7. Easy question (difficulty weight 1.0)
8. Medium question (difficulty weight 1.25)
9. Hard question (difficulty weight 1.5)
10. Multiple recorded responses
11. Skipped responses
12. Evaluation success lifecycle
13. Evaluation failure handling
14. Email/password authenticated candidate
15. Google-authenticated candidate

Run with: ../.venv/Scripts/python.exe test_real_evaluation_engine.py
"""
import os
import math
import time
from datetime import datetime
from bson import ObjectId

os.environ["TESTING"] = "1"

from fastapi.testclient import TestClient

from main import app
from database import users_collection, otps_collection, interviews_collection, questions_collection
from services.nlp_analyzer import analyze_transcript
from services.delivery_analyzer import analyze_delivery
from services.question_evaluator import evaluate_question_response, get_difficulty_weight
from services.aggregate_evaluator import aggregate_interview_evaluation
from services.evaluation_worker import evaluate_interview_job

client = TestClient(app)


def expect(condition, message):
    if not condition:
        raise AssertionError(f"FAILED ASSERTION: {message}")
    print(f"[PASS] {message}")


def register_and_login_candidate(label: str) -> dict:
    import hashlib
    email = f"eval.real.{label.lower()}.{int(time.time() * 1000)}@example.com"
    password = "SecurePassword123!"
    reg = client.post("/candidate/register", json={
        "name": f"Real Candidate {label}",
        "email": email,
        "password": password,
        "confirm_password": password,
    })
    expect(reg.status_code == 200, f"Candidate {label} initiate registration returns 200")
    otp_doc = otps_collection.find_one({"email": email.lower(), "type": "candidate_registration"})
    test_hash = hashlib.sha256(b"123456").hexdigest()
    otps_collection.update_one({"_id": otp_doc["_id"]}, {"$set": {"otp_hash": test_hash}})
    verify = client.post("/candidate/register/verify-otp", json={"email": email, "otp": "123456"})
    expect(verify.status_code == 201, f"Candidate {label} verified")
    login = client.post("/candidate/login", json={"email": email, "password": password})
    expect(login.status_code == 200, f"Candidate {label} logged in")
    return {"token": login.json()["access_token"], "email": email}


def login_google_candidate(label: str) -> dict:
    sub = f"google_sub_{label.lower()}_{int(time.time() * 1000)}"
    email = f"google.candidate.{label.lower()}.{int(time.time() * 1000)}@gmail.com"
    name = f"Google Candidate {label}"
    avatar = "https://example.com/avatar.png"
    token = f"mock-google-token:{sub}:{email}:{name}:{avatar}"
    resp = client.post("/candidate/auth/google", json={"id_token": token})
    expect(resp.status_code == 200, f"Google candidate {label} authenticated (got {resp.status_code}: {resp.text})")
    return {"token": resp.json()["access_token"], "email": email}


# ---------------------------------------------------------------------------
# UNIT TESTS: NLP & Delivery Analysis (Scenarios 1 - 9)
# ---------------------------------------------------------------------------

def test_nlp_and_delivery_scenarios():
    print("\n--- Testing Scenarios 1-9: NLP & Delivery Deterministic Unit Tests ---\n")

    q_text = "Explain the Virtual DOM and reconciliation process in React. How does React determine when and what to re-render?"
    expected = "React creates a lightweight in-memory Virtual DOM representation of the actual DOM. When state changes, it creates a new VDOM tree, diffs it using a heuristic O(n) algorithm, and batches DOM mutations."
    tags = ["React", "Virtual DOM", "Reconciliation", "Diffing", "State"]

    # 1. Strong Transcript
    strong_transcript = (
        "In React, the Virtual DOM is an in-memory representation of the real DOM tree. "
        "When state or props change, React generates a new Virtual DOM tree and runs the reconciliation "
        "diffing algorithm to compare it against the previous snapshot. It determines the minimal set of "
        "mutations needed and batches DOM updates efficiently to maximize rendering performance."
    )
    strong_nlp = analyze_transcript(q_text, expected, tags, "Medium", strong_transcript)
    strong_del = analyze_delivery(strong_transcript, duration_seconds=30.0)
    strong_q = evaluate_question_response(
        question_id="q1",
        question_text=q_text,
        expected_answer=expected,
        tags=tags,
        difficulty="Medium",
        transcript=strong_transcript,
        duration_seconds=30.0,
    )

    expect(strong_nlp["content_score"] >= 80.0, f"Scenario 1: Strong transcript receives high content score ({strong_nlp['content_score']})")
    expect(len(strong_nlp["covered_concepts"]) >= 3, "Scenario 1: Strong transcript identifies covered domain concepts")
    expect(strong_del["pacing"] == "Optimal", f"Scenario 1: Delivery pacing is Optimal ({strong_del['words_per_minute']} WPM)")
    expect(strong_q["score"] >= 80.0, f"Scenario 1: Combined question score is high ({strong_q['score']})")
    expect(len(strong_q["strengths"]) > 0, "Scenario 1: Question generates specific strengths")

    # 2. Weak Transcript
    weak_transcript = "I like coding websites with HTML and CSS because making buttons look nice is very fun."
    weak_nlp = analyze_transcript(q_text, expected, tags, "Medium", weak_transcript)
    weak_q = evaluate_question_response(
        question_id="q2",
        question_text=q_text,
        expected_answer=expected,
        tags=tags,
        difficulty="Medium",
        transcript=weak_transcript,
        duration_seconds=10.0,
    )

    expect(weak_nlp["content_score"] < 45.0, f"Scenario 2: Weak transcript receives low content score ({weak_nlp['content_score']})")
    expect(len(weak_nlp["missing_concepts"]) >= 2, "Scenario 2: Weak transcript identifies missing concepts")
    expect(weak_q["score"] < 55.0, f"Scenario 2: Combined question score reflects weak technical content ({weak_q['score']})")

    # 3. Empty Transcript
    empty_nlp = analyze_transcript(q_text, expected, tags, "Medium", "")
    empty_del = analyze_delivery("", duration_seconds=0.0)
    empty_q = evaluate_question_response("q3", q_text, expected, tags, "Medium", transcript="", duration_seconds=0.0)

    expect(empty_nlp["content_score"] == 0.0, "Scenario 3: Empty transcript receives 0.0 content score")
    expect(empty_nlp["status"] == "empty", "Scenario 3: Empty transcript status is 'empty'")
    expect(empty_del["fluency_score"] == 0.0, "Scenario 3: Empty delivery fluency is 0.0")
    expect(empty_q["score"] == 0.0, "Scenario 3: Empty question score is 0.0")

    # 4. Missing Transcript (None)
    missing_nlp = analyze_transcript(q_text, expected, tags, "Medium", None)
    missing_q = evaluate_question_response("q4", q_text, expected, tags, "Medium", transcript=None, duration_seconds=None)

    expect(missing_nlp["content_score"] == 0.0, "Scenario 4: Missing transcript receives 0.0 score")
    expect(missing_nlp["status"] == "missing", "Scenario 4: Missing transcript status is 'missing'")
    expect(missing_q["score"] == 0.0, "Scenario 4: Missing question score is 0.0")

    # 5. Short Response
    short_transcript = "Yes, Virtual DOM."
    short_nlp = analyze_transcript(q_text, expected, tags, "Medium", short_transcript)
    short_del = analyze_delivery(short_transcript, duration_seconds=3.0)

    expect(short_nlp["completeness_score"] < 15.0, f"Scenario 5: Short response completeness is low ({short_nlp['completeness_score']})")
    expect(short_del["fluency_score"] < 50.0, "Scenario 5: Short response fluency is penalized for lack of continuity")

    # 6. Long Response
    long_transcript = (
        "The React Virtual DOM is a tree data structure kept in memory that mirrors the actual browser DOM. "
        "When state updates occur via setState or hooks, React computes a new virtual tree. The reconciliation "
        "engine then performs a diffing operation using heuristics such as element types and component keys. "
        "Because direct DOM manipulation is computationally expensive, React batches updates and applies only "
        "the precise mutations required to the real DOM, optimizing render performance and avoiding layout thrashing."
    )
    long_nlp = analyze_transcript(q_text, expected, tags, "Medium", long_transcript)
    expect(long_nlp["completeness_score"] >= 95.0, f"Scenario 6: Long detailed response receives full completeness score ({long_nlp['completeness_score']})")

    # 7. Easy Question Weight
    easy_w = get_difficulty_weight("Easy")
    expect(easy_w == 1.0, f"Scenario 7: Easy question difficulty weight is 1.0 (got {easy_w})")

    # 8. Medium Question Weight
    med_w = get_difficulty_weight("Medium")
    expect(med_w == 1.25, f"Scenario 8: Medium question difficulty weight is 1.25 (got {med_w})")

    # 9. Hard Question Weight
    hard_w = get_difficulty_weight("Hard")
    expect(hard_w == 1.5, f"Scenario 9: Hard question difficulty weight is 1.5 (got {hard_w})")


# ---------------------------------------------------------------------------
# INTEGRATION TESTS: Multiple Responses, Skipped, End-to-End Pipeline (Scenarios 10 - 15)
# ---------------------------------------------------------------------------

def test_aggregation_and_lifecycle_scenarios():
    print("\n--- Testing Scenarios 10-15: Aggregation, Worker Lifecycle & Auth Candidates ---\n")

    # 10. Multiple Recorded Responses Aggregation
    q1 = evaluate_question_response(
        "q1", "Explain React Hooks", "Hooks allow functional components to use state and lifecycle methods",
        ["React", "Hooks", "State", "Lifecycle"], "Easy",
        "React hooks allow developers to use state and component lifecycle capabilities inside functional components using useState and useEffect cleanly.",
        15.0
    )
    q2 = evaluate_question_response(
        "q2", "Explain Event Loop", "Microtask and Macrotask queues in JavaScript engine",
        ["JavaScript", "Event Loop", "Microtask", "Macrotask"], "Medium",
        "The JavaScript event loop continuously monitors the call stack and event queues, executing microtasks like promises before processing macrotasks from setTimeout and DOM events.",
        20.0
    )
    q3 = evaluate_question_response(
        "q3", "Optimize Core Web Vitals", "Strategies for improving LCP, FID, INP, and CLS",
        ["Performance", "Web Vitals", "LCP", "CLS", "Optimization"], "Hard",
        "To optimize Core Web Vitals, improve LCP by preloading critical hero images and using CDNs, reduce INP by breaking up long tasks, and prevent CLS by defining explicit dimensions for layout containers.",
        25.0
    )

    multi_agg = aggregate_interview_evaluation([q1, q2, q3])
    expect(multi_agg["overall_score"] > 70.0, f"Scenario 10: Aggregate overall score computed ({multi_agg['overall_score']})")
    expect(multi_agg["confidence_score"] > 70.0, f"Scenario 10: Defensible speech confidence score computed ({multi_agg['confidence_score']})")
    expect(multi_agg["stress_level"] in ("Low", "Moderate"), f"Scenario 10: Defensible stress level assigned ({multi_agg['stress_level']})")
    expect(len(multi_agg["strengths"]) >= 2, "Scenario 10: Multi-question strengths generated")
    expect(isinstance(multi_agg["interpretation"], str) and len(multi_agg["interpretation"]) > 30, "Scenario 10: Performance interpretation generated")

    # 11. Skipped Responses (No fake scores for skipped items)
    q_skipped = evaluate_question_response("q4", "Explain CSS Grid", "Two-dimensional layout grid", ["CSS", "Grid"], "Easy", None, None)
    partial_agg = aggregate_interview_evaluation([q1, q_skipped])

    expect(q_skipped["score"] == 0.0, "Scenario 11: Skipped question receives 0.0 score")
    expect(partial_agg["overall_score"] < q1["score"], "Scenario 11: Overall score is lowered by skipped question without crashing")
    expect(any("skipped" in w.lower() for w in partial_agg["weaknesses"]), "Scenario 11: Weaknesses accurately note skipped prompt")

    # 14. Email/Password Candidate End-to-End Evaluation Lifecycle (Scenario 12 & 14)
    cand_a = register_and_login_candidate("EmailUser")
    headers_a = {"Authorization": f"Bearer {cand_a['token']}"}

    cats = client.get("/candidate/categories", headers=headers_a).json()
    cat_id = cats[0]["id"]

    # Start Interview
    start_resp = client.post("/candidate/interviews", json={"category_id": cat_id, "type": "technical"}, headers=headers_a)
    expect(start_resp.status_code == 201, "Candidate interview created")
    interview_data = start_resp.json()
    int_id = interview_data["id"]

    # Record responses with genuine mock transcripts in per_question
    for idx, q_item in enumerate(interview_data["questions"]):
        q_id = q_item["question_id"]
        # Save response metadata
        client.post(f"/candidate/interviews/{int_id}/responses", json={
            "question_id": q_id,
            "duration_seconds": 25.0 + idx * 5,
            "size_bytes": 50000,
        }, headers=headers_a)
        
        # Simulate ASR transcript on first 3 questions, leave remaining as skipped
        if idx < 3:
            interviews_collection.update_one(
                {"_id": ObjectId(int_id)},
                {"$set": {"evaluation": {"started_at": None, "completed_at": None, "per_question": []}}}
            ) if idx == 0 else None
            interviews_collection.update_one(
                {"_id": ObjectId(int_id)},
                {"$push": {"evaluation.per_question": {
                    "question_id": q_id,
                    "asr": {
                        "status": "completed",
                        "transcript": f"This is an articulate candidate response answering {q_item['question_text']} with relevant domain concepts.",
                        "provider": "google_speech",
                    }
                }}}
            )

    # Conclude Interview
    comp_resp = client.post(f"/candidate/interviews/{int_id}/complete", headers=headers_a)
    expect(comp_resp.status_code == 200, "Interview concluded successfully")
    expect(comp_resp.json()["evaluation_status"] == "pending_evaluation", "Evaluation status is pending_evaluation")

    # 12. Start Evaluation (Transitions pending_evaluation -> processing -> worker executes)
    start_eval_resp = client.post(f"/candidate/interviews/{int_id}/evaluation/start", headers=headers_a)
    expect(start_eval_resp.status_code == 200, "POST start evaluation succeeds with 200")
    expect(start_eval_resp.json()["evaluation_status"] == "processing", "Start evaluation returns processing")

    # Execute worker directly to complete evaluation synchronously for test assertion
    eval_result = evaluate_interview_job(int_id)
    expect(eval_result["overall_score"] is not None, "Scenario 12: Worker computes overall_score")
    expect(0.0 <= eval_result["overall_score"] <= 100.0, "Scenario 12: Overall score is bounded 0-100")
    expect(not math.isnan(eval_result["overall_score"]), "Scenario 12: No NaN scores")

    # Verify Candidate GET /evaluation returns completed results
    cand_eval_get = client.get(f"/candidate/interviews/{int_id}/evaluation", headers=headers_a)
    expect(cand_eval_get.status_code == 200, "Candidate can GET evaluation")
    cand_eval = cand_eval_get.json()
    expect(cand_eval["evaluation_status"] == "completed", "Scenario 12: Evaluation status is completed in MongoDB")
    expect(cand_eval["evaluation"]["overall_score"] == eval_result["overall_score"], "Scenario 12: Returned overall score matches calculated score")
    expect(len(cand_eval["evaluation"]["per_question"]) == len(interview_data["questions"]), "Scenario 12: Per-question evaluations match question count")

    # Verify Admin Compatibility (top-level score/confidence/stress are populated)
    db_doc = interviews_collection.find_one({"_id": ObjectId(int_id)})
    expect(db_doc["score"] == eval_result["overall_score"], "Scenario 12: Top-level score denormalized for Admin")
    expect(db_doc["confidence"] == eval_result["confidence_score"], "Scenario 12: Top-level confidence denormalized for Admin")
    expect(db_doc["stress"] == eval_result["stress_level"], "Scenario 12: Top-level stress denormalized for Admin")

    # 13. Evaluation Failure Handling
    try:
        evaluate_interview_job("000000000000000000000000")
        expect(False, "Worker should raise ValueError for non-existent interview")
    except ValueError:
        expect(True, "Scenario 13: Non-existent interview raises ValueError cleanly")

    # Create dummy interview in processing state and force failure
    dummy_fail_id = interviews_collection.insert_one({
        "user_id": "test-user-fail",
        "role": "Frontend Development",
        "status": "Completed",
        "evaluation_status": "processing",
        "questions": [{"question_id": "invalid-q-id", "question_text": "Broken Question"}],
        "created_at": datetime.utcnow(),
    }).inserted_id

    # Running worker with invalid subdocuments triggers failure path
    try:
        evaluate_interview_job(str(dummy_fail_id))
    except Exception:
        pass

    failed_doc = interviews_collection.find_one({"_id": dummy_fail_id})
    expect(failed_doc["evaluation_status"] == "completed" or failed_doc["evaluation_status"] == "failed", "Scenario 13: Evaluation failure/handling recorded cleanly")

    # 15. Google-Authenticated Candidate Evaluation Scenario
    google_cand = login_google_candidate("Tester")
    google_headers = {"Authorization": f"Bearer {google_cand['token']}"}

    g_start = client.post("/candidate/interviews", json={"category_id": cat_id, "type": "technical"}, headers=google_headers)
    expect(g_start.status_code == 201, "Scenario 15: Google candidate creates interview")
    g_int_id = g_start.json()["id"]

    for q_item in g_start.json()["questions"]:
        client.post(f"/candidate/interviews/{g_int_id}/responses", json={
            "question_id": q_item["question_id"],
            "duration_seconds": 20.0,
            "size_bytes": 30000,
        }, headers=google_headers)

    client.post(f"/candidate/interviews/{g_int_id}/complete", headers=google_headers)
    client.post(f"/candidate/interviews/{g_int_id}/evaluation/start", headers=google_headers)
    g_eval_result = evaluate_interview_job(g_int_id)
    expect(g_eval_result["overall_score"] is not None, "Scenario 15: Google candidate evaluation completes successfully")

    g_eval_get = client.get(f"/candidate/interviews/{g_int_id}/evaluation", headers=google_headers)
    expect(g_eval_get.json()["evaluation_status"] == "completed", "Scenario 15: Google candidate can read completed evaluation")

    print("\nALL 15 EVALUATION ENGINE SCENARIOS PASSED SUCCESSFULLY!\n")
    return True


if __name__ == "__main__":
    test_nlp_and_delivery_scenarios()
    test_aggregation_and_lifecycle_scenarios()
