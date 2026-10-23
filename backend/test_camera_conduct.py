"""
Tests for camera presence and expression-conduct feedback.

Covers: the live single-frame presence check, measured camera presence with
off-camera stretches, expression flags, the presence-based vision score for
answers given mostly off camera, and the per-answer / interview feedback that
names the answers concerned. A real recording with its middle blacked out
(simulating the candidate walking away) checks the whole video path.

Run with: ../.venv311/Scripts/python.exe test_camera_conduct.py
"""
import os
import subprocess
import tempfile
from pathlib import Path

os.environ["TESTING"] = "1"

import cv2
import numpy as np

from services.facial_analyzer import FacialAnalyzer, OFF_CAMERA_PRESENCE_THRESHOLD
from services.multimodal_fusion import fuse_per_question, _vision_assessment
from services.camera_conduct import (
    assess_answer_camera_conduct,
    summarize_camera_conduct,
    camera_conduct_feedback,
)
from services.aggregate_evaluator import aggregate_interview_evaluation

FIXTURE = Path(__file__).parent / "media/interviews/6a96c6df4fe22d4bad7fc5a7/6a884ae95deeec968f07461a/response.webm"
passed = 0


def expect(cond, msg):
    global passed
    if not cond:
        raise AssertionError(msg)
    passed += 1
    print(f"[PASS] {msg}")


def presence(ratio_present, n=20, duration=20.0):
    track = [(k * duration / n, k < round(ratio_present * n)) for k in range(n)]
    return FacialAnalyzer._camera_presence(track, duration)


def facial(status="completed", composure="Composed & Stable", presence_block=None, flags=None):
    return {
        "status": status,
        "behavioral_indicators": {"composure_index": composure, "engagement_level": "Not Assessed", "observable_tension": "Low"},
        "dominant_expression": "Neutral",
        "camera_presence": presence_block or presence(1.0),
        "expression_conduct": {"status": "assessed", "flags": flags or []},
    }


NLP = {"status": "completed", "content_score": 80.0}
SPEECH = {"status": "completed", "fluency_score": 80.0}


