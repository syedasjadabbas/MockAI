"""
Regression tests for honest behavioural evaluation (confidence, stress,
facial indicators). Written after real interviews returned 93% confidence /
10% stress from a single 3.6 s silent clip.

Synthetic inputs validate the LOGIC (evidence gating, missing-signal
handling, no positive defaults). They do not and cannot prove real-world
emotion-recognition accuracy; that needs labelled data (see README).

Run with: ../.venv311/Scripts/python.exe test_evaluation_honesty.py
"""
import os
import subprocess
import tempfile
from pathlib import Path

os.environ["TESTING"] = "1"

import numpy as np

from services.confidence_stress_analyzer import (
    analyze_question_confidence_and_stress,
    aggregate_confidence_and_stress,
)
from services.delivery_analyzer import analyze_delivery
from services.facial_analyzer import FacialAnalyzer, EMOTION_LABELS
from services.multimodal_fusion import _facial_to_score
from services.language_analyzer import analyze_language

POSITIVE_DEFAULTS = {"Neutral", "Composed & Stable", "High", "Low"}
passed = 0


def expect(cond, msg):
    global passed
    if not cond:
        raise AssertionError(msg)
    passed += 1
    print(f"[PASS] {msg}")


def onehot(label, p=0.9):
    v = np.full(len(EMOTION_LABELS), (1 - p) / (len(EMOTION_LABELS) - 1), dtype=np.float32)
    v[EMOTION_LABELS.index(label)] = p
    return v


def facial_from_frames(frames, presence=1.0, multi_face_ratio=0.0):
    """Builds a facial result exactly as analyze_video does from per-frame probabilities."""
    fa = FacialAnalyzer()
    agg = fa._aggregate_expression_sequence(frames, [i * 0.5 for i in range(len(frames))])
    dyn = fa._temporal_dynamics(frames, [i * 0.5 for i in range(len(frames))])
    quality, notes = fa._assess_evidence(dyn, presence, multi_face_ratio)
    eng, comp, tension = fa._derive_indicators(presence, agg["expression_distribution"], [], dyn, quality == "sufficient")
    return {
        "status": "completed", "face_detected": True, "dominant_expression": agg["dominant_expression"],
        "expression_distribution": agg["expression_distribution"], "temporal_dynamics": dyn,
        "evidence_quality": quality, "evidence_notes": notes,
        "behavioral_indicators": {"engagement_level": eng, "composure_index": comp, "observable_tension": tension},
    }


def delivery(words=40, wpm=140.0, fillers=0, pauses=0.0, duration=20.0, fluency=None):
    d = {"status": "completed", "word_count": words, "duration_seconds": duration, "words_per_minute": wpm,
         "pacing": "Optimal" if 110 <= wpm <= 165 else "Slow", "filler_count": fillers,
         "hesitation_rate": round(fillers / max(1, words) * 100, 1), "hesitation_level": "Low",
         "pause_duration_seconds": pauses, "pause_count": 0}
    d["fluency_score"] = fluency if fluency is not None else 92.0
    return d


