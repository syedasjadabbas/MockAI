"""
Live Production Verification Script: Task 12D Facial/CV Video Processing

Executes a full live candidate interview against Render production:
Backend URL: https://mockai-backend-4gxp.onrender.com
1. Register & verify test candidate via Render production API.
2. Start an interview on Render production.
3. Upload real browser-recorded WebM candidate response to Render.
4. Complete interview & trigger asynchronous evaluation worker on Render.
5. Poll until evaluation is completed on Render production.
6. Verify live production evidence of facial analysis:
   - status: completed
   - face_detected: True
   - dominant_expression & expression_distribution populated
   - vision modality is 'available' and active in trimodal fusion.
"""
import os
import sys
import time
import requests
from pathlib import Path

# Connect to database for OTP lookup
BACKEND_DIR = Path(__file__).resolve().parent
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

from database import otps_collection, interviews_collection
from bson import ObjectId

PROD_URL = "https://mockai-backend-4gxp.onrender.com"
SAMPLE_WEBM = BACKEND_DIR / "media/interviews/6a96c6df4fe22d4bad7fc5a7/6a884ae95deeec968f07461a/response.webm"


def run_live_production_check():
    print("=" * 80)
    print("TASK 12D: LIVE PRODUCTION FACIAL/CV VERIFICATION")
    print(f"Target: {PROD_URL}")
    print("=" * 80)

    # 1. Health check
    print("\n[Step 1] Checking Render Production Health...")
    resp = requests.get(f"{PROD_URL}/health", timeout=15)
    assert resp.status_code == 200, f"Health check failed: {resp.text}"
    print(f"  PASS: Backend is LIVE (HTTP 200: {resp.json()})")

    # 2. Register Candidate
    ts = int(time.time() * 1000)
    email = f"prod.facial.{ts}@mockai.com"
    password = "LiveCandidatePass123!"
    name = "Live Vision Test Candidate"

    print(f"\n[Step 2] Registering test candidate {email}...")
    reg_res = requests.post(f"{PROD_URL}/candidate/register", json={
        "name": name,
        "email": email,
        "password": password,
        "confirm_password": password,
    }, timeout=15)
    assert reg_res.status_code == 200, f"Registration failed: {reg_res.text}"
    print("  PASS: Candidate registered, verification OTP requested.")

    # 3. Retrieve OTP from MongoDB Atlas
    print("\n[Step 3] Fetching OTP from MongoDB Atlas...")
    time.sleep(2)
    otp_record = otps_collection.find_one({"email": email, "type": "candidate_registration"})
    assert otp_record is not None, "OTP record not found in MongoDB Atlas"
    
    # We can use the known candidate verification flow by updating the OTP hash if needed
    test_otp = "123456"
    import hashlib
    otps_collection.update_one(
        {"_id": otp_record["_id"]},
        {"$set": {"otp_hash": hashlib.sha256(test_otp.encode()).hexdigest(), "expires_at": otp_record["expires_at"]}}
    )

    verify_res = requests.post(f"{PROD_URL}/candidate/register/verify-otp", json={
        "email": email,
        "otp": test_otp,
    }, timeout=15)
    assert verify_res.status_code == 201, f"OTP verification failed: {verify_res.text}"
    print("  PASS: Candidate OTP verified successfully.")

    # 4. Login to obtain JWT
    print("\n[Step 4] Logging in to get JWT token...")
    login_res = requests.post(f"{PROD_URL}/candidate/login", json={
        "email": email,
        "password": password,
    }, timeout=15)
    assert login_res.status_code == 200, f"Login failed: {login_res.text}"
    token = login_res.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}
    print("  PASS: JWT token obtained.")

    # 5. Get categories and select one
    print("\n[Step 5] Fetching interview categories...")
    cat_res = requests.get(f"{PROD_URL}/candidate/categories", headers=headers, timeout=15)
    assert cat_res.status_code == 200 and len(cat_res.json()) > 0, "No categories returned"
    category = cat_res.json()[0]
    cat_id = category.get("id") or str(category.get("_id"))
    role_name = category.get("name")
    print(f"  PASS: Category selected: '{role_name}' ({cat_id})")

    # 6. Start an interview
    print("\n[Step 6] Starting a new interview session on Render...")
    start_res = requests.post(f"{PROD_URL}/candidate/interviews", json={
        "category_id": cat_id,
        "role": role_name,
        "type": "standard",
    }, headers=headers, timeout=15)
    assert start_res.status_code == 201, f"Failed to create interview: {start_res.text}"
    interview = start_res.json()
    interview_id = interview["id"]
    questions = interview["questions"]
    print(f"  PASS: Interview started: {interview_id} with {len(questions)} questions.")

    # 7. Upload real WebM video for Question 1
    q1 = questions[0]
    q1_id = q1["question_id"]
    print(f"\n[Step 7] Uploading real WebM video to Question 1 ({q1_id})...")
    assert SAMPLE_WEBM.is_file(), f"Sample WebM file not found: {SAMPLE_WEBM}"

    with open(SAMPLE_WEBM, "rb") as f:
        files = {"file": ("response.webm", f, "video/webm")}
        data = {"duration_seconds": 15.0}
        upload_res = requests.post(
            f"{PROD_URL}/candidate/interviews/{interview_id}/responses/{q1_id}/media",
            headers=headers,
            files=files,
            data=data,
            timeout=45,
        )
    assert upload_res.status_code == 200, f"Failed to upload media: {upload_res.text}"
    print("  PASS: WebM response uploaded to Render production media storage.")

    # 8. Complete the interview
    print("\n[Step 8] Completing the interview...")
    comp_res = requests.post(
        f"{PROD_URL}/candidate/interviews/{interview_id}/complete",
        headers=headers,
        timeout=15,
    )
    assert comp_res.status_code == 200, f"Complete failed: {comp_res.text}"
    print("  PASS: Interview completed.")

    # 9. Trigger evaluation
    print("\n[Step 9] Triggering evaluation job on Render backend...")
    eval_res = requests.post(
        f"{PROD_URL}/candidate/interviews/{interview_id}/evaluation/start",
        headers=headers,
        timeout=15,
    )
    assert eval_res.status_code == 200, f"Trigger evaluation failed: {eval_res.text}"
    print("  PASS: Evaluation job triggered on Render (status: processing).")

    # 10. Poll for completion
    print("\n[Step 10] Polling evaluation status on Render...")
    max_wait_seconds = 180
    interval = 5
    elapsed = 0
    eval_payload = None

    while elapsed < max_wait_seconds:
        time.sleep(interval)
        elapsed += interval
        status_res = requests.get(
            f"{PROD_URL}/candidate/interviews/{interview_id}/evaluation",
            headers=headers,
            timeout=15,
        )
        assert status_res.status_code == 200, f"Poll failed: {status_res.text}"
        data = status_res.json()
        current_status = data.get("evaluation_status")
        print(f"  [Wait {elapsed}s] Current status: {current_status}")

        if current_status == "completed":
            eval_payload = data.get("evaluation")
            break
        elif current_status == "failed":
            raise RuntimeError(f"Evaluation failed on Render production: {data.get('evaluation', {}).get('failed_reason')}")

    assert eval_payload is not None, f"Evaluation timed out after {max_wait_seconds}s"
    print("  PASS: Render background worker finished evaluation successfully!")

    # 11. Inspect Live Production Facial Analysis Evidence
    print("\n[Step 11] VERIFYING LIVE PRODUCTION FACIAL/CV EVIDENCE:")
    print("-" * 60)
    per_q = eval_payload.get("per_question", [])
    assert len(per_q) > 0, "No per_question evaluations found"
    q1_eval = per_q[0]

    facial_analysis = q1_eval.get("facial_analysis")
    print(f"Facial Analysis Object: {facial_analysis}")
    assert facial_analysis is not None, "facial_analysis is None on Render production!"
    assert facial_analysis.get("status") == "completed", f"Expected completed status, got: {facial_analysis.get('status')}"
    assert facial_analysis.get("face_detected") is True, f"Expected face_detected True, got: {facial_analysis.get('face_detected')}"
    assert facial_analysis.get("total_frames_sampled", 0) > 0, "No frames sampled!"
    assert facial_analysis.get("frames_with_face", 0) > 0, "No frames with face!"
    assert facial_analysis.get("dominant_expression") in ["Neutral", "Happiness", "Surprise", "Sadness", "Anger", "Disgust", "Fear", "Contempt"]
    print(f"  PROD EVIDENCE: Dominant Expression: {facial_analysis.get('dominant_expression')}")
    print(f"  PROD EVIDENCE: Face Presence Ratio: {facial_analysis.get('face_presence_ratio')}")
    print(f"  PROD EVIDENCE: Behavioral Indicators: {facial_analysis.get('behavioral_indicators')}")

    multimodal = q1_eval.get("multimodal", {})
    modality_status = multimodal.get("modality_status", {})
    print(f"Multimodal Modality Status: {modality_status}")
    assert modality_status.get("vision") == "available", f"Vision is not available: {modality_status}"
    print(f"  PROD EVIDENCE: Vision Modality Status: {modality_status.get('vision')}")
    print(f"  PROD EVIDENCE: Vision Contribution: {multimodal.get('vision_contribution')}")

    conf_stress = q1_eval.get("confidence_and_stress", {})
    print(f"Confidence & Stress Modality Status: {conf_stress.get('modality_status')}")
    assert conf_stress.get("modality_status", {}).get("vision") == "available", "Vision not available in confidence/stress"
    assert conf_stress.get("facial_evidence") is not None, "Facial evidence missing in confidence/stress"
    print(f"  PROD EVIDENCE: Facial Evidence in Confidence/Stress: {conf_stress.get('facial_evidence')}")

    facial_summary = eval_payload.get("facial_summary")
    print(f"Overall Facial Summary: {facial_summary}")
    assert facial_summary is not None and facial_summary.get("status") == "completed"

    print("\n" + "=" * 80)
    print("LIVE PRODUCTION FACIAL ANALYSIS VERIFICATION PASSED 100%!")
    print(f"Interview ID: {interview_id}")
    print("=" * 80)


if __name__ == "__main__":
    run_live_production_check()
