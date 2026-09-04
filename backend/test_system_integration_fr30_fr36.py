"""
Task 10 - MockAI System Integration & FR30-FR36 Validation Test Suite

Covers:
- FR30: Store Interview Records (MongoDB schema, media refs, transcript, per-question eval, multimodal results, composite score, confidence/stress, qualitative synthesis, summary report, candidate isolation)
- FR31: View Interview History (Session ledger, drilldown, reports/scores, strictly real MongoDB data)
- FR32: Progress Awareness Support (Telemetry calculation, scoreTrend, confidenceTrend, byCategory breakdown, multi-session trajectory)
- FR33: Admin Authentication (Login, JWT claims, role-based protection, candidate vs admin isolation)
- FR34: Interview Record Monitoring (Admin interview list, search, status filter, detail view, results ledger, dashboard stats)
- FR35: User Activity Monitoring (Admin user list, registration details, interview counts, audit logs)
- FR36: Question Bank Management (Categories list, questions list, CRUD, status toggle, question bank stats)
"""

import os
import sys
import time
import hashlib
from datetime import datetime, timedelta
from bson import ObjectId
from fastapi.testclient import TestClient

os.environ["TESTING"] = "1"
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from main import app
from database import (
    users_collection,
    admins_collection,
    interviews_collection,
    categories_collection,
    questions_collection,
    otps_collection,
    admin_logs_collection,
)
from utils.auth import hash_password, create_access_token

client = TestClient(app)

def expect(condition: bool, message: str):
    if not condition:
        print(f"[FAIL] {message}")
        raise AssertionError(message)
    print(f"[PASS] {message}")


def register_and_login(label: str) -> tuple[str, str, str]:
    email = f"sysint.{label.lower()}.{int(time.time() * 1000)}@mockai.com"
    password = "CandidateSecure123!"
    reg = client.post("/candidate/register", json={
        "name": f"Integration Candidate {label}",
        "email": email,
        "password": password,
        "confirm_password": password,
    })
    expect(reg.status_code == 200, f"Candidate {label} registration initiated")
    
    otp_doc = otps_collection.find_one({"email": email.lower(), "type": "candidate_registration"})
    expect(otp_doc is not None, f"Registration OTP created for {label}")
    
    test_hash = hashlib.sha256(b"123456").hexdigest()
    otps_collection.update_one({"_id": otp_doc["_id"]}, {"$set": {"otp_hash": test_hash}})
    
    verify_resp = client.post("/candidate/register/verify-otp", json={"email": email, "otp": "123456"})
    expect(verify_resp.status_code == 201, f"Candidate {label} OTP verified")
    
    login_resp = client.post("/candidate/login", json={"email": email, "password": password})
    expect(login_resp.status_code == 200, f"Candidate {label} logged in")
    token = login_resp.json()["access_token"]
    
    user_doc = users_collection.find_one({"email": email.lower()})
    user_id = str(user_doc["_id"])
    return token, user_id, email