def test_facial_logic():
    print("\n--- Facial evidence and temporal dynamics ---")
    steady = [onehot("neutral", 0.88) for _ in range(14)]
    f = facial_from_frames(steady)
    expect(f["evidence_quality"] == "sufficient", "Steady neutral face over 14 frames is sufficient evidence")
    expect(f["behavioral_indicators"]["composure_index"] == "Composed & Stable", "Steady expression -> consistent (Composed & Stable)")
    expect(f["behavioral_indicators"]["engagement_level"] == "Not Assessed", "Camera presence is never reported as engagement")
    expect(f["temporal_dynamics"]["expression_variability"] < 0.05, "Steady face has near-zero measured variability")

    changing = [onehot(lbl, 0.85) for lbl in ["neutral", "happiness", "neutral", "surprise", "happiness",
                                               "neutral", "happiness", "contempt", "neutral", "happiness",
                                               "surprise", "neutral"]]
    f2 = facial_from_frames(changing)
    expect(f2["temporal_dynamics"]["label_change_rate"] >= 0.5, "Changing expressions produce a high measured label-change rate")
    expect(f2["behavioral_indicators"]["composure_index"] == "Fluctuating Composure", "Changing expressions are NOT reported as Composed & Stable")
    expect(len(f2["temporal_dynamics"]["expressions_observed"]) >= 3, "Several distinct expressions are listed as observed")

    few = [onehot("neutral", 0.9) for _ in range(4)]
    f3 = facial_from_frames(few)
    expect(f3["evidence_quality"] == "insufficient", "4 frames (a ~3 s clip) is insufficient evidence")
    expect(f3["behavioral_indicators"]["composure_index"] == "Not Assessed", "Insufficient frames -> composure Not Assessed, not Composed")
    expect(f3["behavioral_indicators"]["observable_tension"] == "Not Assessed", "Insufficient frames -> tension Not Assessed, not Low")
    expect(_facial_to_score(f3) is None, "Insufficient facial evidence gives no vision score (weight redistributes)")

    uncertain = [np.full(len(EMOTION_LABELS), 1 / len(EMOTION_LABELS), dtype=np.float32) for _ in range(15)]
    f4 = facial_from_frames(uncertain)
    expect(f4["evidence_quality"] == "insufficient", "Low-confidence model predictions are inconclusive")
    expect(f4["behavioral_indicators"]["composure_index"] == "Not Assessed", "Uncertain predictions never become Composed & Stable")

    f5 = facial_from_frames(steady, multi_face_ratio=0.6)
    expect(f5["evidence_quality"] == "insufficient", "Similar-sized multiple faces -> expressions cannot be attributed")
    fa = FacialAnalyzer()
    dyn = fa._temporal_dynamics(steady)
    q_dom, notes_dom = fa._assess_evidence(dyn, 1.0, multi_face_ratio=0.9, ambiguous_face_ratio=0.0)
    expect(q_dom == "sufficient" and any("Another person was visible" in n for n in notes_dom),
           "Second person visible but candidate's face clearly largest -> analysed, with a note")

    expect(any("cannot detect teasing" in n for n in f["evidence_notes"]), "Results state the model's supported classes and that it cannot detect teasing/intent")
    expect(set(f["expression_distribution"]) == set(EMOTION_LABELS), "Only the model's own classes are reported (no invented emotions)")


