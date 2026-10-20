"""
FYP-I report alignment test suite - covers the features added to close the
gaps between the code and the report:

  1. FR 2-03 / TC-06   per-account login lockout
  2. NFR 10            recording consent is stored on the interview
  3. Objective 1       typed (text) answers, evaluated with text-only weighting
  4. FR 16-01 / Obj. 3 grammar, clarity and tone analysis
  5. FR 35-02          admin participation trends
  6. Objective 7       post-interview survey + score agreement summary

Run with: ../.venv/Scripts/python.exe test_report_alignment.py
"""
import hashlib
import os
import time

os.environ["TESTING"] = "1"

from bson import ObjectId
from fastapi.testclient import TestClient

from main import app
from database import interviews_collection, otps_collection, surveys_collection, users_collection
from services.language_analyzer import analyze_language
from services.evaluation_worker import evaluate_interview_job
from utils.account_lockout import MAX_FAILED_ATTEMPTS

client = TestClient(app)
created_users, created_interviews = [], []


def expect(condition, message):
    if not condition:
        raise AssertionError(message)
    print(f"[PASS] {message}")


def register_and_login(label: str):
    email = f"align.{label.lower()}.{int(time.time() * 1000)}@example.com"
    password = "AlignTest123"
    reg = client.post("/candidate/register", json={
        "name": f"Alignment {label}", "email": email, "password": password, "confirm_password": password,
    })
    assert reg.status_code == 200, reg.text
    otp_doc = otps_collection.find_one({"email": email, "type": "candidate_registration"})
    otps_collection.update_one({"_id": otp_doc["_id"]}, {"$set": {"otp_hash": hashlib.sha256(b"123456").hexdigest()}})
    assert client.post("/candidate/register/verify-otp", json={"email": email, "otp": "123456"}).status_code == 201
    created_users.append(email)
    token = client.post("/candidate/login", json={"email": email, "password": password}).json()["access_token"]
    return {"Authorization": f"Bearer {token}"}, email, password


def test_lockout():
    print("\n--- FR 2-03: per-account lockout ---")
    _, email, password = register_and_login("Lock")
    for i in range(MAX_FAILED_ATTEMPTS - 1):
        r = client.post("/candidate/login", json={"email": email, "password": "wrong-password"})
        assert r.status_code == 401
    expect(True, f"First {MAX_FAILED_ATTEMPTS - 1} wrong passwords return 401")
    r = client.post("/candidate/login", json={"email": email, "password": "wrong-password"})
    expect(r.status_code == 423 and "locked" in r.json()["detail"].lower(), f"Attempt #{MAX_FAILED_ATTEMPTS} locks the account (HTTP 423)")
    r = client.post("/candidate/login", json={"email": email, "password": password})
    expect(r.status_code == 423, "Correct password is refused while the account is locked")
    users_collection.update_one({"email": email}, {"$set": {"locked_until": None}})
    r = client.post("/candidate/login", json={"email": email, "password": password})
    expect(r.status_code == 200, "Login works again once the lock expires")
    user = users_collection.find_one({"email": email})
    expect(user.get("failed_login_attempts") == 0, "Successful login resets the failure counter")


def _start_interview(headers):
    cats = client.get("/candidate/categories", headers=headers).json()
    r = client.post("/candidate/interviews", json={"category_id": cats[0]["id"], "type": "technical"}, headers=headers)
    assert r.status_code == 201, r.text
    created_interviews.append(r.json()["id"])
    return r.json()