def run():
    analyzer = FacialAnalyzer()

    print("\n=== 1. Live presence check ===")
    blank = cv2.imencode(".jpg", np.zeros((240, 320, 3), dtype=np.uint8))[1].tobytes()
    r = analyzer.check_presence(blank)
    expect(r["status"] == "ok" and r["face_detected"] is False, "Empty frame: no face detected")
    expect(analyzer.check_presence(b"not an image")["status"] == "invalid_image", "Garbage bytes rejected as invalid image")
    if FIXTURE.is_file():
        cap = cv2.VideoCapture(str(FIXTURE))
        cap.set(cv2.CAP_PROP_POS_FRAMES, 30)
        ok, frame = cap.read()
        cap.release()
        if ok:
            r = analyzer.check_presence(cv2.imencode(".jpg", cv2.resize(frame, (320, 180)))[1].tobytes())
            expect(r["face_detected"] is True and r["face_count"] >= 1, "Real candidate frame: face detected")

    print("\n=== 2. Measured camera presence ===")
    p = presence(0.3)
    expect(p["status"] == "measured" and p["ratio"] == 0.3, "Presence ratio measured from sampled frames")
    expect(p["mostly_off_camera"] is True, "30% in frame counts as mostly off camera")
    expect(p["off_camera_segments"] and p["off_camera_segments"][0]["start"] == 6.0, "Off-camera stretch starts when the face left (6.0 s)")
    expect(abs(p["off_camera_seconds"] - 14.0) < 0.01, "Off-camera time estimated (14 s of 20 s)")
    expect(presence(0.9)["mostly_off_camera"] is False, "90% in frame is not off camera")
    expect(FacialAnalyzer._camera_presence([(0.0, True)] * 3, 3.0)["status"] == "not_measured", "Too few frames: presence not measured")

    print("\n=== 3. Expression flags ===")
    tl = [{"t": k, "expression": "disgust" if k % 2 else "neutral", "p": 0.8} for k in range(20)]
    dyn = {"timeline": tl, "label_changes": 19, "label_change_rate": 1.0, "expression_variability": 0.6}
    c = FacialAnalyzer._expression_conduct(dyn, 0.0)
    types = [f["type"] for f in c["flags"]]
    expect("negative_expressions" in types, "Disgust in 50% of confident frames is flagged")
    expect("rapid_expression_changes" in types, "Constant expression switching is flagged")
    expect("cannot recognise teasing" in c["limitation"], "Flags state the model cannot recognise teasing directly")
    calm = {"timeline": [{"t": k, "expression": "neutral", "p": 0.9} for k in range(20)], "label_changes": 0,
            "label_change_rate": 0.0, "expression_variability": 0.02}
    expect(FacialAnalyzer._expression_conduct(calm, 0.0)["flags"] == [], "Steady neutral face: no flags")
    low = {"timeline": [{"t": k, "expression": "anger", "p": 0.3} for k in range(20)], "label_changes": 0,
           "label_change_rate": 0.0, "expression_variability": 0.02}
    expect(FacialAnalyzer._expression_conduct(low, 0.0)["flags"] == [], "Uncertain anger frames (p<0.5) are not flagged")
    expect(FacialAnalyzer._expression_conduct({"timeline": tl[:4]}, 0.0)["status"] == "not_assessed", "Too few face frames: flags not assessed")
    expect(FacialAnalyzer._expression_conduct(dyn, 0.5)["status"] == "not_assessed", "Another similar-sized face: flags not assessed")

    print("\n=== 4. Scoring ===")
    away = facial(status="no_face_detected", composure="Not Assessed", presence_block=presence(0.0))
    score, basis = _vision_assessment(away)
    expect(score == 0.0 and basis == "camera_presence", "Never in frame: vision scored 0 on presence (not dropped)")
    fused = fuse_per_question(NLP, SPEECH, away)
    expect(fused["weights_used"]["vision"] == 0.2 and fused["score"] == 64.0, "Off-camera answer keeps 50/30/20 weights: 80*0.8 = 64")
    half = facial(composure="Not Assessed", presence_block=presence(0.3))
    expected = round(0.3 / OFF_CAMERA_PRESENCE_THRESHOLD * 30.0, 1)
    expect(_vision_assessment(half) == (expected, "camera_presence"), f"30% in frame: presence score {expected} (0.3/{OFF_CAMERA_PRESENCE_THRESHOLD} x 30)")
    edge = facial(composure="Composed & Stable", presence_block=presence(0.6))
    expect(_vision_assessment(edge) == (70.0, "composure"), "Measured 60% in frame is not penalised (calibrated cutoff 55%)")
    expect(_vision_assessment(facial())[0] == 70.0, "Fully in frame, composed: composure score 70 unchanged")
    flagged = facial(flags=[{"type": "negative_expressions"}])
    expect(_vision_assessment(flagged) == (30.0, "composure_capped_by_expressions"), "Flagged expressions cap the vision score at 30")
    expect(_vision_assessment({"status": "no_face_detected", "face_detected": False}) == (None, None),
           "No presence measurement (e.g. old record, camera off): vision unavailable, no penalty")
    expect(_vision_assessment({"status": "missing_media"}) == (None, None), "Typed / audio-only answer: no camera penalty")

    print("\n=== 5. Feedback naming the answers ===")
    answers = [facial(), facial(), away, half, flagged]
    perq = []
    for i, f in enumerate(answers):
        perq.append({
            "question_id": f"q{i + 1}", "score": 60.0, "difficulty": "Medium", "difficulty_weight": 1.25,
            "asr": {"status": "completed", "transcript": "answer text " * 10},
            "text_analysis": {"status": "completed", "content_score": 60.0, "covered_concepts": [], "missing_concepts": []},
            "delivery": {"status": "completed", "fluency_score": 80.0, "words_per_minute": 130.0},
            "facial_analysis": f,
            "multimodal": fuse_per_question(NLP, SPEECH, f),
            "camera_conduct": assess_answer_camera_conduct(f),
        })
    expect(any("only 0%" in n for n in perq[2]["camera_conduct"]["notes"]), "Answer 3 note: face in frame only 0%")
    summary = summarize_camera_conduct(perq)
    expect(summary["off_camera_answers"] == [3, 4], "Summary names answers 3 and 4 as off camera")
    expect(summary["flagged_answers"] == [5], "Summary names answer 5 for flagged expressions")
    fb = camera_conduct_feedback(summary)
    expect(fb["weaknesses"] and "answers 3 and 4" in fb["weaknesses"][0], "Weakness text names answers 3 and 4")
    agg = aggregate_interview_evaluation(perq)
    expect(agg["weaknesses"][0].startswith("Away From the Camera"), "Interview weaknesses list the camera issue first")
    expect(agg["camera_conduct"]["off_camera_answers"] == [3, 4], "Aggregate result carries the camera summary")
    expect(agg["dimension_scores"]["behavioral_composure"] < 70.0, "Behavioural dimension lowered by off-camera answers")
    good = summarize_camera_conduct(perq[:2])
    expect(camera_conduct_feedback(good)["weaknesses"] == [], "Candidate in frame throughout: no camera weakness")

    print("\n=== 6. Real recording with the candidate out of frame ===")
    if FIXTURE.is_file():
        with tempfile.TemporaryDirectory() as td:
            out = Path(td) / "away.mp4"
            # Black out 4-30 s: the face is gone for most of the clip.
            subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-i", str(FIXTURE), "-t", "30",
                            "-vf", "drawbox=x=0:y=0:w=iw:h=ih:color=black:t=fill:enable='between(t,4,30)'",
                            "-an", str(out)], check=True)
            res = analyzer.analyze_video(str(out), duration_seconds=30.0)
            cp = res.get("camera_presence") or {}
            expect(cp.get("status") == "measured" and cp.get("mostly_off_camera"), f"Real clip: mostly off camera detected (in frame {cp.get('ratio')})")
            expect(any(s["start"] >= 3.0 for s in cp.get("off_camera_segments", [])), "Real clip: off-camera stretch starts around 4 s")
            v, b = _vision_assessment(res)
            expect(b == "camera_presence" and v < 30.0, f"Real clip: vision scored on presence ({v}/100)")
    else:
        print("[SKIP] fixture recording not present")

    print("\n=== 7. Live presence-check API (test database) ===")
    api_checks(blank)

    print(f"\nALL {passed} CAMERA CONDUCT CHECKS PASSED SUCCESSFULLY!")


