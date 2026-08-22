"""
Candidate Interview Session backend test suite.

Covers: candidate-safe category/question retrieval (active-only, no admin
fields, no answer keys) -> starting an interview -> MongoDB persistence ->
saving response metadata -> completing an interview -> history -> ownership
enforcement between two different candidates -> role separation from Admin.

Run with: ../.venv/Scripts/python.exe test_candidate_interview_api.py
"""
import time

from bson import ObjectId
from fastapi.testclient import TestClient

from main import app
from database import interviews_collection

client = TestClient(app)


def expect(condition, message):
    if not condition:
        raise AssertionError(message)
    print(f"[PASS] {message}")


def register_and_login(label: str):
    email = f"interview.{label}.{int(time.time() * 1000)}@example.com"
    password = "InterviewTest123"
    reg = client.post("/candidate/register", json={
        "name": f"Interview Candidate {label}",
        "email": email,
        "password": password,
        "confirm_password": password,
    })
    expect(reg.status_code == 201, f"Candidate {label} registers successfully")
    token = reg.json()["access_token"]
    return token, email


def test_candidate_interview_api():
    print("Testing Candidate Interview Session API...\n")

    candidate_a_token, _ = register_and_login("A")
    candidate_b_token, _ = register_and_login("B")
    headers_a = {"Authorization": f"Bearer {candidate_a_token}"}
    headers_b = {"Authorization": f"Bearer {candidate_b_token}"}

    admin_login = client.post("/admin/login", json={"email": "admin@mockai.com", "password": "admin123"})
    expect(admin_login.status_code == 200, "Admin login works (setup for admin-managed test fixtures)")
    admin_headers = {"Authorization": f"Bearer {admin_login.json()['access_token']}"}

    # -----------------------------------------------------------------
    # Categories
    # -----------------------------------------------------------------
    cats_resp = client.get("/candidate/categories", headers=headers_a)
    expect(cats_resp.status_code == 200, "GET /candidate/categories returns 200 for an authenticated candidate")
    cats = cats_resp.json()
    expect(len(cats) >= 1, "At least one active category is returned")
    expect(all("status" not in c for c in cats), "Candidate category response never exposes the admin 'status' field")
    sample_category = cats[0]
    expect(set(sample_category.keys()) == {"id", "name", "description", "icon"}, "Candidate category response is limited to candidate-relevant fields")

    no_auth_cats = client.get("/candidate/categories")
    expect(no_auth_cats.status_code == 401, "GET /candidate/categories without a token is rejected with 401")

    # Create + archive a throwaway category via Admin, confirm it's excluded
    create_cat = client.post("/admin/categories", json={
        "name": f"Throwaway Interview Test Category {int(time.time())}",
        "description": "temp",
        "icon": "Folder",
        "status": "archived",
    }, headers=admin_headers)
    expect(create_cat.status_code == 200, "Admin can create a test category (setup)")
    archived_cat_id = create_cat.json()["_id"]

    cats_resp_after = client.get("/candidate/categories", headers=headers_a)
    archived_ids = [c["id"] for c in cats_resp_after.json()]
    expect(archived_cat_id not in archived_ids, "An archived category is excluded from the candidate-facing list")

    # A candidate token can never reach Admin's category management
    candidate_admin_attempt = client.post("/admin/categories", json={"name": "hack"}, headers=headers_a)
    expect(candidate_admin_attempt.status_code == 401, "A Candidate's token is REJECTED on Admin's POST /admin/categories")

    client.delete(f"/admin/categories/{archived_cat_id}", headers=admin_headers)  # cleanup

    # -----------------------------------------------------------------
    # Questions
    # -----------------------------------------------------------------
    real_category_id = sample_category["id"]
    questions_resp = client.get(f"/candidate/categories/{real_category_id}/questions", headers=headers_a)
    expect(questions_resp.status_code == 200, "GET /candidate/categories/{id}/questions returns 200")
    questions = questions_resp.json()
    expect(len(questions) >= 1, "At least one active question is returned for a real category")
    expect(all("expected_answer" not in q for q in questions), "Candidate question response never exposes the answer key")
    expect(all("status" not in q for q in questions), "Candidate question response never exposes the admin 'status' field")

    invalid_cat_questions = client.get("/candidate/categories/000000000000000000000000/questions", headers=headers_a)
    expect(invalid_cat_questions.status_code == 404, "Questions for a non-existent category ID return 404")

    # Archive one real question via Admin, confirm it disappears for candidates
    to_archive = questions[0]["id"]
    archive_resp = client.patch(f"/admin/questions/{to_archive}/status", json={"status": "archived"}, headers=admin_headers)
    expect(archive_resp.status_code == 200, "Admin can archive a question (setup)")

    questions_after = client.get(f"/candidate/categories/{real_category_id}/questions", headers=headers_a).json()
    expect(to_archive not in [q["id"] for q in questions_after], "An archived question is excluded from the candidate-facing list")

    client.patch(f"/admin/questions/{to_archive}/status", json={"status": "active"}, headers=admin_headers)  # restore

    # -----------------------------------------------------------------
    # Start interview
    # -----------------------------------------------------------------
    invalid_start = client.post("/candidate/interviews", json={"category_id": "not-an-object-id"}, headers=headers_a)
    expect(invalid_start.status_code == 400, "Starting an interview with a malformed category_id returns 400")

    missing_cat_start = client.post("/candidate/interviews", json={"category_id": "000000000000000000000000"}, headers=headers_a)
    expect(missing_cat_start.status_code == 404, "Starting an interview with a non-existent category_id returns 404")

    start_resp = client.post("/candidate/interviews", json={"category_id": real_category_id, "type": "technical"}, headers=headers_a)
    expect(start_resp.status_code == 201, f"POST /candidate/interviews returns 201 (got {start_resp.status_code}: {start_resp.text})")
    interview = start_resp.json()
    interview_id = interview["id"]
    expect(interview["status"] == "In Progress", "New interview status is 'In Progress' (matches Admin's expected casing)")
    expect(interview["evaluation_status"] == "pending_evaluation", "New interview evaluation_status is 'pending_evaluation'")
    expect(interview["score"] is None and interview["confidence"] is None and interview["stress"] is None, "No fabricated score/confidence/stress on a new interview")
    expect(len(interview["questions"]) >= 1, "Interview includes a snapshot of questions")

    # Candidate ID always comes from the JWT, never the request body
    db_doc = interviews_collection.find_one({"_id": ObjectId(interview_id)})
    expect(db_doc is not None, "Interview document actually exists in MongoDB")
    expect(db_doc["user_id"] != "", "Interview is associated with a real candidate user_id")

    fetch_resp = client.get(f"/candidate/interviews/{interview_id}", headers=headers_a)
    expect(fetch_resp.status_code == 200, "Candidate A can fetch their own interview")

    # -----------------------------------------------------------------
    # Ownership enforcement
    # -----------------------------------------------------------------
    b_fetch_attempt = client.get(f"/candidate/interviews/{interview_id}", headers=headers_b)
    expect(b_fetch_attempt.status_code == 404, "Candidate B cannot fetch Candidate A's interview (404, not 403 - no existence leak)")

    invalid_id_fetch = client.get("/candidate/interviews/not-a-valid-id", headers=headers_a)
    expect(invalid_id_fetch.status_code == 400, "Fetching with a malformed interview ID returns 400")

    missing_id_fetch = client.get("/candidate/interviews/000000000000000000000000", headers=headers_a)
    expect(missing_id_fetch.status_code == 404, "Fetching a well-formed but non-existent interview ID returns 404")

    # -----------------------------------------------------------------
    # Save response
    # -----------------------------------------------------------------
    first_question_id = interview["questions"][0]["question_id"]
    save_resp = client.post(f"/candidate/interviews/{interview_id}/responses", json={
        "question_id": first_question_id,
        "duration_seconds": 12.5,
        "size_bytes": 204800,
    }, headers=headers_a)
    expect(save_resp.status_code == 200, f"Saving a response returns 200 (got {save_resp.status_code}: {save_resp.text})")
    expect(len(save_resp.json()["responses"]) == 1, "Response is recorded on the interview")

    b_save_attempt = client.post(f"/candidate/interviews/{interview_id}/responses", json={
        "question_id": first_question_id, "duration_seconds": 1, "size_bytes": 1,
    }, headers=headers_b)
    expect(b_save_attempt.status_code == 404, "Candidate B cannot save a response to Candidate A's interview")

    bad_question_resp = client.post(f"/candidate/interviews/{interview_id}/responses", json={
        "question_id": "000000000000000000000000", "duration_seconds": 1, "size_bytes": 1,
    }, headers=headers_a)
    expect(bad_question_resp.status_code == 400, "Saving a response for a question not in this interview returns 400")

    # Re-recording the same question replaces, not duplicates
    client.post(f"/candidate/interviews/{interview_id}/responses", json={
        "question_id": first_question_id, "duration_seconds": 20, "size_bytes": 400000,
    }, headers=headers_a)
    re_recorded = client.get(f"/candidate/interviews/{interview_id}", headers=headers_a).json()
    expect(len(re_recorded["responses"]) == 1, "Re-recording the same question replaces its response instead of duplicating it")

    # -----------------------------------------------------------------
    # Complete interview
    # -----------------------------------------------------------------
    b_complete_attempt = client.post(f"/candidate/interviews/{interview_id}/complete", headers=headers_b)
    expect(b_complete_attempt.status_code == 404, "Candidate B cannot complete Candidate A's interview")

    complete_resp = client.post(f"/candidate/interviews/{interview_id}/complete", headers=headers_a)
    expect(complete_resp.status_code == 200, f"Completing the interview returns 200 (got {complete_resp.status_code}: {complete_resp.text})")
    completed = complete_resp.json()
    expect(completed["status"] == "Completed", "Interview status becomes 'Completed'")
    expect(completed["evaluation_status"] == "pending_evaluation", "evaluation_status stays 'pending_evaluation' - no AI has run")
    expect(completed["score"] is None, "score is still null after completion - never fabricated")
    expect(completed["completed_at"] is not None, "completed_at timestamp is set")

    double_complete = client.post(f"/candidate/interviews/{interview_id}/complete", headers=headers_a)
    expect(double_complete.status_code == 400, "Completing an already-completed interview is rejected with 400")

    late_response = client.post(f"/candidate/interviews/{interview_id}/responses", json={
        "question_id": first_question_id, "duration_seconds": 5, "size_bytes": 5,
    }, headers=headers_a)
    expect(late_response.status_code == 400, "Saving a response to an already-completed interview is rejected with 400")

    # -----------------------------------------------------------------
    # History
    # -----------------------------------------------------------------
    history_a = client.get("/candidate/interviews", headers=headers_a)
    expect(history_a.status_code == 200, "GET /candidate/interviews (history) returns 200")
    expect(interview_id in [i["id"] for i in history_a.json()], "Candidate A's history includes the interview they just completed")
    expect(all("questions" not in i for i in history_a.json()), "History list responses are trimmed (no full question snapshot)")

    history_b = client.get("/candidate/interviews", headers=headers_b)
    expect(interview_id not in [i["id"] for i in history_b.json()], "Candidate B's history does NOT include Candidate A's interview")

    no_auth_history = client.get("/candidate/interviews")
    expect(no_auth_history.status_code == 401, "GET /candidate/interviews without a token is rejected with 401")

    # -----------------------------------------------------------------
    # Role separation regression
    # -----------------------------------------------------------------
    admin_on_candidate_interviews = client.get("/candidate/interviews", headers=admin_headers)
    expect(admin_on_candidate_interviews.status_code == 401, "An Admin's token is REJECTED on GET /candidate/interviews")

    print("\nALL CANDIDATE INTERVIEW SESSION TESTS PASSED SUCCESSFULLY!")
    return True


if __name__ == "__main__":
    test_candidate_interview_api()
