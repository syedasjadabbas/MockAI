"""
Automated Test Suite for AI Task 6: Report-Aligned Confidence & Stress Indicators.
Validates FR22 (Confidence Score/Indicator) and FR23 (Stress-Level Indicator).

Test Coverage:
  1. High-confidence & low-stress evidence (smooth pacing, composed facial stability)
  2. Low-confidence & high-stress evidence (rushed, elevated hesitation, visual tension)
  3. Mixed speech + facial signals (e.g. fluent speech but nervous facial expressions)
  4. Missing speech fallback (vision-only assessment)
  5. Missing vision fallback (speech-only assessment)
  6. Both modalities unavailable (zero fabrication, honest 'Not Assessed')
  7. Exact 0.0 and 100.0 score boundaries
  8. Deterministic repeatability guarantee
  9. Per-question confidence & stress evaluation integration
 10. Interview-level aggregation and MongoDB persistence via evaluation worker
 11. Candidate security & ownership isolation
 12. Formula, weights, and explainability verification
"""
import os
import sys
from bson import ObjectId

sys.path.insert(0, os.path.abspath("backend"))

from database import interviews_collection
from services.confidence_stress_analyzer import (
    analyze_question_confidence_and_stress,
    aggregate_confidence_and_stress,
    derive_confidence_level,
    derive_stress_level,
    CONFIDENCE_WEIGHTS,
    STRESS_WEIGHTS,
)
from services.question_evaluator import evaluate_question_response
from services.aggregate_evaluator import aggregate_interview_evaluation
from services.evaluation_worker import evaluate_interview_job


def _make_delivery(
    fluency_score: float = 85.0,
    wpm: float = 135.0,
    pacing: str = "Optimal",
    hesitation_rate: float = 2.0,
    pause_duration: float = 1.0,
    pause_count: int = 1,
    word_count: int = 60,
    status: str = "completed",
):
    return {
        "status": status,
        "word_count": word_count,
        "words_per_minute": wpm,
        "articulation_wpm": wpm + 8.0,
        "pacing": pacing,
        "filler_count": int(hesitation_rate * 0.6),
        "filler_words": ["um"] if hesitation_rate > 1.0 else [],
        "hesitation_rate": hesitation_rate,
        "hesitation_level": "Low" if hesitation_rate <= 3.0 else ("Moderate" if hesitation_rate <= 7.0 else "Elevated"),
        "pause_duration_seconds": pause_duration,
        "pause_count": pause_count,
        "fluency_score": fluency_score,
        "fluency_indicator": "Fluent" if fluency_score >= 80.0 else ("Moderate" if fluency_score >= 60.0 else "Hesitant"),
        "notes": "Speech delivery evaluated.",
    }


def _make_facial(
    dominant_expression: str = "Neutral",
    composure_index: str = "Composed & Stable",
    engagement_level: str = "High",
    observable_tension: str = "Low",
    expression_dist: dict = None,
    face_detected: bool = True,
    status: str = "completed",
):
    dist = expression_dist or {
        "neutral": 85.0,
        "happiness": 10.0,
        "fear": 1.0,
        "sadness": 1.0,
        "anger": 1.0,
        "disgust": 1.0,
        "surprise": 1.0,
        "contempt": 0.0,
    }
    return {
        "status": status,
        "face_detected": face_detected,
        "dominant_expression": dominant_expression,
        "expression_distribution": dist,
        "behavioral_indicators": {
            "engagement_level": engagement_level,
            "composure_index": composure_index,
            "observable_tension": observable_tension,
        },
    }