def api_checks(blank_jpg):
    import hashlib
    import time
    from fastapi.testclient import TestClient
    from main import app
    from database import otps_collection

    client = TestClient(app)

    def login(label):
        email = f"camera.{label}.{int(time.time() * 1000)}@example.com"
        pw = "CameraTest123"
        client.post("/candidate/register", json={"name": f"Camera {label}", "email": email, "password": pw, "confirm_password": pw})
        otp = otps_collection.find_one({"email": email, "type": "candidate_registration"})
        otps_collection.update_one({"_id": otp["_id"]}, {"$set": {"otp_hash": hashlib.sha256(b"123456").hexdigest()}})
        client.post("/candidate/register/verify-otp", json={"email": email, "otp": "123456"})
        token = client.post("/candidate/login", json={"email": email, "password": pw}).json()["access_token"]
        return {"Authorization": f"Bearer {token}"}

    a, b = login("a"), login("b")
    cat = client.get("/candidate/categories", headers=a).json()[0]["id"]
    iid = client.post("/candidate/interviews", json={"category_id": cat, "type": "technical"}, headers=a).json()["id"]
    url = f"/candidate/interviews/{iid}/presence-check"
    frame = lambda data, ct="image/jpeg": {"frame": ("f.jpg", data, ct)}

    expect(client.post(url, files=frame(blank_jpg)).status_code == 401, "Presence check requires a candidate token")
    expect(client.post(url, files=frame(blank_jpg), headers=a).status_code == 403, "Presence check refused without camera consent")
    client.post(f"/candidate/interviews/{iid}/consent", json={"microphone": True, "camera": True}, headers=a)
    expect(client.post(url, files=frame(blank_jpg), headers=b).status_code == 404, "Another candidate cannot use this interview")
    expect(client.post(url, files=frame(b"x", "text/plain"), headers=a).status_code == 400, "Non-image upload rejected")
    r = client.post(url, files=frame(blank_jpg), headers=a)
    expect(r.status_code == 200 and r.json() == {"face_detected": False, "face_count": 0}, "Empty frame reports no face")
    if FIXTURE.is_file():
        cap = cv2.VideoCapture(str(FIXTURE))
        cap.set(cv2.CAP_PROP_POS_FRAMES, 30)
        ok, img = cap.read()
        cap.release()
        if ok:
            jpg = cv2.imencode(".jpg", cv2.resize(img, (320, 180)))[1].tobytes()
            r = client.post(url, files=frame(jpg), headers=a)
            expect(r.status_code == 200 and r.json()["face_detected"] is True, "Real candidate frame reports a face")


if __name__ == "__main__":
    run()
