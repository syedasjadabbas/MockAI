"""
Question selection test suite (pre-evaluation feedback, Nov 2026):

  1. Every interview has three questions, easy ones first.
  2. Every active domain has at least 15 active questions.
  3. Questions rotate: a candidate's next interviews in the same domain bring
     questions they have not been asked yet, until the pool is used up.
  4. Another candidate is not affected by the first one's history.

Run with: ../.venv311/Scripts/python.exe test_question_rotation.py
"""
import hashlib
import os
import time

os.environ["TESTING"] = "1"

from fastapi.testclient import TestClient

from main import app
from database import categories_collection, interviews_collection, otps_collection, questions_collection, users_collection
from routes.candidate_interview import QUESTIONS_PER_INTERVIEW

client = TestClient(app)
created_users, created_interviews = [], []
MIN_QUESTIONS_PER_DOMAIN = 15


def expect(condition, message):
    if not condition:
        raise AssertionError(message)
    print(f"[PASS] {message}")


def register_and_login(label: str):
    email = f"rotation.{label.lower()}.{int(time.time() * 1000)}@example.com"
    password = "RotationTest123"
    reg = client.post("/candidate/register", json={
        "name": f"Rotation {label}", "email": email, "password": password, "confirm_password": password,
    })
    assert reg.status_code == 200, reg.text
    otp_doc = otps_collection.find_one({"email": email, "type": "candidate_registration"})
    otps_collection.update_one({"_id": otp_doc["_id"]}, {"$set": {"otp_hash": hashlib.sha256(b"123456").hexdigest()}})
    assert client.post("/candidate/register/verify-otp", json={"email": email, "otp": "123456"}).status_code == 201
    created_users.append(email)
    token = client.post("/candidate/login", json={"email": email, "password": password}).json()["access_token"]
    return {"Authorization": f"Bearer {token}"}


def start(headers, category_id, kind="technical"):
    r = client.post("/candidate/interviews", json={"category_id": category_id, "type": kind}, headers=headers)
    assert r.status_code == 201, r.text
    body = r.json()
    created_interviews.append(body["id"])
    return body["questions"]


def qid(q):
    return q.get("question_id") or q.get("id")


def test_bank_size():
    print("\n--- Question Bank size ---")
    small = []
    for cat in categories_collection.find({"status": "active"}):
        n = questions_collection.count_documents({"category_id": str(cat["_id"]), "status": "active"})
        if n < MIN_QUESTIONS_PER_DOMAIN:
            small.append(f"{cat['name']} ({n})")
    expect(not small, f"Every active domain has at least {MIN_QUESTIONS_PER_DOMAIN} questions" + (f"; short: {small}" if small else ""))


def test_rotation():
    print("\n--- Three easy questions, rotating between interviews ---")
    headers = register_and_login("A")
    cat = categories_collection.find_one({"name": "Frontend Development", "status": "active"})
    cid = str(cat["_id"])
    pool = questions_collection.count_documents(
        {"category_id": cid, "status": "active", "type": {"$in": ["Technical", "Conceptual", "System Design"]}})

    first = start(headers, cid)
    expect(len(first) == QUESTIONS_PER_INTERVIEW == 3, "An interview has three questions")
    expect(all(q["difficulty"] == "Easy" for q in first), "A new candidate's first interview is all easy questions")

    seen = [qid(q) for q in first]
    rounds = pool // QUESTIONS_PER_INTERVIEW
    for n in range(2, rounds + 1):
        ids = [qid(q) for q in start(headers, cid)]
        expect(not set(ids) & set(seen), f"Interview {n} asks only questions this candidate has not had yet")
        seen += ids
    expect(len(set(seen)) == rounds * QUESTIONS_PER_INTERVIEW,
           f"{rounds} interviews in a row cover {len(set(seen))} different questions")

    nxt = [qid(q) for q in start(headers, cid)]
    expect(len(nxt) == 3, "Once questions start repeating, the interview still has three questions")

    other = register_and_login("B")
    other_first = [qid(q) for q in start(other, cid)]
    expect(other_first == seen[:3], "Another candidate starts from the beginning (history is per candidate)")

    hr = start(headers, cid, "behavioral")
    hr2 = start(headers, cid, "behavioral")
    expect(all(q["type"] == "Behavioral" for q in hr + hr2), "HR interviews ask behavioral questions")
    expect(not {qid(q) for q in hr} & {qid(q) for q in hr2}, "Two HR interviews in a row ask different questions")


def test_public_sample_question():
    print("\n--- Homepage 'try it' box (no sign-in) ---")
    from routes import candidate_goal
    candidate_goal._sample_hits.clear()
    r = client.post("/candidate/goal/sample-question", json={"text": "Nurse"})
    body = r.json()
    expect(r.status_code == 200, "Works without signing in")
    expect(body["field"] == "Nursing & Patient Care" and body["matched"], "A job is matched to its field")
    q = questions_collection.find_one({"question_text": body["question"]})
    expect(q is not None and q.get("difficulty") == "Easy", "Returns an easy question from the bank")
    expect(set(body) == {"field", "matched", "question"}, "Never returns the model answer")
    codes = [client.post("/candidate/goal/sample-question", json={"text": "Teacher"}).status_code for _ in range(25)]
    expect(429 in codes, "Too many requests from one visitor are refused (HTTP 429)")
    candidate_goal._sample_hits.clear()


def cleanup():
    for iid in created_interviews:
        from bson import ObjectId
        interviews_collection.delete_one({"_id": ObjectId(iid)})
    for email in created_users:
        users_collection.delete_many({"email": email})
        otps_collection.delete_many({"email": email})


if __name__ == "__main__":
    try:
        test_bank_size()
        test_rotation()
        test_public_sample_question()
        print("\nALL QUESTION ROTATION TESTS PASSED SUCCESSFULLY!")
    finally:
        cleanup()