def test_consent_typed_answers_and_survey():
    print("\n--- NFR 10, Objective 1, FR 16, Objective 7 ---")
    headers, _, _ = register_and_login("Flow")
    other_headers, _, _ = register_and_login("Other")
    interview = _start_interview(headers)
    iid = interview["id"]
    questions = interview["questions"]

    r = client.post(f"/candidate/interviews/{iid}/consent", json={"microphone": False, "camera": False}, headers=headers)
    consent = r.json().get("recording_consent") or {}
    expect(r.status_code == 200 and consent.get("camera") is False and consent.get("policy_version"), "Consent decision is stored with policy version")
    r = client.post(f"/candidate/interviews/{iid}/consent", json={"microphone": True, "camera": True}, headers=other_headers)
    expect(r.status_code == 404, "Another candidate cannot record consent on this interview")

    qid = questions[0]["question_id"]
    r = client.post(f"/candidate/interviews/{iid}/responses/{qid}/text", json={"text": " "}, headers=headers)
    expect(r.status_code == 400, "An empty typed answer is rejected")
    answer = (
        "i think a API is kind of a interface between services. He have to validate input. "
        "Maybe we should of used caching more better"
    )
    r = client.post(f"/candidate/interviews/{iid}/responses/{qid}/text", json={"text": answer, "duration_seconds": 40}, headers=headers)
    saved = next(x for x in r.json()["responses"] if x["question_id"] == qid)
    expect(r.status_code == 200 and saved["response_mode"] == "text" and saved["media_url"] is None, "Typed answer is stored as a text response with no media")

    qid2 = questions[1]["question_id"]
    good = (
        "I designed the service layer myself. First, I separated reads from writes. As a result, "
        "latency dropped by forty percent. For example, the search page now loads in under a second."
    )
    client.post(f"/candidate/interviews/{iid}/responses/{qid2}/text", json={"text": good}, headers=headers)

    r = client.post(f"/candidate/interviews/{iid}/survey", json={
        "usefulness": 4, "accuracy": 4, "ease_of_use": 5, "confidence_gain": 4, "would_recommend": True,
    }, headers=headers)
    expect(r.status_code == 400, "Survey is refused before the interview is evaluated")

    client.post(f"/candidate/interviews/{iid}/complete", headers=headers)
    evaluation = evaluate_interview_job(iid)
    pq = {q["question_id"]: q for q in evaluation["per_question"]}

    q1 = pq[qid]
    expect(q1["response_mode"] == "text", "Evaluator marks the answer as typed")
    expect(q1["multimodal"]["weights_used"] == {"nlp": 1.0, "speech": 0.0, "vision": 0.0}, "Typed answer uses text-only fusion weights (100% NLP)")
    expect(q1["delivery"]["status"] == "not_applicable", "Speech delivery is not assessed for a typed answer")
    lang = q1["text_analysis"]["language_analysis"]
    issue_types = {i["type"] for i in lang["grammar_issues"]}
    expect({"Article usage", "Subject-verb agreement", "Verb form", "Double comparative"} <= issue_types, "Grammar issues are detected in the weak typed answer")
    expect(lang["tone"]["label"] in ("Tentative", "Uncertain"), "Hedging answer is classified as tentative")
    q2_lang = pq[qid2]["text_analysis"]["language_analysis"]
    expect(q2_lang["grammar_score"] > lang["grammar_score"] and q2_lang["tone"]["label"] == "Confident", "Well-formed answer scores higher with a confident tone")
    summary = evaluation.get("language_summary") or {}
    expect(summary.get("status") == "completed" and summary.get("evaluated_answers") == 2, "Interview-level language summary is produced")

    r = client.post(f"/candidate/interviews/{iid}/survey", json={
        "usefulness": 4, "accuracy": 3, "ease_of_use": 5, "confidence_gain": 4,
        "would_recommend": True, "self_rated_score": 55, "comments": "Alignment test comment",
    }, headers=headers)
    expect(r.status_code == 200 and r.json()["survey"]["self_rated_score"] == 55, "Survey is accepted after evaluation")
    r = client.post(f"/candidate/interviews/{iid}/survey", json={
        "usefulness": 5, "accuracy": 4, "ease_of_use": 5, "confidence_gain": 4, "would_recommend": True,
    }, headers=headers)
    expect(surveys_collection.count_documents({"interview_id": iid}) == 1, "Re-submitting updates the same survey (one per interview)")
    r = client.post(f"/candidate/interviews/{iid}/survey", json={
        "usefulness": 9, "accuracy": 4, "ease_of_use": 5, "confidence_gain": 4, "would_recommend": True,
    }, headers=headers)
    expect(r.status_code == 422, "Out-of-range rating is rejected")
    r = client.get(f"/candidate/interviews/{iid}/survey", headers=other_headers)
    expect(r.status_code == 404, "Another candidate cannot read this survey")