def test_confidence_stress_logic():
    print("\n--- Confidence and stress ---")
    steady_face = facial_from_frames([onehot("neutral", 0.88) for _ in range(14)])

    cs = analyze_question_confidence_and_stress({"status": "empty", "word_count": 0, "duration_seconds": 3.0}, steady_face)
    expect(cs["confidence_level"] == "Not Assessed" and cs["stress_level"] == "Not Assessed",
           "Silent answer + composed face -> confidence/stress Not Assessed (was 93% / 10%)")
    expect(cs["facial_evidence"] is not None and cs["facial_evidence"]["used_for_confidence"] is True,
           "Facial observations are still reported for a silent answer")

    short = delivery(words=12, wpm=60.0, fillers=1, duration=12.0, fluency=41.6)
    cs = analyze_question_confidence_and_stress(short, steady_face)
    expect(cs["confidence_level"] == "Not Assessed" and cs["stress_level"] == "Not Assessed",
           "12-word answer with one filler -> Not Assessed, not 96.7% 'Elevated' stress")

    for label, face in [("no face", {"status": "no_face_detected", "face_detected": False}),
                        ("missing video", None)]:
        cs = analyze_question_confidence_and_stress(None, face)
        expect(cs["confidence_level"] == "Not Assessed" and cs["stress_level"] == "Not Assessed",
               f"No speech and {label} -> Not Assessed")
        expect(cs["confidence_level"] not in POSITIVE_DEFAULTS and cs["stress_level"] not in POSITIVE_DEFAULTS,
               f"No speech and {label} never defaults to High/Low")

    good = delivery()
    with_calm_face = analyze_question_confidence_and_stress(good, steady_face)
    speech_only = analyze_question_confidence_and_stress(good, None)
    expect(with_calm_face["stress_score"] == speech_only["stress_score"],
           "A calm-looking face does not lower stress (absence of tension is not evidence)")
    expect("not evidence of low stress" in with_calm_face["assessment_basis"], "The basis explains why facial stress was not used")

    changing_face = facial_from_frames([onehot(l, 0.85) for l in ["neutral", "happiness", "surprise", "happiness"] * 3])
    with_changing = analyze_question_confidence_and_stress(good, changing_face)
    expect(with_changing["stress_score"] == speech_only["stress_score"],
           "Changing expressions alone do not raise stress")

    tense_face = facial_from_frames([onehot("fear", 0.7) for _ in range(12)])
    conflict = analyze_question_confidence_and_stress(good, tense_face)
    expect(conflict["stress_score"] > speech_only["stress_score"],
           "Conflicting signals: fluent speech + observed tension raises fused stress")
    expect(conflict["facial_evidence"]["used_for_stress"] is True, "Observed tension is used and reported")

    calm_text = analyze_language("I designed the cache layer and as a result latency dropped by forty percent on search.", "spoken")
    unsure_text = analyze_language("I don't know anything about it sorry I can't answer this question I don't know", "spoken")
    sure = analyze_question_confidence_and_stress(good, None, calm_text)
    unsure = analyze_question_confidence_and_stress(good, None, unsure_text)
    expect(unsure["confidence_score"] < sure["confidence_score"] - 15,
           "Same fluent delivery: explicit 'I don't know / can't answer' lowers confidence")
    expect(unsure["speech_evidence"]["uncertainty_statements"], "Uncertainty statements are listed as evidence")

    agg = aggregate_confidence_and_stress([
        {"confidence_and_stress": analyze_question_confidence_and_stress({"status": "empty", "word_count": 0}, steady_face)}
        for _ in range(5)])
    expect(agg["confidence_level"] == "Not Assessed" and agg["evidence_quality"] == "insufficient",
           "Interview of silent answers -> interview-level Not Assessed")
    agg1 = aggregate_confidence_and_stress(
        [{"confidence_and_stress": sure}] + [{"confidence_and_stress": analyze_question_confidence_and_stress(None, None)}] * 4)
    expect(agg1["evidence_quality"] == "limited" and agg1["coverage"]["assessed_answers"] == 1,
           "One assessed answer out of five is flagged as limited evidence")


def test_vocal_variability_not_stress():
    print("\n--- Vocal measurements are observations, not stress ---")
    base = delivery()
    a = dict(base, acoustic_profile={"status": "completed", "pitch_variability_semitones": 0.4, "intensity_dbfs_std": 1.0})
    b = dict(base, acoustic_profile={"status": "completed", "pitch_variability_semitones": 7.5, "intensity_dbfs_std": 12.0})
    ca = analyze_question_confidence_and_stress(a, None)
    cb = analyze_question_confidence_and_stress(b, None)
    expect(ca["stress_score"] == cb["stress_score"] and ca["confidence_score"] == cb["confidence_score"],
           "High vocal pitch/intensity variability is not automatically labelled as stress")
    empty = analyze_delivery("", duration_seconds=3.0)
    expect(empty["hesitation_level"] == "Not Assessed", "No speech -> hesitation 'Not Assessed', not 'None'")


def _ffmpeg(*args):
    subprocess.run(["ffmpeg", "-v", "error", "-y", *args], check=True)