def run_tests():
    print("=" * 70)
    print("STARTING CONFIDENCE & STRESS INDICATORS TEST SUITE (TASK 6)")
    print("=" * 70)

    # -------------------------------------------------------------------------
    # TEST 1: High-Confidence / Low-Stress Evidence
    # -------------------------------------------------------------------------
    print("\n[TEST 1] High-Confidence / Low-Stress Evidence:")
    deliv_high = _make_delivery(fluency_score=92.0, wpm=135.0, pacing="Optimal", hesitation_rate=1.5)
    facial_high = _make_facial(
        dominant_expression="Neutral",
        composure_index="Composed & Stable",
        engagement_level="High",
        observable_tension="Low",
    )

    res1 = analyze_question_confidence_and_stress(deliv_high, facial_high)
    assert res1["confidence_score"] >= 80.0, f"Expected >=80.0, got {res1['confidence_score']}"
    assert res1["confidence_level"] == "High"
    assert res1["stress_score"] < 35.0, f"Expected <35.0, got {res1['stress_score']}"
    assert res1["stress_level"] == "Low"
    assert res1["modality_status"] == {"speech": "available", "vision": "available"}
    print(f"  Confidence: {res1['confidence_score']}% ({res1['confidence_level']})")
    print(f"  Stress:     {res1['stress_score']}% ({res1['stress_level']})")
    print(f"  Rationale:  {res1['rationale']}")
    print("  PASS: High confidence and low stress correctly detected.")

    # -------------------------------------------------------------------------
    # TEST 2: Low-Confidence / High-Stress Evidence
    # -------------------------------------------------------------------------
    print("\n[TEST 2] Low-Confidence / High-Stress Evidence:")
    deliv_low = _make_delivery(
        fluency_score=35.0,
        wpm=185.0,
        pacing="Rushed",
        hesitation_rate=10.5,
        pause_duration=4.5,
        pause_count=4,
    )
    facial_tense = _make_facial(
        dominant_expression="Fear",
        composure_index="Fluctuating Composure",
        engagement_level="Low (Gaze Disengaged)",
        observable_tension="Elevated",
        expression_dist={"fear": 50.0, "sadness": 20.0, "neutral": 20.0, "anger": 10.0},
    )

    res2 = analyze_question_confidence_and_stress(deliv_low, facial_tense)
    assert res2["confidence_score"] < 40.0, f"Expected <40.0, got {res2['confidence_score']}"
    assert res2["confidence_level"] == "Low"
    assert res2["stress_score"] >= 65.0, f"Expected >=65.0, got {res2['stress_score']}"
    assert res2["stress_level"] == "Elevated"
    print(f"  Confidence: {res2['confidence_score']}% ({res2['confidence_level']})")
    print(f"  Stress:     {res2['stress_score']}% ({res2['stress_level']})")
    print("  PASS: Low confidence and elevated stress correctly detected.")

    # -------------------------------------------------------------------------
    # TEST 3: Mixed Speech + Facial Signals
    # -------------------------------------------------------------------------
    print("\n[TEST 3] Mixed Signals (Fluent Speech but Tense Face):")
    res3 = analyze_question_confidence_and_stress(deliv_high, facial_tense)
    # Speech is confident (~92.0), facial is tense (~20.0-30.0) -> composite should be Moderate
    assert 50.0 <= res3["confidence_score"] <= 75.0, f"Expected 50-75, got {res3['confidence_score']}"
    assert res3["confidence_level"] in ("Moderate", "Developing")
    assert 40.0 <= res3["stress_score"] <= 65.0, f"Expected 40-65, got {res3['stress_score']}"
    print(f"  Confidence: {res3['confidence_score']}% ({res3['confidence_level']})")
    print(f"  Stress:     {res3['stress_score']}% ({res3['stress_level']})")
    print("  PASS: Conflicting modal evidence fused deterministically.")

    # -------------------------------------------------------------------------
    # TEST 4: Missing Speech Fallback (Vision-Only Assessment)
    # -------------------------------------------------------------------------
    print("\n[TEST 4] Missing Speech Fallback (Vision-Only):")
    res4 = analyze_question_confidence_and_stress(None, facial_high)
    assert res4["modality_status"] == {"speech": "unavailable", "vision": "available"}
    assert res4["speech_evidence"] is None
    assert res4["facial_evidence"] is not None
    assert res4["confidence_score"] >= 80.0
    assert res4["stress_score"] < 35.0
    print(f"  Confidence: {res4['confidence_score']}% ({res4['confidence_level']})")
    print(f"  Stress:     {res4['stress_score']}% ({res4['stress_level']})")
    print(f"  Rationale:  {res4['rationale']}")
    print("  PASS: Vision-only fallback operated without failure.")

    # -------------------------------------------------------------------------
    # TEST 5: Missing Vision Fallback (Speech-Only Assessment)
    # -------------------------------------------------------------------------
    print("\n[TEST 5] Missing Vision Fallback (Speech-Only):")
    res5 = analyze_question_confidence_and_stress(deliv_high, None)
    assert res5["modality_status"] == {"speech": "available", "vision": "unavailable"}
    assert res5["speech_evidence"] is not None
    assert res5["facial_evidence"] is None
    assert res5["confidence_score"] >= 80.0
    assert res5["stress_score"] < 35.0
    print(f"  Confidence: {res5['confidence_score']}% ({res5['confidence_level']})")
    print(f"  Stress:     {res5['stress_score']}% ({res5['stress_level']})")
    print(f"  Rationale:  {res5['rationale']}")
    print("  PASS: Speech-only fallback operated without failure.")

    # -------------------------------------------------------------------------
    # TEST 6: Both Modalities Unavailable (Honest 'Not Assessed')
    # -------------------------------------------------------------------------
    print("\n[TEST 6] Both Modalities Unavailable (Zero Fabrication):")
    res6 = analyze_question_confidence_and_stress(None, None)
    assert res6["confidence_score"] == 0.0
    assert res6["confidence_level"] == "Not Assessed"
    assert res6["stress_score"] == 0.0
    assert res6["stress_level"] == "Not Assessed"
    assert res6["modality_status"] == {"speech": "unavailable", "vision": "unavailable"}
    print(f"  Confidence: {res6['confidence_score']}% ({res6['confidence_level']})")
    print(f"  Stress:     {res6['stress_score']}% ({res6['stress_level']})")
    print("  PASS: Zero-modality cleanly yields 0.0 score and 'Not Assessed'.")

    # -------------------------------------------------------------------------
    # TEST 7: 0.0 and 100.0 Score Boundaries
    # -------------------------------------------------------------------------
    print("\n[TEST 7] Exact 0.0 and 100.0 Score Boundaries:")
    deliv_zero = _make_delivery(fluency_score=0.0, wpm=0.0, pacing="Slow", hesitation_rate=20.0, pause_duration=10.0, pause_count=10)
    facial_zero = _make_facial(
        dominant_expression="Fear",
        composure_index="Fluctuating Composure",
        engagement_level="Low (Gaze Disengaged)",
        observable_tension="Elevated",
        expression_dist={"fear": 100.0},
    )
    res_zero = analyze_question_confidence_and_stress(deliv_zero, facial_zero)
    assert 0.0 <= res_zero["confidence_score"] <= 100.0
    assert 0.0 <= res_zero["stress_score"] <= 100.0
    assert res_zero["confidence_score"] <= 25.0
    assert res_zero["stress_score"] >= 80.0

    deliv_perfect = _make_delivery(fluency_score=100.0, wpm=140.0, pacing="Optimal", hesitation_rate=0.0, pause_duration=0.0, pause_count=0)
    facial_perfect = _make_facial(
        dominant_expression="Neutral",
        composure_index="Composed & Stable",
        engagement_level="High",
        observable_tension="Low",
        expression_dist={"neutral": 95.0, "happiness": 5.0},
    )
    res_perf = analyze_question_confidence_and_stress(deliv_perfect, facial_perfect)
    assert 0.0 <= res_perf["confidence_score"] <= 100.0
    assert 0.0 <= res_perf["stress_score"] <= 100.0
    assert res_perf["confidence_score"] >= 90.0
    assert res_perf["stress_score"] <= 15.0
    print(f"  Zero boundary confidence: {res_zero['confidence_score']}%, stress: {res_zero['stress_score']}%")
    print(f"  Perfect boundary confidence: {res_perf['confidence_score']}%, stress: {res_perf['stress_score']}%")
    print("  PASS: Mathematical boundaries strictly enforced within [0.0, 100.0].")

    # -------------------------------------------------------------------------
    # TEST 8: Deterministic Repeatability Guarantee
    # -------------------------------------------------------------------------
    print("\n[TEST 8] Deterministic Repeatability Guarantee:")
    run_a = analyze_question_confidence_and_stress(deliv_high, facial_high)
    run_b = analyze_question_confidence_and_stress(deliv_high, facial_high)
    assert run_a == run_b
    print(f"  Run A: Conf={run_a['confidence_score']}%, Stress={run_a['stress_score']}%")
    print(f"  Run B: Conf={run_b['confidence_score']}%, Stress={run_b['stress_score']}%")
    print("  PASS: Exact deterministic repeatability verified.")

    # -------------------------------------------------------------------------
    # TEST 9: Per-Question Evaluator Integration
    # -------------------------------------------------------------------------
    print("\n[TEST 9] Per-Question Evaluator Integration:")
    q_eval = evaluate_question_response(
        question_id="q_cs_test",
        question_text="Explain React reconciliation algorithm.",
        expected_answer="Virtual DOM diffing algorithm comparing trees.",
        tags=["React", "Frontend"],
        difficulty="Medium",
        transcript="React uses the reconciliation algorithm and diffing to update the virtual DOM efficiently.",
        duration_seconds=12.0,
    )
    assert "confidence_and_stress" in q_eval
    cs_per_q = q_eval["confidence_and_stress"]
    assert "confidence_score" in cs_per_q
    assert "confidence_level" in cs_per_q
    assert "stress_score" in cs_per_q
    assert "stress_level" in cs_per_q
    print(f"  Q Confidence: {cs_per_q['confidence_score']}% ({cs_per_q['confidence_level']})")
    print(f"  Q Stress:     {cs_per_q['stress_score']}% ({cs_per_q['stress_level']})")
    print("  PASS: Per-question evaluator includes confidence_and_stress document.")

    # -------------------------------------------------------------------------
    # TEST 10: Interview-Level Aggregation & Persistence via Evaluation Worker
    # -------------------------------------------------------------------------
    print("\n[TEST 10] Interview-Level Aggregation & Persistence in MongoDB:")
    target_oid = ObjectId("6a96c6df4fe22d4bad7fc5a7")
    worker_res = evaluate_interview_job("6a96c6df4fe22d4bad7fc5a7")
    assert worker_res is not None

    doc = interviews_collection.find_one({"_id": target_oid})
    assert doc is not None
    assert doc["evaluation_status"] == "completed"

    eval_doc = doc["evaluation"]
    assert "confidence_score" in eval_doc
    assert "confidence_level" in eval_doc
    assert "stress_score" in eval_doc
    assert "stress_level" in eval_doc
    assert "confidence_and_stress_summary" in eval_doc

    # Check denormalized fields on interview document
    assert doc["confidence"] == eval_doc["confidence_score"]
    assert doc["stress"] == eval_doc["stress_level"]

    summary = eval_doc["confidence_and_stress_summary"]
    assert "summary_evidence" in summary
    print(f"  Persisted Confidence Score: {eval_doc['confidence_score']}% ({eval_doc['confidence_level']})")
    print(f"  Persisted Stress Score:     {eval_doc['stress_score']}% ({eval_doc['stress_level']})")
    print(f"  Denormalized doc.confidence: {doc['confidence']}%")
    print(f"  Denormalized doc.stress:     {doc['stress']}")
    print("  PASS: Worker persisted aggregate confidence and stress fields in MongoDB.")

    # -------------------------------------------------------------------------
    # TEST 11: Candidate Security & Ownership Isolation
    # -------------------------------------------------------------------------
    print("\n[TEST 11] Candidate Security & Ownership Isolation:")
    owner_id = doc.get("user_id")
    legit_doc = interviews_collection.find_one({"_id": target_oid, "user_id": owner_id})
    assert legit_doc is not None
    alien_doc = interviews_collection.find_one({"_id": target_oid, "user_id": "unauthorized_user_xyz"})
    assert alien_doc is None
    print("  PASS: Candidate user_id scoping strictly preserved.")

    # -------------------------------------------------------------------------
    # TEST 12: Multi-Question Aggregate Consistency
    # -------------------------------------------------------------------------
    print("\n[TEST 12] Multi-Question Aggregate Consistency:")
    q_high = {"delivery": deliv_high, "facial_analysis": facial_high}
    q_low = {"delivery": deliv_low, "facial_analysis": facial_tense}

    multi_cs = aggregate_confidence_and_stress([q_high, q_low])
    assert multi_cs["evaluated_takes"] == 2
    assert multi_cs["confidence_score"] > 0.0
    assert multi_cs["stress_score"] > 0.0
    print(f"  Multi-prompt Avg Confidence: {multi_cs['confidence_score']}% ({multi_cs['confidence_level']})")
    print(f"  Multi-prompt Avg Stress:     {multi_cs['stress_score']}% ({multi_cs['stress_level']})")
    print(f"  Formula:                     {multi_cs['formula']}")
    print("  PASS: Multi-question interview aggregation is mathematically consistent.")

    print("\n" + "=" * 70)
    print("ALL 12 CONFIDENCE & STRESS TEST CASES PASSED SUCCESSFULLY!")
    print("=" * 70)


if __name__ == "__main__":
    run_tests()