def test_admin_views():
    print("\n--- FR 35 and Objective 7 admin views ---")
    login = client.post("/admin/login", json={"email": "admin@mockai.com", "password": "admin123"})
    headers = {"Authorization": f"Bearer {login.json()['access_token']}"}
    dash = client.get("/admin/", headers=headers).json()
    part = dash.get("participation") or {}
    expect(len(part.get("series", [])) == 30, "Dashboard returns a 30-day participation series")
    expect({"active_candidates_7d", "completion_rate_30d", "repeat_candidate_rate"} <= set(part.get("engagement", {})), "Dashboard returns engagement metrics")
    r = client.get("/admin/surveys/summary", headers=headers)
    body = r.json()
    expect(r.status_code == 200 and body["total_responses"] >= 1 and "score_agreement" in body, "Admin survey summary includes responses and score agreement")
    r = client.get("/admin/surveys/summary")
    expect(r.status_code in (401, 403), "Survey summary requires an admin token")


def test_goal_interpreter():
    print("\n--- FR 07 / Use Case 4: semantic goal chatbot ---")
    headers, _, _ = register_and_login("Goal")

    def ask(text):
        r = client.post("/candidate/goal/interpret", json={"text": text}, headers=headers)
        assert r.status_code == 200, r.text
        return r.json()

    r = ask("I want to practise for a nursing job")
    expect(r["status"] == "matched" and "Nursing" in r["best"]["name"], "Free-text nursing goal maps to the Nursing category")
    r = ask("teaching maths at school")
    expect(r["status"] == "matched" and "Education" in r["best"]["name"], "Teaching goal maps to Education by meaning")
    r = ask("xyzzy qwerty blorp")
    expect(r["status"] != "matched", "Gibberish is not forced onto a category")
    r = ask("HR round, behavioural questions")
    expect(r["interview_type"] == "behavioral", "HR / behavioural wording selects the behavioral interview type")
    expect(r["method"].startswith("semantic-match:"), "Response records the encoder used")
    r = client.post("/candidate/goal/interpret", json={"text": "nurse"})
    expect(r.status_code == 401, "Goal interpretation requires a candidate token")


def test_language_unit():
    print("\n--- Language analyzer unit checks ---")
    expect(analyze_language("", "text")["status"] == "empty", "Empty input is reported as empty, not scored")
    spoken = analyze_language("so i think the api is fine", "spoken")
    expect(not any(i["type"] == "Capitalisation" for i in spoken["grammar_issues"]), "Capitalisation rules are skipped for spoken transcripts")
    expect(not analyze_language("We used an SQL database and an HTML form.", "text")["grammar_issues"], "Acronyms like 'an SQL' / 'an HTML' are not flagged")


def cleanup():
    for iid in created_interviews:
        interviews_collection.delete_one({"_id": ObjectId(iid)})
        surveys_collection.delete_many({"interview_id": iid})
    for email in created_users:
        users_collection.delete_one({"email": email})
        otps_collection.delete_many({"email": email})


if __name__ == "__main__":
    try:
        test_language_unit()
        test_lockout()
        test_goal_interpreter()
        test_consent_typed_answers_and_survey()
        test_admin_views()
        print("\nALL REPORT ALIGNMENT TESTS PASSED SUCCESSFULLY!")
    finally:
        cleanup()