def test_real_media():
    print("\n--- Real media: short clip and no-face video ---")
    fixture = Path(__file__).parent / "media/interviews/6a96c6df4fe22d4bad7fc5a7/6a884ae95deeec968f07461a/response.webm"
    if not fixture.is_file():
        print("[SKIP] fixture recording not present")
        return
    tmp = Path(tempfile.mkdtemp())
    short = tmp / "short.webm"
    _ffmpeg("-i", str(fixture), "-t", "2", "-c", "copy", str(short))
    r = FacialAnalyzer().analyze_video(str(short), duration_seconds=2.0)
    expect(r["status"] in ("completed", "insufficient_data"), "Short real clip is analysed without crashing")
    expect(r["behavioral_indicators"]["composure_index"] in ("Not Assessed",) or r["evidence_quality"] == "sufficient",
           "Short real clip only gets interpreted indicators if evidence is sufficient")
    expect(r["behavioral_indicators"]["engagement_level"] == "Not Assessed", "Real clip: engagement not inferred from presence")

    black = tmp / "black.mp4"
    _ffmpeg("-f", "lavfi", "-i", "color=c=black:s=640x480:d=6", "-pix_fmt", "yuv420p", str(black))
    r2 = FacialAnalyzer().analyze_video(str(black), duration_seconds=6.0)
    expect(r2["status"] != "completed" and r2["behavioral_indicators"]["composure_index"] == "Not Assessed",
           "Video without a face -> no composure claim")
    expect(r2["dominant_expression"] not in ("Neutral",), "Video without a face never reports 'Neutral'")

    full = FacialAnalyzer().analyze_video(str(fixture))
    dyn = full.get("temporal_dynamics") or {}
    expect(dyn.get("frames_analyzed", 0) >= 8, "Full fixture answer is sampled densely enough (>= 8 frames)")
    expect(full.get("quality_metadata", {}).get("sampling_fps", 0) > 0, "Sampling rate is recorded in quality metadata")


def test_api_consistency():
    print("\n--- Backend result = persisted record = API response ---")
    from bson import ObjectId
    from fastapi.testclient import TestClient
    from database import interviews_collection
    from main import app
    from services.evaluation_worker import evaluate_interview_job
    from utils.auth import create_access_token

    iid = "6a96c6df4fe22d4bad7fc5a7"
    doc = interviews_collection.find_one({"_id": ObjectId(iid)})
    if not doc:
        print("[SKIP] fixture interview not in test database (run setup_test_db.py)")
        return
    result = evaluate_interview_job(iid)
    stored = interviews_collection.find_one({"_id": ObjectId(iid)})["evaluation"]
    token = create_access_token({"user_id": doc["user_id"], "role": "user"})
    api = TestClient(app).get(f"/candidate/interviews/{iid}/evaluation", headers={"Authorization": f"Bearer {token}"}).json()["evaluation"]
    for key in ("confidence_score", "confidence_level", "stress_score", "stress_level"):
        expect(result[key] == stored[key] == api[key], f"{key} identical in worker result, database and API")
    expect(api["facial_summary"]["overall_composure"] == stored["facial_summary"]["overall_composure"],
           "Facial summary identical in database and API")
    for q in api["per_question"]:
        ind = (q.get("facial_analysis") or {}).get("behavioral_indicators") or {}
        expect(ind.get("engagement_level") in (None, "Not Assessed"), "API never reports engagement inferred from presence")
        break
    # The frontend reads these exact keys (EvaluationResults.jsx / candidateApi.js)
    for key in ("overall_score", "confidence_score", "confidence_level", "stress_score", "stress_level", "facial_summary", "per_question"):
        expect(key in api, f"API exposes '{key}' used by the frontend")


if __name__ == "__main__":
    test_facial_logic()
    test_confidence_stress_logic()
    test_vocal_variability_not_stress()
    test_real_media()
    test_api_consistency()
    print(f"\nALL {passed} EVALUATION HONESTY CHECKS PASSED SUCCESSFULLY!")