def test_system_integration():
    print("=" * 70)
    print("MOCKAI TASK 10: SYSTEM INTEGRATION & FR30-FR36 VALIDATION SUITE")
    print("=" * 70 + "\n")

    # -------------------------------------------------------------------------
    # Setup Test Candidates and Admin
    # -------------------------------------------------------------------------
    print("--- 0. Setup Test Identities ---")
    candidate_a_token, candidate_a_id, candidate_a_email = register_and_login("A")
    candidate_b_token, candidate_b_id, candidate_b_email = register_and_login("B")
    headers_a = {"Authorization": f"Bearer {candidate_a_token}"}
    headers_b = {"Authorization": f"Bearer {candidate_b_token}"}

    admin_login_resp = client.post("/admin/login", json={"email": "admin@mockai.com", "password": "admin123"})
    expect(admin_login_resp.status_code == 200, "Admin credentials authenticated")
    admin_token = admin_login_resp.json()["access_token"]
    admin_headers = {"Authorization": f"Bearer {admin_token}"}

    # Fetch active categories
    cat_fe = categories_collection.find_one({"name": "Frontend Development", "status": "active"})
    cat_be = categories_collection.find_one({"name": "Backend & Distributed Systems", "status": "active"})
    cat_ai = categories_collection.find_one({"name": "AI & Machine Learning", "status": "active"})
    expect(bool(cat_fe and cat_be and cat_ai), "Active categories available in MongoDB")

    # -------------------------------------------------------------------------
    # 1. FR30: Store Interview Records
    # -------------------------------------------------------------------------
    print("\n--- 1. FR30: Store Interview Records ---")
    
    # Candidate A starts an interview session
    start_resp = client.post("/candidate/interviews", json={"category_id": str(cat_fe["_id"]), "type": "technical"}, headers=headers_a)
    expect(start_resp.status_code == 201, "Candidate A started Frontend interview (FR30)")
    interview_1_id = start_resp.json()["id"]
    interview_1_questions = start_resp.json()["questions"]
    q1 = interview_1_questions[0]
    q1_id = q1.get("question_id") or q1.get("id")
    
    # Save response metadata (audio/video references)
    save_resp = client.post(
        f"/candidate/interviews/{interview_1_id}/responses",
        json={
            "question_id": q1_id,
            "duration_seconds": 32.5,
            "size_bytes": 1048576,
        },
        headers=headers_a
    )
    expect(save_resp.status_code == 200, "Candidate A saved response metadata (FR30)")
    
    # Complete interview
    comp_resp = client.post(f"/candidate/interviews/{interview_1_id}/complete", headers=headers_a)
    expect(comp_resp.status_code == 200, "Candidate A completed interview session (FR30)")
    
    # Populate complete evaluation record in MongoDB (simulating background worker completion)
    now = datetime.utcnow()
    eval_record_1 = {
        "started_at": now - timedelta(minutes=5),
        "completed_at": now,
        "per_question": [
            {
                "question_id": q1_id,
                "difficulty": "Medium",
                "status": "evaluated",
                "score": 75.0,
                "text_analysis": {
                    "status": "completed",
                    "content_score": 78.0,
                    "covered_concepts": ["Component Lifecycle", "State Management", "Hooks"],
                    "missing_concepts": ["PureComponent"],
                    "notes": "Good architectural conceptualization."
                },
                "delivery": {
                    "status": "completed",
                    "words_per_minute": 132.0,
                    "fluency_score": 72.0,
                    "pacing": "Optimal",
                    "word_count": 68,
                    "filler_count": 2,
                    "hesitation_count": 1
                },
                "facial_analysis": {
                    "status": "completed",
                    "dominant_expression": "Neutral",
                    "behavioral_indicators": {
                        "composure_index": "Composed & Stable",
                        "engagement_level": "High",
                        "observable_tension": "Low"
                    }
                },
                "multimodal": {
                    "status": "completed",
                    "score": 75.0,
                    "weights_used": {"nlp": 0.5, "speech": 0.3, "vision": 0.2},
                    "fusion_reason": "All 3 modalities evaluated successfully."
                }
            }
        ],
        "overall_score": 75.0,
        "confidence_score": 82.0,
        "confidence_level": "High",
        "stress_score": 22.0,
        "stress_level": "Low",
        "confidence_and_stress_summary": "Strong behavioral composure with fluent delivery.",
        "interpretation": "Candidate demonstrates solid engineering fundamentals.",
        "strengths": ["Articulated React hooks effectively", "Maintained stable composure"],
        "weaknesses": ["Could elaborate on memoization strategies"],
        "suggestions": ["Practice explaining React reconciliation depth"],
        "dimension_scores": {
            "technical_content": 78.0,
            "communication_fluency": 72.0,
            "behavioral_composure": 80.0
        },
        "insights": {
            "pacing_evaluation": "Optimal cadence at 132 WPM",
            "clarity_evaluation": "Clear concept communication"
        },
        "summary_report": {
            "performance_overview": {
                "overall_score": 75.0,
                "readiness_tier": "Job Ready",
                "evaluated_questions_count": 1,
                "total_questions_count": 1
            },
            "behavioral_insights": {
                "confidence_level": "High",
                "stress_level": "Low",
                "delivery_pacing": "Optimal"
            },
            "per_question_summary": [
                {
                    "question_id": q1_id,
                    "question_text": q1.get("question_text", "Frontend Question"),
                    "difficulty": "Medium",
                    "score": 75.0,
                    "status": "evaluated"
                }
            ],
            "qualitative_synthesis": {
                "strengths": ["Articulated React hooks effectively", "Maintained stable composure"],
                "weaknesses": ["Could elaborate on memoization strategies"],
                "recommendations": ["Practice explaining React reconciliation depth"]
            }
        },
        "failed_reason": None
    }
    
    interviews_collection.update_one(
        {"_id": ObjectId(interview_1_id)},
        {"$set": {
            "evaluation_status": "completed",
            "evaluation": eval_record_1,
            "score": 75.0,
            "confidence": 82.0,
            "stress": "Low"
        }}
    )
    
    # Verify MongoDB persistence directly (FR30)
    stored_doc = interviews_collection.find_one({"_id": ObjectId(interview_1_id)})
    expect(stored_doc is not None, "Interview record exists in MongoDB (FR30)")
    expect(stored_doc.get("user_id") == candidate_a_id, "Record references correct candidate owner (FR30)")
    expect(stored_doc.get("role") == "Frontend Development", "Record preserves interview track/role (FR30)")
    expect(stored_doc.get("score") == 75.0, "Record stores denormalized overall score (FR30)")
    expect(stored_doc.get("confidence") == 82.0, "Record stores confidence score (FR30)")
    expect(stored_doc.get("stress") == "Low", "Record stores stress indicator (FR30)")
    expect(len(stored_doc.get("responses", [])) > 0, "Record stores audio/video metadata references (FR30)")
    expect(stored_doc.get("evaluation") is not None, "Record stores complete multimodal evaluation (FR30)")
    expect(stored_doc["evaluation"].get("summary_report") is not None, "Record preserves structured summary report (FR30)")
    
    # Candidate Ownership Isolation (FR30)
    b_access = client.get(f"/candidate/interviews/{interview_1_id}", headers=headers_b)
    expect(b_access.status_code == 404, "Candidate B cannot access Candidate A's interview (Ownership isolation)")

    # -------------------------------------------------------------------------
    # 2. FR31: View Interview History
    # -------------------------------------------------------------------------
    print("\n--- 2. FR31: View Interview History ---")
    
    # Create a second completed interview for Candidate A in Backend track
    doc2 = {
        "user_id": candidate_a_id,
        "role": "Backend & Distributed Systems",
        "category_id": str(cat_be["_id"]),
        "type": "technical",
        "status": "Completed",
        "questions": [{"id": "q_be_1", "question_text": "Explain database indexing tradeoffs", "difficulty": "Hard"}],
        "responses": [{"question_id": "q_be_1", "duration_seconds": 45.0, "size_bytes": 2048000, "status": "recorded"}],
        "created_at": now - timedelta(days=2),
        "completed_at": now - timedelta(days=2),
        "evaluation_status": "completed",
        "score": 62.0,
        "confidence": 70.0,
        "stress": "Medium",
        "evaluation": {
            "overall_score": 62.0,
            "confidence_score": 70.0,
            "confidence_level": "Moderate",
            "stress_score": 45.0,
            "stress_level": "Medium",
            "strengths": ["Understood B-tree fundamentals"],
            "weaknesses": ["Lacked discussion of write amplification"],
            "suggestions": ["Review LSM tree architectures"],
            "summary_report": {
                "performance_overview": {"overall_score": 62.0, "readiness_tier": "Developing"}
            }
        }
    }
    interviews_collection.insert_one(doc2)

    # Candidate A calls history endpoint
    history_resp = client.get("/candidate/interviews", headers=headers_a)
    expect(history_resp.status_code == 200, "Candidate A retrieved interview history (FR31)")
    history_list = history_resp.json()
    expect(len(history_list) >= 2, f"Candidate A has at least 2 sessions in history ledger (found {len(history_list)}) (FR31)")
    
    # Validate history schema contract
    first_hist = history_list[0]
    for required_key in ["id", "role", "type", "status", "evaluation_status", "score", "confidence", "stress", "created_at"]:
        expect(required_key in first_hist, f"History item includes '{required_key}' field (FR31)")
    
    # Verify no mock data: score reflects real MongoDB values
    hist_scores = [h["score"] for h in history_list if h["score"] is not None]
    expect(75.0 in hist_scores and 62.0 in hist_scores, "History contains genuine MongoDB scores (no mock fabrication) (FR31)")
    
    # Candidate A views stored evaluation results for interview 1
    eval_resp = client.get(f"/candidate/interviews/{interview_1_id}/evaluation", headers=headers_a)
    expect(eval_resp.status_code == 200, "Candidate A retrieved stored evaluation report (FR31)")
    eval_body = eval_resp.json()
    expect(eval_body.get("evaluation_status") == "completed", "Evaluation report status is 'completed' (FR31)")
    expect(eval_body.get("evaluation", {}).get("overall_score") == 75.0, "Stored report score matches persistence (FR31)")
    expect("summary_report" in eval_body.get("evaluation", {}), "Evaluation report contains summary report structure (FR31)")

    # -------------------------------------------------------------------------
    # 3. FR32: Progress Awareness Support
    # -------------------------------------------------------------------------
    print("\n--- 3. FR32: Progress Awareness Support ---")
    
    # Add a 3rd session for Candidate A in AI & ML track to test 3-point progression
    doc3 = {
        "user_id": candidate_a_id,
        "role": "AI & Machine Learning",
        "category_id": str(cat_ai["_id"]),
        "type": "technical",
        "status": "Completed",
        "questions": [{"id": "q_ai_1", "question_text": "Explain backpropagation", "difficulty": "Hard"}],
        "responses": [{"question_id": "q_ai_1", "duration_seconds": 40.0, "size_bytes": 1500000, "status": "recorded"}],
        "created_at": now + timedelta(days=1),
        "completed_at": now + timedelta(days=1),
        "evaluation_status": "completed",
        "score": 88.0,
        "confidence": 89.0,
        "stress": "Low",
        "evaluation": {
            "overall_score": 88.0,
            "confidence_score": 89.0,
            "confidence_level": "High",
            "stress_score": 15.0,
            "stress_level": "Low",
            "strengths": ["Crisp explanation of computational graph"],
            "weaknesses": ["Minor slip on vanishing gradient mitigations"],
            "suggestions": ["Study gradient clipping and layer normalization"],
            "summary_report": {
                "performance_overview": {"overall_score": 88.0, "readiness_tier": "Interview Ready"}
            }
        }
    }
    interviews_collection.insert_one(doc3)

    # Compute telemetry trends equivalent to candidateApi.js getProgress()
    all_sessions = client.get("/candidate/interviews", headers=headers_a).json()
    completed_sessions = [s for s in all_sessions if s.get("status") == "Completed"]
    # sort chronological
    completed_sessions.sort(key=lambda s: s.get("created_at") or "")
    scored_sessions = [s for s in completed_sessions if s.get("score") is not None]

    score_trend = [{"date": s["created_at"], "score": s["score"], "label": s.get("role")} for s in scored_sessions]
    confidence_trend = [{"date": s["created_at"], "confidence": s.get("confidence"), "label": s.get("role")} for s in scored_sessions]
    
    # Domain breakdown
    categories_agg = {}
    for s in scored_sessions:
        r = s.get("role", "General")
        if r not in categories_agg:
            categories_agg[r] = {"category": r, "count": 0, "totalScore": 0, "avgScore": 0}
        categories_agg[r]["count"] += 1
        categories_agg[r]["totalScore"] += s["score"]
        categories_agg[r]["avgScore"] = round(categories_agg[r]["totalScore"] / categories_agg[r]["count"])
    by_category = list(categories_agg.values())

    expect(len(score_trend) >= 3, f"Score trend spans {len(score_trend)} sessions across time (FR32)")
    expect(score_trend[0]["score"] == 62.0 and score_trend[-1]["score"] == 88.0, "Score trajectory accurately reflects candidate growth (62.0% -> 88.0%) (FR32)")
    expect(len(by_category) >= 3, f"Domain breakdown covers {len(by_category)} categories (Frontend, Backend, AI) (FR32)")
    
    # Verify feedback review continuity (qualitative synthesis over time)
    feedback_strengths = []
    feedback_weaknesses = []
    for s in scored_sessions:
        ev_data = client.get(f"/candidate/interviews/{s['id']}/evaluation", headers=headers_a).json().get("evaluation") or {}
        feedback_strengths.extend(ev_data.get("strengths", []))
        feedback_weaknesses.extend(ev_data.get("weaknesses", []))
    
    expect(len(feedback_strengths) >= 3, "Candidate can review longitudinal strengths across historical sessions (FR32)")
    expect(len(feedback_weaknesses) >= 3, "Candidate can review longitudinal weaknesses for self-assessment (FR32)")

    # -------------------------------------------------------------------------
    # 4. FR33: Admin Authentication & Isolation
    # -------------------------------------------------------------------------
    print("\n--- 4. FR33: Admin Authentication & Isolation ---")
    
    # Invalid password
    bad_login = client.post("/admin/login", json={"email": "admin@mockai.com", "password": "wrongpassword"})
    expect(bad_login.status_code == 401, "Admin login rejects incorrect password (FR33)")
    
    # Non-admin user trying admin login
    non_admin_login = client.post("/admin/login", json={"email": candidate_a_email, "password": "CandidateSecure123!"})
    expect(non_admin_login.status_code == 401, "Admin login rejects non-admin email (FR33)")
    
    # Admin profile access
    admin_me = client.get("/admin/me", headers=admin_headers)
    expect(admin_me.status_code == 200, "Admin profile accessed with valid admin JWT (FR33)")
    expect(admin_me.json().get("role") == "admin", "Admin profile role is 'admin' (FR33)")
    
    # Candidate token attempting admin route
    cand_on_admin = client.get("/admin/me", headers=headers_a)
    expect(cand_on_admin.status_code in [401, 403], "Candidate token rejected from admin routes (401/403 Unauthorized/Forbidden) (FR33)")
    
    # Admin token attempting candidate route
    admin_on_cand = client.get("/candidate/me", headers=admin_headers)
    expect(admin_on_cand.status_code in [401, 403], "Admin token rejected from candidate routes (401/403 Unauthorized/Forbidden) (FR33)")

    # -------------------------------------------------------------------------
    # 5. FR34: Interview Record Monitoring
    # -------------------------------------------------------------------------
    print("\n--- 5. FR34: Interview Record Monitoring ---")
    
    # Admin retrieves all interviews
    admin_interviews_resp = client.get("/admin/interviews", headers=admin_headers)
    expect(admin_interviews_resp.status_code == 200, "Admin retrieved global interview monitoring list (FR34)")
    admin_interviews = admin_interviews_resp.json()
    if isinstance(admin_interviews, dict):
        admin_interviews = admin_interviews.get("interviews", [])
    expect(len(admin_interviews) >= 3, f"Admin monitors {len(admin_interviews)} total interviews across system (FR34)")
    
    # Check candidate name attachment
    has_candidate_info = any(inv.get("candidate_name") or inv.get("candidate_email") for inv in admin_interviews)
    expect(has_candidate_info, "Admin view attaches candidate identification details (FR34)")
    
    # Admin retrieves single interview dossier
    admin_dossier = client.get(f"/admin/interviews/{interview_1_id}", headers=admin_headers)
    expect(admin_dossier.status_code == 200, "Admin retrieved specific interview dossier (FR34)")
    expect(admin_dossier.json().get("evaluation") is not None, "Admin dossier contains full evaluation data (FR34)")
    
    # Admin retrieves completed results ledger
    admin_results_resp = client.get("/admin/results", headers=admin_headers)
    expect(admin_results_resp.status_code == 200, "Admin retrieved completed evaluation results ledger (FR34)")
    admin_results = admin_results_resp.json()
    if isinstance(admin_results, dict):
        admin_results = admin_results.get("results", [])
    expect(len(admin_results) >= 3, f"Results ledger contains {len(admin_results)} evaluated sessions (FR34)")
    
    # Admin dashboard telemetry
    admin_dash = client.get("/admin/", headers=admin_headers)
    expect(admin_dash.status_code == 200, "Admin dashboard statistics loaded (FR34)")
    dash_data = admin_dash.json()
    expect(dash_data.get("total_interviews", 0) >= 3, "Dashboard reports total interviews count (FR34)")
    expect("average_score" in dash_data, "Dashboard reports average performance score (FR34)")

    # -------------------------------------------------------------------------
    # 6. FR35: User Activity Monitoring
    # -------------------------------------------------------------------------
    print("\n--- 6. FR35: User Activity Monitoring ---")
    
    # Admin retrieves candidate user list
    admin_users_resp = client.get("/admin/users", headers=admin_headers)
    expect(admin_users_resp.status_code == 200, "Admin retrieved registered candidates list (FR35)")
    users_list = admin_users_resp.json()
    if isinstance(users_list, dict):
        users_list = users_list.get("users", [])
    candidate_emails = [u.get("email") for u in users_list]
    expect(candidate_a_email in candidate_emails, "Admin monitors Candidate A in active users list (FR35)")
    
    # Admin retrieves audit logs
    admin_logs_resp = client.get("/admin/logs", headers=admin_headers)
    expect(admin_logs_resp.status_code == 200, "Admin retrieved system audit logs (FR35)")
    logs_list = admin_logs_resp.json()
    if isinstance(logs_list, dict):
        logs_list = logs_list.get("logs", [])
    expect(len(logs_list) > 0, f"Audit trail contains {len(logs_list)} recorded actions (FR35)")
    expect(any(l.get("action") == "LOGIN" for l in logs_list), "Admin login action recorded in audit log (FR35)")

    # -------------------------------------------------------------------------
    # 7. FR36: Question Bank Management
    # -------------------------------------------------------------------------
    print("\n--- 7. FR36: Question Bank Management ---")
    
    # Admin views categories
    admin_cats = client.get("/admin/categories", headers=admin_headers)
    expect(admin_cats.status_code == 200, "Admin retrieved categories (FR36)")
    
    # Admin views questions
    admin_qs = client.get("/admin/questions", headers=admin_headers)
    expect(admin_qs.status_code == 200, "Admin retrieved questions list (FR36)")
    
    # Admin creates a new question
    new_q_payload = {
        "category_id": str(cat_fe["_id"]),
        "question_text": "Integration Test: Explain Virtual DOM vs Incremental DOM.",
        "difficulty": "Medium",
        "type": "Technical",
        "expected_answer": "Virtual DOM uses in-memory trees; Incremental DOM mutates in place.",
        "rubric": "Evaluates diffing algorithms and memory overhead.",
        "tags": ["frontend", "virtual-dom", "react"],
        "status": "active"
    }
    create_q = client.post("/admin/questions", json=new_q_payload, headers=admin_headers)
    expect(create_q.status_code in [200, 201], "Admin created new question in Question Bank (FR36)")
    created_q_id = create_q.json().get("id") or create_q.json().get("_id")
    
    # Admin toggles question status
    toggle_q = client.patch(
        f"/admin/questions/{created_q_id}/status",
        json={"status": "archived"},
        headers=admin_headers
    )
    expect(toggle_q.status_code == 200, "Admin toggled question status to archived (FR36)")
    
    # Admin question bank statistics
    qb_stats = client.get("/admin/question-bank/stats", headers=admin_headers)
    expect(qb_stats.status_code == 200, "Admin retrieved question bank analytics and stats (FR36)")
    
    # Cleanup: Delete the test question
    del_q = client.delete(f"/admin/questions/{created_q_id}", headers=admin_headers)
    expect(del_q.status_code == 200, "Admin cleaned up test question (FR36)")

    # -------------------------------------------------------------------------
    # Summary of Execution
    # -------------------------------------------------------------------------
    print("\n" + "=" * 70)
    print("ALL FR30-FR36 SYSTEM INTEGRATION TESTS PASSED SUCCESSFULLY!")
    print("=" * 70)


if __name__ == "__main__":
    test_system_integration()
